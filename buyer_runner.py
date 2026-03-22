"""
buyer_runner.py — Orchestrates the buyer-side pipeline:
  1. scrape  — find people looking for services (Sulekha, JustDial, DDG, Facebook)
  2. match   — pair buyer leads with active clients
  3. deliver — send matched leads to clients via email

Usage:
    python buyer_runner.py                    # daemon: runs daily at 11:00
    python buyer_runner.py --once             # run immediately and exit
    python buyer_runner.py --once --steps match,deliver  # skip scraping
"""

import argparse
import os
import time
from datetime import datetime

import schedule
from dotenv import load_dotenv

load_dotenv()

RUN_TIME = os.getenv("BUYER_RUN_TIME", "11:00")  # EDT — = 8:30pm IST, runs after morning scrape


def log(msg: str, level: str = "INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")


def step_scrape():
    from buyer_scraper import run as scrape_run
    log("Scraping buyer intent signals…")
    added = scrape_run()
    log(f"Buyer scrape done — {added} new lead(s)", "OK")
    return added


def step_match():
    from lead_matcher import match_all
    log("Matching buyer leads to clients…")
    matched = match_all()
    log(f"Matched {matched} lead(s)", "OK")
    return matched


def step_deliver():
    from lead_delivery import run as deliver_run
    log("Delivering leads to clients…")
    sent = deliver_run()
    log(f"Delivered {sent} lead(s)", "OK")
    return sent


STEP_RUNNERS = {
    "scrape":  step_scrape,
    "match":   step_match,
    "deliver": step_deliver,
}
ALL_STEPS = ["scrape", "match", "deliver"]


def run_pipeline(steps: list[str] = None):
    steps = steps or ALL_STEPS
    import database as db

    print("\n" + "─" * 50)
    log(f"BUYER PIPELINE START — steps: {', '.join(steps)}")
    print("─" * 50)

    for step in steps:
        fn = STEP_RUNNERS.get(step)
        if not fn:
            continue
        print(f"\n{'─'*20} {step.upper()} {'─'*20}")
        try:
            fn()
        except Exception as e:
            log(f"Step '{step}' failed: {e}", "ERROR")

    counts = db.buyer_counts()
    print("\n" + "─" * 50)
    log(f"Buyer leads total  : {counts['total_buyer_leads']}")
    log(f"New (unmatched)    : {counts['new']}")
    log(f"Delivered          : {counts['delivered']}")
    log(f"Active clients     : {counts['active_clients']}")
    log(f"Revenue (₹)        : {counts['total_revenue_inr']:.0f}")
    print("─" * 50)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once",  action="store_true")
    parser.add_argument("--steps", default="", help=f"Comma-separated: {','.join(ALL_STEPS)}")
    args = parser.parse_args()

    steps = [s.strip() for s in args.steps.split(",") if s.strip() in STEP_RUNNERS] if args.steps else ALL_STEPS

    if args.once:
        run_pipeline(steps)
        return

    log(f"Buyer pipeline scheduler started. Runs daily at {RUN_TIME}.")
    schedule.every().day.at(RUN_TIME).do(run_pipeline, steps=steps)
    log("Running immediately on startup…")
    run_pipeline(steps)
    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
