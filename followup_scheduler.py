"""
followup_scheduler.py  —  Queue Day-3 and Day-7 follow-up drafts
- Reads all leads still in the sequence (status=contacted)
- Checks how many days have passed since their last sent email
- Day 3 from step-1 send → creates step-2 draft
- Day 4 from step-2 send (= day 7 from step-1) → creates step-3 draft
- After step-3 is sent, marks lead sequence_complete
- Stops immediately if lead has replied, unsubscribed, or converted

Usage:
    python followup_scheduler.py             # queue due follow-ups
    python followup_scheduler.py --preview   # print without saving
"""

import argparse
import sqlite3
from datetime import datetime, timedelta

import database as db
from outreach_generator import generate_followup

# ── Sequence config ───────────────────────────────────────────────────────────

STEP2_DELAY_DAYS = 3   # days after step-1 send
STEP3_DELAY_DAYS = 4   # days after step-2 send (= 7 days from step-1)

# Statuses that mean the sequence should stop
TERMINAL_STATUSES = {"replied", "interested", "converted", "unsubscribed", "sequence_complete", "invalid"}


# ── DB queries ────────────────────────────────────────────────────────────────

def get_last_sent_outreach(lead_id: int) -> dict | None:
    """Return the most recently sent outreach record for this lead."""
    with db.get_conn() as conn:
        cur = conn.execute(
            """
            SELECT * FROM outreach
            WHERE lead_id = ? AND status = 'sent'
            ORDER BY sent_at DESC
            LIMIT 1
            """,
            (lead_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def already_has_pending_step(lead_id: int, step: int) -> bool:
    """Return True if a draft or sent outreach already exists for this step."""
    with db.get_conn() as conn:
        cur = conn.execute(
            "SELECT id FROM outreach WHERE lead_id=? AND sequence_step=? AND status IN ('draft','sent')",
            (lead_id, step),
        )
        return cur.fetchone() is not None


def days_since(sent_at_str: str) -> float:
    """Return fractional days elapsed since sent_at ISO string."""
    try:
        sent_at = datetime.fromisoformat(sent_at_str)
    except (ValueError, TypeError):
        return 0.0
    return (datetime.utcnow() - sent_at).total_seconds() / 86400


def mark_sequence_complete_if_done(lead_id: int):
    """Mark lead sequence_complete if step-3 has been sent."""
    with db.get_conn() as conn:
        cur = conn.execute(
            "SELECT id FROM outreach WHERE lead_id=? AND sequence_step=3 AND status='sent'",
            (lead_id,),
        )
        if cur.fetchone():
            db.update_status(lead_id, "sequence_complete")


# ── Core scheduler ────────────────────────────────────────────────────────────

def run(preview: bool = False) -> dict:
    stats = {"step2_queued": 0, "step3_queued": 0, "complete": 0, "skipped": 0}

    # Get contacted leads + any that were marked draft_ready again by a prior follow-up
    contacted_leads = db.get_leads_by_status("contacted")

    if not contacted_leads:
        print("[i] No contacted leads in sequence.")
        return stats

    print(f"[>] Checking {len(contacted_leads)} contacted lead(s) for due follow-ups…\n")

    for lead in contacted_leads:
        lead_id = lead["id"]
        name    = lead["business_name"]

        # Skip if sequence already ended
        if lead["outreach_status"] in TERMINAL_STATUSES:
            stats["skipped"] += 1
            continue

        # Check if step-3 was already sent → mark complete
        mark_sequence_complete_if_done(lead_id)
        lead = db.get_lead(lead_id)  # refresh
        if lead["outreach_status"] == "sequence_complete":
            stats["complete"] += 1
            continue

        last_sent = get_last_sent_outreach(lead_id)
        if not last_sent:
            stats["skipped"] += 1
            continue

        last_step     = last_sent["sequence_step"]
        days_elapsed  = days_since(last_sent["sent_at"])

        # ── Step 2: Day-3 follow-up ───────────────────────────────────────────
        if last_step == 1 and days_elapsed >= STEP2_DELAY_DAYS:
            if already_has_pending_step(lead_id, 2):
                print(f"  [~] {name[:40]} — step-2 already queued/sent")
                stats["skipped"] += 1
                continue

            subject, body = generate_followup(lead, step=2)
            print(f"  [+] {name[:40]} — queuing step-2 (day-3) follow-up"
                  f" ({days_elapsed:.1f}d since step-1)")

            if not preview:
                db.insert_outreach(lead_id, step=2, subject=subject, body=body)
                db.update_status(lead_id, "draft_ready")

            stats["step2_queued"] += 1

        # ── Step 3: Day-7 follow-up ───────────────────────────────────────────
        elif last_step == 2 and days_elapsed >= STEP3_DELAY_DAYS:
            if already_has_pending_step(lead_id, 3):
                print(f"  [~] {name[:40]} — step-3 already queued/sent")
                stats["skipped"] += 1
                continue

            subject, body = generate_followup(lead, step=3)
            print(f"  [+] {name[:40]} — queuing step-3 (day-7) follow-up"
                  f" ({days_elapsed:.1f}d since step-2)")

            if not preview:
                db.insert_outreach(lead_id, step=3, subject=subject, body=body)
                db.update_status(lead_id, "draft_ready")

            stats["step3_queued"] += 1

        else:
            remaining = (
                STEP2_DELAY_DAYS - days_elapsed if last_step == 1
                else STEP3_DELAY_DAYS - days_elapsed
            )
            print(f"  [·] {name[:40]} — step-{last_step + 1} due in {remaining:.1f}d")
            stats["skipped"] += 1

    return stats


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Queue follow-up email drafts")
    parser.add_argument("--preview", action="store_true",
                        help="Print due follow-ups without saving drafts")
    args = parser.parse_args()

    print("=== Follow-up Scheduler ===\n")
    stats = run(preview=args.preview)

    print(f"\n{'='*45}")
    print(f"  Step-2 drafts queued : {stats['step2_queued']}")
    print(f"  Step-3 drafts queued : {stats['step3_queued']}")
    print(f"  Sequences completed  : {stats['complete']}")
    print(f"  Not yet due / skipped: {stats['skipped']}")

    if args.preview:
        print("\n  [DRY RUN] Nothing was saved.")


if __name__ == "__main__":
    main()
