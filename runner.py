"""
runner.py  —  Full pipeline orchestrator
Runs all 7 steps in order, either once or on a daily schedule.

Usage:
    python runner.py --once              # run immediately, then exit
    python runner.py                     # daemon: runs daily at RUN_TIME (default 09:00)
    python runner.py --once --no-scrape  # skip scraping, enrich/send only
    python runner.py --once --steps enrich,verify,send  # run specific steps only

Steps (in order):
    1. scrape      — Google Maps → new leads
    2. enrich      — contact page scraping + email guesses
    3. verify      — MX record check
    4. generate    — create initial outreach drafts
    5. followup    — queue due Day-3 / Day-7 follow-ups
    6. send        — send drafts via Gmail SMTP
    7. track       — check inbox for replies
"""

import argparse
import os
import sys
import time
import traceback
from datetime import datetime

import schedule
from dotenv import load_dotenv

load_dotenv()

# ── Config from .env ──────────────────────────────────────────────────────────

RUN_TIME      = os.getenv("RUN_TIME", "09:00")           # daily pipeline time (HH:MM)
SEND_TIME     = os.getenv("SEND_TIME", "10:30")          # daily send-only pass (HH:MM IST)
SCRAPE_QUERY  = os.getenv("SCRAPE_QUERY", "")            # default scrape query
SCRAPE_LIMIT  = int(os.getenv("SCRAPE_LIMIT", "40"))     # leads per scrape run
ENRICH_LIMIT  = int(os.getenv("ENRICH_LIMIT", "0"))      # 0 = all
SEND_LIMIT    = int(os.getenv("SEND_LIMIT", "0"))        # 0 = up to daily quota
RUN_SCRAPER   = os.getenv("RUN_SCRAPER", "true").lower() != "false"

ALL_STEPS = ["scrape", "enrich", "verify", "generate", "followup", "send", "track",
             "buyer_scrape", "buyer_match", "buyer_deliver"]

# ── Logging ───────────────────────────────────────────────────────────────────

def log(msg: str, level: str = "INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    prefix = {"INFO": "  ", "STEP": "▶ ", "OK": "✓ ", "ERR": "✗ ", "SKIP": "~ "}.get(level, "  ")
    print(f"[{ts}] {prefix}{msg}", flush=True)


def separator(title: str = ""):
    width = 55
    if title:
        pad = (width - len(title) - 2) // 2
        print(f"\n{'─'*pad} {title} {'─'*pad}")
    else:
        print(f"\n{'─'*width}")


# ── Individual step runners ───────────────────────────────────────────────────

def step_scrape():
    from lead_scraper import scrape_google_maps, DEFAULT_QUERIES
    import database as db

    queries = [SCRAPE_QUERY] if SCRAPE_QUERY else DEFAULT_QUERIES
    total = 0
    for q in queries:
        log(f"Scraping: {q}")
        leads = scrape_google_maps(q, limit=SCRAPE_LIMIT, headless=True)
        added = sum(1 for lead in leads if db.upsert_lead(lead))
        total += added
        log(f"{added} new leads from: {q}", "OK")
    log(f"Scrape complete — {total} new leads total", "OK")
    return total


def step_enrich():
    from contact_enricher import enrich_lead
    import database as db
    import json, time as _time

    leads = db.get_leads_by_status("scraped")
    if ENRICH_LIMIT:
        leads = leads[:ENRICH_LIMIT]
    if not leads:
        log("No scraped leads to enrich", "SKIP")
        return 0

    log(f"Enriching {len(leads)} lead(s)…")
    count = 0
    for lead in leads:
        updates = enrich_lead(lead)
        db.update_lead(lead["id"], **updates)
        count += 1
        _time.sleep(0.4)
    log(f"Enriched {count} lead(s)", "OK")
    return count


def step_verify():
    from email_verifier import verify_lead
    import database as db

    leads = db.get_leads_by_status("enriched")
    if not leads:
        log("No enriched leads to verify", "SKIP")
        return 0

    log(f"Verifying {len(leads)} lead(s)…")
    verified = invalid = 0
    for lead in leads:
        email, status = verify_lead(lead)
        db.update_lead(lead["id"], verified_email=email, outreach_status=status)
        if status == "verified":
            verified += 1
        else:
            invalid += 1
    log(f"Verified: {verified}  Invalid: {invalid}", "OK")
    return verified


def step_generate():
    from outreach_generator import generate_initial
    import database as db

    count = generate_initial(preview=False)
    if count:
        log(f"Generated {count} initial draft(s)", "OK")
    else:
        log("No verified leads needing drafts", "SKIP")
    return count


def step_followup():
    from followup_scheduler import run as followup_run

    stats = followup_run(preview=False)
    total = stats["step2_queued"] + stats["step3_queued"]
    if total:
        log(f"Follow-ups queued — step2: {stats['step2_queued']}  step3: {stats['step3_queued']}", "OK")
    else:
        log("No follow-ups due yet", "SKIP")
    return total


def step_send():
    from email_sender import run as send_run, validate_config, within_send_window, DAILY_LIMIT
    import database as db

    try:
        validate_config()
    except SystemExit:
        log("Gmail credentials not configured — skipping send", "SKIP")
        return 0

    if not within_send_window():
        log("Outside send window — skipping send", "SKIP")
        return 0

    before = db.count_sent_today()
    send_run(dry_run=False, limit=SEND_LIMIT)
    after = db.count_sent_today()
    sent = after - before
    log(f"Sent {sent} email(s) today ({after}/{DAILY_LIMIT})", "OK")
    return sent


def step_track():
    from reply_tracker import (
        get_imap, get_last_check_date, fetch_new_emails,
        process_emails, save_last_check, GMAIL_ADDRESS, GMAIL_APP_PW
    )
    import imaplib

    if not GMAIL_ADDRESS or not GMAIL_APP_PW:
        log("Gmail credentials not configured — skipping reply tracking", "SKIP")
        return 0

    since = get_last_check_date()
    log(f"Checking inbox for replies since {since}…")
    try:
        mail = get_imap()
        incoming = fetch_new_emails(mail, since)
        mail.logout()
        stats = process_emails(incoming)
        save_last_check()
        log(f"Replies: {stats['replied']}  Auto-replies: {stats['auto_reply']}  "
            f"Unmatched: {stats['unmatched']}", "OK")
        return stats["replied"]
    except imaplib.IMAP4.error as e:
        log(f"IMAP error: {e}", "ERR")
        return 0


def step_buyer_scrape():
    from buyer_scraper import run as buyer_run
    log("Scraping buyer intent signals…")
    added = buyer_run()
    log(f"Buyer scrape done — {added} new lead(s)", "OK")
    return added


def step_buyer_match():
    from lead_matcher import match_all
    log("Matching buyer leads to clients…")
    n = match_all()
    log(f"Matched {n} lead(s)", "OK")
    return n


def step_buyer_deliver():
    from lead_delivery import run as deliver_run
    log("Delivering leads to clients…")
    n = deliver_run()
    log(f"Delivered {n} lead(s)", "OK")
    return n


STEP_RUNNERS = {
    "scrape":         step_scrape,
    "enrich":         step_enrich,
    "verify":         step_verify,
    "generate":       step_generate,
    "followup":       step_followup,
    "send":           step_send,
    "track":          step_track,
    "buyer_scrape":   step_buyer_scrape,
    "buyer_match":    step_buyer_match,
    "buyer_deliver":  step_buyer_deliver,
}


# ── Pipeline runner ───────────────────────────────────────────────────────────

def run_pipeline(steps: list[str]):
    separator("PIPELINE START")
    log(f"Running steps: {', '.join(steps)}")
    import database as db
    counts_before = db.pipeline_counts()

    results = {}
    for step in steps:
        if step == "scrape" and not RUN_SCRAPER:
            log("Scraping disabled via RUN_SCRAPER=false", "SKIP")
            continue

        separator(step.upper())
        fn = STEP_RUNNERS.get(step)
        if not fn:
            log(f"Unknown step: {step}", "ERR")
            continue

        try:
            result = fn()
            results[step] = result
        except Exception as e:
            log(f"Step '{step}' failed: {e}", "ERR")
            traceback.print_exc()
            results[step] = None
            # Continue to next step — don't let one failure kill the pipeline

    separator("SUMMARY")
    counts_after = db.pipeline_counts()
    log(f"Total leads in DB : {counts_after['total']}")
    log(f"Scraped           : {counts_after['scraped']}")
    log(f"Enriched          : {counts_after['enriched']}")
    log(f"Verified          : {counts_after['verified']}")
    log(f"Draft ready       : {counts_after['draft_ready']}")
    log(f"Contacted         : {counts_after['contacted']}")
    log(f"Replied           : {counts_after['replied']}")
    log(f"Interested        : {counts_after['interested']}")
    log(f"Converted         : {counts_after['converted']}")
    separator()
    log("Pipeline complete.")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Automated lead pipeline runner")
    parser.add_argument("--once", action="store_true",
                        help="Run pipeline once immediately and exit")
    parser.add_argument("--no-scrape", action="store_true",
                        help="Skip the scraping step this run")
    parser.add_argument("--steps", default="",
                        help=f"Comma-separated steps to run. All: {','.join(ALL_STEPS)}")
    parser.add_argument("--time", default=RUN_TIME,
                        help=f"Daily run time in HH:MM format (default: {RUN_TIME})")
    args = parser.parse_args()

    # Determine which steps to run
    if args.steps:
        steps = [s.strip() for s in args.steps.split(",") if s.strip() in STEP_RUNNERS]
    else:
        steps = ALL_STEPS.copy()

    if args.no_scrape and "scrape" in steps:
        steps.remove("scrape")

    if args.once:
        run_pipeline(steps)
        return

    # ── Daemon mode: schedule and loop ───────────────────────────────────────
    run_time = args.time
    log(f"Scheduler started. Pipeline will run daily at {run_time}.")
    log(f"Steps: {', '.join(steps)}")
    log("Press Ctrl+C to stop.\n")

    schedule.every().day.at(run_time).do(run_pipeline, steps=steps)

    # Second daily pass: send + track only (runs during IST business hours)
    send_steps = ["followup", "send", "track"]
    schedule.every().day.at(SEND_TIME).do(run_pipeline, steps=send_steps)
    log(f"Send-only pass scheduled daily at {SEND_TIME}.")

    # Run immediately on first start so you don't wait until tomorrow
    log("Running pipeline now (first-run on startup)…")
    run_pipeline(steps)

    while True:
        schedule.run_pending()
        time.sleep(30)  # check every 30 seconds


if __name__ == "__main__":
    main()
