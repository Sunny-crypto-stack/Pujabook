"""
database.py — Central SQLite layer for the lead pipeline.
All modules import from here; nothing else touches the DB directly.
"""

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "leads.db"

# ── Schema ────────────────────────────────────────────────────────────────────

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS leads (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name       TEXT    NOT NULL,
    website             TEXT    DEFAULT '',
    phone               TEXT    DEFAULT '',
    address             TEXT    DEFAULT '',
    city                TEXT    DEFAULT '',
    industry            TEXT    DEFAULT '',
    domain              TEXT    DEFAULT '',
    email_candidates    TEXT    DEFAULT '[]',   -- JSON list, ordered by confidence
    verified_email      TEXT    DEFAULT '',
    linkedin_search_url TEXT    DEFAULT '',
    outreach_status     TEXT    DEFAULT 'scraped',
    notes               TEXT    DEFAULT '',
    created_at          TEXT    DEFAULT (datetime('now')),
    updated_at          TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outreach (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id         INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sequence_step   INTEGER DEFAULT 1,         -- 1=initial, 2=day-3, 3=day-7
    subject         TEXT    DEFAULT '',
    body            TEXT    DEFAULT '',
    status          TEXT    DEFAULT 'draft',   -- draft | sent | failed
    message_id      TEXT    DEFAULT '',        -- SMTP Message-ID for reply matching
    sent_at         TEXT    DEFAULT NULL,
    created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outreach_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    outreach_id INTEGER REFERENCES outreach(id) ON DELETE SET NULL,
    event       TEXT    NOT NULL,              -- sent | replied | auto_reply | bounced | failed
    event_at    TEXT    DEFAULT (datetime('now')),
    metadata    TEXT    DEFAULT '{}'           -- JSON: error, subject, etc.
);

CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(outreach_status);
CREATE INDEX IF NOT EXISTS idx_leads_domain   ON leads(domain);
CREATE INDEX IF NOT EXISTS idx_outreach_lead  ON outreach(lead_id);
CREATE INDEX IF NOT EXISTS idx_log_lead       ON outreach_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_log_event      ON outreach_log(event);

-- ── Buyer-side tables ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name       TEXT    NOT NULL,
    contact_name        TEXT    DEFAULT '',
    email               TEXT    NOT NULL,
    phone               TEXT    DEFAULT '',
    service_category    TEXT    NOT NULL,
    service_keywords    TEXT    DEFAULT '[]',
    coverage_areas      TEXT    DEFAULT '["Hyderabad"]',
    lead_price_inr      REAL    DEFAULT 500.0,
    monthly_budget_inr  REAL    DEFAULT 0.0,
    delivery_method     TEXT    DEFAULT 'email',
    whatsapp_number     TEXT    DEFAULT '',
    status              TEXT    DEFAULT 'active',
    notes               TEXT    DEFAULT '',
    created_at          TEXT    DEFAULT (datetime('now')),
    updated_at          TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS buyer_leads (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_name          TEXT    DEFAULT 'Anonymous',
    phone               TEXT    DEFAULT '',
    email               TEXT    DEFAULT '',
    service_needed      TEXT    NOT NULL,
    service_category    TEXT    NOT NULL,
    location_mentioned  TEXT    DEFAULT '',
    city                TEXT    DEFAULT 'Hyderabad',
    source              TEXT    NOT NULL,
    source_url          TEXT    DEFAULT '',
    raw_text            TEXT    DEFAULT '',
    intent_score        INTEGER DEFAULT 50,
    delivery_status     TEXT    DEFAULT 'new',
    scraped_at          TEXT    DEFAULT (datetime('now')),
    created_at          TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lead_deliveries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_lead_id   INTEGER NOT NULL REFERENCES buyer_leads(id) ON DELETE CASCADE,
    client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    delivery_method TEXT    DEFAULT 'email',
    delivery_status TEXT    DEFAULT 'pending',
    price_charged   REAL    DEFAULT 0.0,
    sent_at         TEXT    DEFAULT NULL,
    message_id      TEXT    DEFAULT '',
    notes           TEXT    DEFAULT '',
    created_at      TEXT    DEFAULT (datetime('now')),
    UNIQUE(buyer_lead_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_clients_category    ON clients(service_category);
CREATE INDEX IF NOT EXISTS idx_clients_status      ON clients(status);
CREATE INDEX IF NOT EXISTS idx_buyer_category      ON buyer_leads(service_category);
CREATE INDEX IF NOT EXISTS idx_buyer_status        ON buyer_leads(delivery_status);
CREATE INDEX IF NOT EXISTS idx_buyer_source        ON buyer_leads(source);
CREATE INDEX IF NOT EXISTS idx_deliveries_buyer    ON lead_deliveries(buyer_lead_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_client   ON lead_deliveries(client_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status   ON lead_deliveries(delivery_status);
"""

# ── Connection ────────────────────────────────────────────────────────────────

@contextmanager
def get_conn():
    """Yield a WAL-mode SQLite connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create tables if they don't exist. Safe to call on every startup."""
    with get_conn() as conn:
        conn.executescript(SCHEMA)


# ── Lead helpers ──────────────────────────────────────────────────────────────

def upsert_lead(data: dict) -> int:
    """
    Insert a new lead or skip if (business_name, phone) already exists.
    Returns the lead id (existing or newly created).
    """
    with get_conn() as conn:
        # Check duplicate
        cur = conn.execute(
            "SELECT id FROM leads WHERE lower(business_name)=lower(?) AND lower(phone)=lower(?)",
            (data.get("business_name", ""), data.get("phone", "")),
        )
        row = cur.fetchone()
        if row:
            return row["id"]

        candidates = data.get("email_candidates", [])
        cur = conn.execute(
            """
            INSERT INTO leads
                (business_name, website, phone, address, city, industry,
                 domain, email_candidates, verified_email, linkedin_search_url,
                 outreach_status, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                data.get("business_name", ""),
                data.get("website", ""),
                data.get("phone", ""),
                data.get("address", ""),
                data.get("city", ""),
                data.get("industry", ""),
                data.get("domain", ""),
                json.dumps(candidates) if isinstance(candidates, list) else candidates,
                data.get("verified_email", ""),
                data.get("linkedin_search_url", ""),
                data.get("outreach_status", "scraped"),
                data.get("notes", ""),
            ),
        )
        return cur.lastrowid


def update_lead(lead_id: int, **fields):
    """Update arbitrary fields on a lead row. Automatically sets updated_at."""
    fields["updated_at"] = datetime.utcnow().isoformat()
    set_clause = ", ".join(f"{k}=?" for k in fields)
    values = list(fields.values()) + [lead_id]
    with get_conn() as conn:
        conn.execute(f"UPDATE leads SET {set_clause} WHERE id=?", values)


def update_status(lead_id: int, status: str):
    update_lead(lead_id, outreach_status=status)


def get_leads_by_status(status: str) -> list[dict]:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM leads WHERE outreach_status=?", (status,))
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def get_all_leads() -> list[dict]:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM leads ORDER BY created_at DESC")
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def get_lead(lead_id: int) -> dict | None:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM leads WHERE id=?", (lead_id,))
        row = cur.fetchone()
    return dict(row) if row else None


# ── Outreach helpers ──────────────────────────────────────────────────────────

def insert_outreach(lead_id: int, step: int, subject: str, body: str) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO outreach (lead_id, sequence_step, subject, body) VALUES (?,?,?,?)",
            (lead_id, step, subject, body),
        )
        return cur.lastrowid


def mark_outreach_sent(outreach_id: int, message_id: str = ""):
    with get_conn() as conn:
        conn.execute(
            "UPDATE outreach SET status='sent', sent_at=datetime('now'), message_id=? WHERE id=?",
            (message_id, outreach_id),
        )


def mark_outreach_failed(outreach_id: int, error: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE outreach SET status='failed' WHERE id=?",
            (outreach_id,),
        )
    log_event(outreach_id=outreach_id, lead_id=None, event="failed",
              metadata={"error": error})


def get_drafts() -> list[dict]:
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT o.*, l.business_name, l.verified_email, l.city, l.industry
            FROM outreach o
            JOIN leads l ON l.id = o.lead_id
            WHERE o.status = 'draft'
            ORDER BY o.created_at
            """
        )
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def get_sent_today() -> list[dict]:
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT o.*, l.business_name, l.verified_email
            FROM outreach o
            JOIN leads l ON l.id = o.lead_id
            WHERE date(o.sent_at) = date('now')
            ORDER BY o.sent_at DESC
            """
        )
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def get_outreach_by_message_id(message_id: str) -> dict | None:
    """Look up a sent outreach record by its SMTP Message-ID."""
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT o.*, l.business_name, l.outreach_status
            FROM outreach o
            JOIN leads l ON l.id = o.lead_id
            WHERE o.message_id = ?
            """,
            (message_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def get_all_sent_message_ids() -> dict[str, dict]:
    """Return {message_id: {lead_id, outreach_id, subject}} for all sent outreach."""
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT o.id as outreach_id, o.lead_id, o.message_id, o.subject, o.sequence_step
            FROM outreach o
            WHERE o.status = 'sent' AND o.message_id != ''
            """
        )
        rows = cur.fetchall()
    return {r["message_id"]: dict(r) for r in rows}


def get_sent_subjects() -> dict[str, dict]:
    """Return {normalized_subject: {lead_id, outreach_id}} for reply matching fallback."""
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT id as outreach_id, lead_id, subject FROM outreach WHERE status='sent'"
        )
        rows = cur.fetchall()
    return {r["subject"].lower().strip(): dict(r) for r in rows}


def get_all_sent_emails() -> list[str]:
    """Return list of all email addresses we have ever sent to (dedup guard)."""
    with get_conn() as conn:
        cur = conn.execute(
            """SELECT DISTINCT l.verified_email
               FROM outreach o JOIN leads l ON o.lead_id = l.id
               WHERE o.status = 'sent' AND l.verified_email != ''"""
        )
        return [r["verified_email"].lower().strip() for r in cur.fetchall()]


def count_sent_today() -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT COUNT(*) FROM outreach WHERE status='sent' AND date(sent_at)=date('now')"
        )
        return cur.fetchone()[0]


# ── Log helpers ───────────────────────────────────────────────────────────────

def log_event(lead_id: int | None, outreach_id: int | None,
              event: str, metadata: dict | None = None):
    if metadata is None:
        metadata = {}
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO outreach_log (lead_id, outreach_id, event, metadata) VALUES (?,?,?,?)",
            (lead_id, outreach_id, event, json.dumps(metadata)),
        )


# ── Stats ─────────────────────────────────────────────────────────────────────

def pipeline_counts() -> dict:
    statuses = [
        "scraped", "enriched", "verified", "draft_ready",
        "contacted", "replied", "interested", "converted",
        "sequence_complete", "invalid",
    ]
    with get_conn() as conn:
        counts = {}
        for s in statuses:
            cur = conn.execute("SELECT COUNT(*) FROM leads WHERE outreach_status=?", (s,))
            counts[s] = cur.fetchone()[0]
        cur = conn.execute("SELECT COUNT(*) FROM leads")
        counts["total"] = cur.fetchone()[0]
    return counts


# ── CSV migration (one-time) ───────────────────────────────────────────────────

def migrate_from_csv(csv_path: str):
    """Import existing leads.csv into the DB. Safe to run multiple times."""
    import csv as _csv
    from pathlib import Path as _Path

    p = _Path(csv_path)
    if not p.exists():
        print(f"[i] {csv_path} not found — skipping migration.")
        return

    imported = 0
    with open(p, newline="", encoding="utf-8") as f:
        for row in _csv.DictReader(f):
            upsert_lead({
                "business_name":  row.get("business_name", ""),
                "website":        row.get("website", ""),
                "phone":          row.get("phone", ""),
                "address":        row.get("address", ""),
                "city":           row.get("city", ""),
                "industry":       row.get("industry", "General"),
                "outreach_status": row.get("outreach_status", "scraped"),
                "notes":          row.get("notes", ""),
            })
            imported += 1

    print(f"[+] Migrated {imported} lead(s) from {csv_path}")


# ── Buyer-side helpers ────────────────────────────────────────────────────────

def upsert_buyer_lead(lead: dict) -> int | None:
    """Insert buyer lead; skip exact duplicate (same source_url + service_needed)."""
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM buyer_leads WHERE source_url=? AND service_needed=?",
            (lead.get("source_url", ""), lead.get("service_needed", "")),
        ).fetchone()
        if existing:
            return None
        cur = conn.execute(
            """INSERT INTO buyer_leads
               (buyer_name, phone, email, service_needed, service_category,
                location_mentioned, city, source, source_url, raw_text, intent_score)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                lead.get("buyer_name", "Anonymous"),
                lead.get("phone", ""),
                lead.get("email", ""),
                lead.get("service_needed", ""),
                lead.get("service_category", "general"),
                lead.get("location_mentioned", ""),
                lead.get("city", "Hyderabad"),
                lead.get("source", ""),
                lead.get("source_url", ""),
                lead.get("raw_text", ""),
                lead.get("intent_score", 50),
            ),
        )
        return cur.lastrowid


def get_buyer_leads(status: str = "new", limit: int = 0) -> list[dict]:
    with get_conn() as conn:
        q = "SELECT * FROM buyer_leads WHERE delivery_status=? ORDER BY intent_score DESC, created_at DESC"
        rows = conn.execute(q, (status,)).fetchall()
    result = [dict(r) for r in rows]
    return result[:limit] if limit else result


def get_all_buyer_leads() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM buyer_leads ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def update_buyer_lead_status(lead_id: int, status: str) -> None:
    with get_conn() as conn:
        conn.execute("UPDATE buyer_leads SET delivery_status=? WHERE id=?", (status, lead_id))


# ── Client helpers ────────────────────────────────────────────────────────────

def upsert_client(client: dict) -> int:
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM clients WHERE email=?", (client["email"],)
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE clients SET business_name=?, contact_name=?, phone=?,
                   service_category=?, service_keywords=?, coverage_areas=?,
                   lead_price_inr=?, delivery_method=?, whatsapp_number=?,
                   status=?, notes=?, updated_at=datetime('now') WHERE id=?""",
                (
                    client.get("business_name", ""),
                    client.get("contact_name", ""),
                    client.get("phone", ""),
                    client.get("service_category", "general"),
                    json.dumps(client.get("service_keywords", [])),
                    json.dumps(client.get("coverage_areas", ["Hyderabad"])),
                    client.get("lead_price_inr", 500.0),
                    client.get("delivery_method", "email"),
                    client.get("whatsapp_number", ""),
                    client.get("status", "active"),
                    client.get("notes", ""),
                    existing["id"],
                ),
            )
            return existing["id"]
        cur = conn.execute(
            """INSERT INTO clients
               (business_name, contact_name, email, phone, service_category,
                service_keywords, coverage_areas, lead_price_inr, delivery_method,
                whatsapp_number, status, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                client.get("business_name", ""),
                client.get("contact_name", ""),
                client["email"],
                client.get("phone", ""),
                client.get("service_category", "general"),
                json.dumps(client.get("service_keywords", [])),
                json.dumps(client.get("coverage_areas", ["Hyderabad"])),
                client.get("lead_price_inr", 500.0),
                client.get("delivery_method", "email"),
                client.get("whatsapp_number", ""),
                client.get("status", "active"),
                client.get("notes", ""),
            ),
        )
        return cur.lastrowid


def get_active_clients() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM clients WHERE status='active' ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_all_clients() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM clients ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


# ── Delivery helpers ──────────────────────────────────────────────────────────

def insert_delivery(buyer_lead_id: int, client_id: int, price: float, method: str = "email") -> int | None:
    with get_conn() as conn:
        try:
            cur = conn.execute(
                """INSERT INTO lead_deliveries
                   (buyer_lead_id, client_id, price_charged, delivery_method)
                   VALUES (?,?,?,?)""",
                (buyer_lead_id, client_id, price, method),
            )
            return cur.lastrowid
        except sqlite3.IntegrityError:
            return None  # already delivered to this client


def mark_delivery_sent(delivery_id: int, message_id: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE lead_deliveries SET delivery_status='sent', sent_at=datetime('now'), message_id=? WHERE id=?",
            (message_id, delivery_id),
        )


def get_pending_deliveries() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT ld.*, bl.buyer_name, bl.phone, bl.email as buyer_email,
                      bl.service_needed, bl.service_category, bl.location_mentioned,
                      bl.source, bl.source_url, bl.raw_text, bl.intent_score,
                      c.business_name as client_name, c.email as client_email,
                      c.contact_name, c.lead_price_inr, c.whatsapp_number,
                      c.delivery_method as client_delivery_method
               FROM lead_deliveries ld
               JOIN buyer_leads bl ON bl.id = ld.buyer_lead_id
               JOIN clients c ON c.id = ld.client_id
               WHERE ld.delivery_status = 'pending'
               ORDER BY ld.created_at ASC"""
        ).fetchall()
    return [dict(r) for r in rows]


def buyer_counts() -> dict:
    with get_conn() as conn:
        total_bl    = conn.execute("SELECT COUNT(*) FROM buyer_leads").fetchone()[0]
        new_bl      = conn.execute("SELECT COUNT(*) FROM buyer_leads WHERE delivery_status='new'").fetchone()[0]
        delivered   = conn.execute("SELECT COUNT(*) FROM buyer_leads WHERE delivery_status='delivered'").fetchone()[0]
        clients     = conn.execute("SELECT COUNT(*) FROM clients WHERE status='active'").fetchone()[0]
        revenue     = conn.execute("SELECT COALESCE(SUM(price_charged),0) FROM lead_deliveries WHERE delivery_status='sent'").fetchone()[0]
    return {
        "total_buyer_leads": total_bl,
        "new": new_bl,
        "delivered": delivered,
        "active_clients": clients,
        "total_revenue_inr": revenue,
    }


# ── Init on import ────────────────────────────────────────────────────────────

init_db()
