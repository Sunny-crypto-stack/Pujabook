"""
reply_tracker.py  —  Poll Gmail IMAP for replies to outreach emails
- Matches replies by In-Reply-To / References header (primary)
- Falls back to subject-line matching (strips Re:/Fwd:)
- Detects and separately flags auto-replies / OOO messages
- Updates lead status and logs all events
- Stores last-checked timestamp so it only processes new mail each run

Usage:
    python reply_tracker.py
    python reply_tracker.py --since "2026-03-01"   # check from a specific date
    python reply_tracker.py --verbose               # show full header details
"""

import argparse
import email
import imaplib
import json
import os
import re
from datetime import datetime, timedelta
from email.header import decode_header
from pathlib import Path

from dotenv import load_dotenv

import database as db

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PW  = os.getenv("GMAIL_APP_PASSWORD", "")
IMAP_HOST     = "imap.gmail.com"
IMAP_PORT     = 993

LAST_CHECK_FILE = Path(__file__).parent / ".reply_tracker_last_check"

# Patterns that indicate an auto-reply / out-of-office
AUTO_REPLY_PATTERNS = re.compile(
    r"\b(out of office|ooo|auto.?reply|auto.?response|vacation|away from|"
    r"automatic reply|on leave|be back|currently unavailable|do not reply)\b",
    re.IGNORECASE,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def decode_str(value: str | bytes | None) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    parts = decode_header(value)
    result = []
    for part, charset in parts:
        if isinstance(part, bytes):
            result.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            result.append(part)
    return "".join(result)


def normalise_subject(subject: str) -> str:
    """Strip Re:/Fwd: prefixes and whitespace for fallback matching."""
    s = re.sub(r"^(re|fwd|fw)\s*:\s*", "", subject.strip(), flags=re.IGNORECASE)
    return s.lower().strip()


def extract_message_ids_from_header(header_val: str) -> list[str]:
    """Extract all <message-id> values from In-Reply-To or References header."""
    return re.findall(r"<[^>]+>", header_val)


def get_last_check_date() -> str:
    """Return IMAP date string for the last successful check, or 30 days ago."""
    if LAST_CHECK_FILE.exists():
        try:
            ts = LAST_CHECK_FILE.read_text().strip()
            dt = datetime.fromisoformat(ts)
            return dt.strftime("%d-%b-%Y")
        except Exception:
            pass
    fallback = datetime.now() - timedelta(days=30)
    return fallback.strftime("%d-%b-%Y")


def save_last_check():
    LAST_CHECK_FILE.write_text(datetime.now().isoformat())


def is_auto_reply(subject: str, headers: dict) -> bool:
    """Detect auto-replies via subject text or standard headers."""
    if AUTO_REPLY_PATTERNS.search(subject):
        return True
    # RFC 3834 auto-submitted header
    auto_submitted = headers.get("Auto-Submitted", "no").lower()
    if auto_submitted != "no":
        return True
    # Precedence: bulk/list often signals automated mail
    precedence = headers.get("Precedence", "").lower()
    if precedence in ("bulk", "list", "junk"):
        return True
    return False


# ── IMAP connection ───────────────────────────────────────────────────────────

def get_imap() -> imaplib.IMAP4_SSL:
    mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    mail.login(GMAIL_ADDRESS, GMAIL_APP_PW)
    return mail


# ── Core tracker ─────────────────────────────────────────────────────────────

def fetch_new_emails(mail: imaplib.IMAP4_SSL, since_date: str) -> list[dict]:
    """Fetch emails from INBOX since since_date. Returns list of header dicts."""
    mail.select("INBOX")
    # Search for emails TO our address since the date
    _, data = mail.search(None, f'(SINCE "{since_date}")')
    msg_ids = data[0].split()

    emails = []
    for msg_id in msg_ids:
        _, msg_data = mail.fetch(msg_id, "(RFC822)")
        if not msg_data or not msg_data[0]:
            continue
        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)

        subject    = decode_str(msg.get("Subject", ""))
        from_addr  = decode_str(msg.get("From", ""))
        in_reply_to = msg.get("In-Reply-To", "")
        references  = msg.get("References", "")
        auto_sub    = msg.get("Auto-Submitted", "no")
        precedence  = msg.get("Precedence", "")

        emails.append({
            "subject":      subject,
            "from":         from_addr,
            "in_reply_to":  in_reply_to,
            "references":   references,
            "auto_submitted": auto_sub,
            "precedence":   precedence,
        })

    return emails


def match_reply(incoming: dict, sent_ids: dict, sent_subjects: dict,
                verbose: bool = False) -> dict | None:
    """
    Try to match an incoming email to one of our sent outreach records.
    Returns the outreach record dict if matched, else None.
    """
    # ── Primary: In-Reply-To / References header matching ────────────────────
    for header in ("in_reply_to", "references"):
        ref_ids = extract_message_ids_from_header(incoming.get(header, ""))
        for ref_id in ref_ids:
            if ref_id in sent_ids:
                if verbose:
                    print(f"       → matched by {header}: {ref_id}")
                return sent_ids[ref_id]

    # ── Fallback: normalised subject matching ─────────────────────────────────
    norm_subj = normalise_subject(incoming["subject"])
    if norm_subj and norm_subj in sent_subjects:
        if verbose:
            print(f"       → matched by subject: {norm_subj}")
        return sent_subjects[norm_subj]

    return None


def process_emails(incoming_emails: list[dict], verbose: bool = False) -> dict:
    stats = {"replied": 0, "auto_reply": 0, "unmatched": 0}

    sent_ids      = db.get_all_sent_message_ids()
    sent_subjects = db.get_sent_subjects()

    for inc in incoming_emails:
        subject   = inc["subject"]
        from_addr = inc["from"]

        if verbose:
            print(f"\n  INCOMING: {subject[:60]} | from: {from_addr[:40]}")

        matched = match_reply(inc, sent_ids, sent_subjects, verbose=verbose)

        if not matched:
            stats["unmatched"] += 1
            if verbose:
                print("       → no match found")
            continue

        lead_id     = matched["lead_id"]
        outreach_id = matched["outreach_id"]

        headers = {
            "Auto-Submitted": inc.get("auto_submitted", "no"),
            "Precedence":     inc.get("precedence", ""),
        }

        if is_auto_reply(subject, headers):
            event  = "auto_reply"
            status = "contacted"  # keep as contacted, don't treat as real reply
            stats["auto_reply"] += 1
            print(f"  [AUTO] {from_addr[:40]} | {subject[:50]}")
        else:
            event  = "replied"
            status = "replied"
            stats["replied"] += 1
            print(f"  [REPLY] {from_addr[:40]} | {subject[:50]}")

        # Only update if not already in a later stage
        lead = db.get_lead(lead_id)
        current_status = lead["outreach_status"] if lead else ""
        later_stages = {"interested", "converted", "replied"}
        if current_status not in later_stages:
            db.update_status(lead_id, status)

        db.log_event(
            lead_id=lead_id,
            outreach_id=outreach_id,
            event=event,
            metadata={
                "from":    from_addr,
                "subject": subject,
            },
        )

    return stats


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Track replies to outreach emails")
    parser.add_argument("--since", default="",
                        help="Check emails since this date (YYYY-MM-DD). Default: last check.")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Print detailed matching info")
    args = parser.parse_args()

    if not GMAIL_ADDRESS or not GMAIL_APP_PW:
        print("[!] GMAIL_ADDRESS / GMAIL_APP_PASSWORD not set. Copy .env.example → .env")
        raise SystemExit(1)

    since = args.since
    if since:
        try:
            since = datetime.strptime(since, "%Y-%m-%d").strftime("%d-%b-%Y")
        except ValueError:
            print("[!] --since date must be YYYY-MM-DD")
            raise SystemExit(1)
    else:
        since = get_last_check_date()

    print(f"=== Reply Tracker ===\n")
    print(f"  Checking Gmail inbox since: {since}")

    try:
        print("[>] Connecting to Gmail IMAP…")
        mail = get_imap()
        print("[✓] Connected.\n")
    except imaplib.IMAP4.error as e:
        print(f"[!] IMAP login failed: {e}")
        print("    Check GMAIL_ADDRESS and GMAIL_APP_PASSWORD in .env")
        raise SystemExit(1)

    incoming = fetch_new_emails(mail, since)
    mail.logout()

    print(f"[i] {len(incoming)} email(s) found in inbox since {since}\n")

    if not incoming:
        save_last_check()
        return

    stats = process_emails(incoming, verbose=args.verbose)
    save_last_check()

    print(f"\n{'='*45}")
    print(f"✓ Replies matched : {stats['replied']}")
    print(f"  Auto-replies    : {stats['auto_reply']}")
    print(f"  Unmatched       : {stats['unmatched']}")

    counts = db.pipeline_counts()
    print(f"\n  Pipeline — replied: {counts['replied']} | interested: {counts['interested']}")


if __name__ == "__main__":
    main()
