"""
email_sender.py  —  Send outreach drafts via Gmail SMTP
- Respects daily send cap (default 80/day)
- Only sends within configured time window (default 9am–6pm)
- Random delay between sends to mimic human behaviour
- Stores Message-ID for reply tracking
- All sends logged to outreach_log table

Setup:
    cp .env.example .env
    # fill in your Gmail address and App Password
    python email_sender.py --dry-run   # preview without sending
    python email_sender.py             # send for real
"""

import argparse
import os
import random
import smtplib
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

import database as db

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

GMAIL_ADDRESS    = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PW     = os.getenv("GMAIL_APP_PASSWORD", "")
SENDER_NAME      = os.getenv("SENDER_NAME", "Sanmay Pachika")
DAILY_LIMIT      = int(os.getenv("DAILY_SEND_LIMIT", "80"))
DELAY_MIN        = float(os.getenv("SEND_DELAY_MIN", "3"))
DELAY_MAX        = float(os.getenv("SEND_DELAY_MAX", "8"))

# Send window is evaluated in IST regardless of where this script runs
IST = ZoneInfo("Asia/Kolkata")
# Peak Indian business hours: 10am–1pm and 2pm–6pm IST (skip lunch)
SEND_WINDOWS_IST = [(10, 13), (14, 18)]

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


# ── Validation ────────────────────────────────────────────────────────────────

def validate_config():
    errors = []
    if not GMAIL_ADDRESS:
        errors.append("GMAIL_ADDRESS not set in .env")
    if not GMAIL_APP_PW:
        errors.append("GMAIL_APP_PASSWORD not set in .env")
    if errors:
        for e in errors:
            print(f"[!] {e}")
        print("\nCopy .env.example → .env and fill in your credentials.")
        raise SystemExit(1)


# ── Time window check ─────────────────────────────────────────────────────────

def within_send_window() -> bool:
    """True if current IST time falls in a peak send window."""
    hour = datetime.now(IST).hour
    return any(start <= hour < end for start, end in SEND_WINDOWS_IST)


def time_until_window() -> str:
    hour = datetime.now(IST).hour
    for start, end in SEND_WINDOWS_IST:
        if hour < start:
            return f"Next window opens at {start}:00 IST (now {hour}:00 IST)"
    return f"All windows done for today. Reopens at {SEND_WINDOWS_IST[0][0]}:00 IST tomorrow"
    return ""


# ── SMTP connection ───────────────────────────────────────────────────────────

def get_smtp() -> smtplib.SMTP:
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(GMAIL_ADDRESS, GMAIL_APP_PW)
    return server


# ── Build email ───────────────────────────────────────────────────────────────

def build_message(draft: dict) -> tuple[MIMEMultipart, str]:
    """
    Construct a MIME email from a draft record.
    Returns (msg, message_id_str).
    """
    to_email = draft["verified_email"]
    subject  = draft["subject"]
    body     = draft["body"]

    msg = MIMEMultipart("alternative")
    msg["From"]    = formataddr((SENDER_NAME, GMAIL_ADDRESS))
    msg["To"]      = to_email
    msg["Subject"] = subject

    # Generate a unique Message-ID we can later match replies against
    domain = GMAIL_ADDRESS.split("@")[-1] if "@" in GMAIL_ADDRESS else "gmail.com"
    msg_id = make_msgid(domain=domain)
    msg["Message-ID"] = msg_id

    # Plain text part
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # Simple HTML version (wraps plain text in <pre> for email clients)
    html_body = f"<html><body><pre style='font-family:sans-serif;white-space:pre-wrap'>{body}</pre></body></html>"
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    return msg, msg_id


# ── Send one email ────────────────────────────────────────────────────────────

def send_one(server: smtplib.SMTP, draft: dict, dry_run: bool = False) -> str:
    """
    Send a single draft. Returns the Message-ID on success, raises on failure.
    Reconnects SMTP if the connection dropped.
    """
    msg, msg_id = build_message(draft)

    if dry_run:
        print(f"     [DRY RUN] Would send to: {draft['verified_email']}")
        print(f"               Subject: {draft['subject']}")
        return msg_id

    try:
        server.sendmail(GMAIL_ADDRESS, [draft["verified_email"]], msg.as_string())
    except smtplib.SMTPServerDisconnected:
        # Reconnect once and retry
        server = get_smtp()
        server.sendmail(GMAIL_ADDRESS, [draft["verified_email"]], msg.as_string())

    return msg_id


# ── Main sender loop ──────────────────────────────────────────────────────────

def run(dry_run: bool = False, limit: int = 0):
    validate_config()

    if not dry_run and not within_send_window():
        msg = time_until_window()
        print(f"[i] Outside send window. {msg}")
        print("    Use --dry-run to preview, or --force to ignore window.")
        return

    already_sent = db.count_sent_today()
    remaining_quota = DAILY_LIMIT - already_sent

    if remaining_quota <= 0:
        print(f"[i] Daily send limit reached ({DAILY_LIMIT}). Try again tomorrow.")
        return

    drafts = db.get_drafts()
    if not drafts:
        print("[i] No drafts to send. Run outreach_generator.py first.")
        return

    # Deduplicate: never send to the same email address more than once ever
    already_emailed: set[str] = set(db.get_all_sent_emails())
    unique_drafts = []
    seen_this_batch: set[str] = set()
    for d in drafts:
        addr = (d.get("verified_email") or "").lower().strip()
        if addr and addr not in already_emailed and addr not in seen_this_batch:
            unique_drafts.append(d)
            seen_this_batch.add(addr)
        elif addr:
            print(f"[~] Skip duplicate: {d.get('business_name')} → {addr}")
    drafts = unique_drafts

    # Apply per-run limit
    batch = drafts[:limit] if limit else drafts[:remaining_quota]
    if len(batch) > remaining_quota:
        batch = batch[:remaining_quota]

    print(f"=== Email Sender {'[DRY RUN] ' if dry_run else ''}===\n")
    print(f"  Quota today : {already_sent} sent / {DAILY_LIMIT} limit")
    print(f"  Remaining   : {remaining_quota}")
    print(f"  This batch  : {len(batch)} email(s)")
    windows_str = ", ".join(f"{s}:00–{e}:00" for s, e in SEND_WINDOWS_IST)
    print(f"  Send window : {windows_str} IST\n")

    server = None
    if not dry_run:
        try:
            print("[>] Connecting to Gmail SMTP…")
            server = get_smtp()
            print("[✓] Connected.\n")
        except smtplib.SMTPAuthenticationError:
            print("[!] Authentication failed. Check GMAIL_ADDRESS and GMAIL_APP_PASSWORD in .env")
            print("    Make sure you're using an App Password, not your Gmail password.")
            raise SystemExit(1)
        except Exception as e:
            print(f"[!] SMTP connection failed: {e}")
            raise SystemExit(1)

    sent_count = failed_count = 0

    for i, draft in enumerate(batch, 1):
        name  = draft["business_name"]
        email = draft["verified_email"]

        print(f"  [{i:02d}/{len(batch)}] {name[:35]:<35} → {email}")

        try:
            msg_id = send_one(server, draft, dry_run=dry_run)

            if not dry_run:
                db.mark_outreach_sent(draft["id"], message_id=msg_id)
                db.update_status(draft["lead_id"], "contacted")
                db.log_event(
                    lead_id=draft["lead_id"],
                    outreach_id=draft["id"],
                    event="sent",
                    metadata={
                        "to":         email,
                        "subject":    draft["subject"],
                        "message_id": msg_id,
                        "step":       draft["sequence_step"],
                    },
                )

            sent_count += 1
            print(f"          ✓ {'would send' if dry_run else 'sent'}")

        except Exception as e:
            failed_count += 1
            print(f"          ✗ failed: {e}")
            if not dry_run:
                db.mark_outreach_failed(draft["id"], str(e))
                db.log_event(
                    lead_id=draft["lead_id"],
                    outreach_id=draft["id"],
                    event="failed",
                    metadata={"error": str(e), "to": email},
                )

        # Delay between sends (skip for last email and dry runs)
        if i < len(batch) and not dry_run:
            delay = random.uniform(DELAY_MIN, DELAY_MAX)
            print(f"          ↳ waiting {delay:.1f}s…")
            time.sleep(delay)

    if server and not dry_run:
        try:
            server.quit()
        except Exception:
            pass

    print(f"\n{'='*45}")
    print(f"✓ Sent: {sent_count}  |  Failed: {failed_count}")
    if not dry_run:
        total_today = db.count_sent_today()
        print(f"  Total sent today: {total_today}/{DAILY_LIMIT}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Send outreach emails via Gmail")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview emails without actually sending")
    parser.add_argument("--limit", "-l", type=int, default=0,
                        help="Max emails to send this run (0 = up to daily quota)")
    parser.add_argument("--force", action="store_true",
                        help="Ignore send time window restriction")
    args = parser.parse_args()

    if args.force and not args.dry_run:
        global SEND_WINDOWS_IST
        SEND_WINDOWS_IST = [(0, 24)]

    run(dry_run=args.dry_run, limit=args.limit)


if __name__ == "__main__":
    main()
