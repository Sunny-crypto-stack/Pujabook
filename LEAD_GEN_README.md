# Automated Lead Generation & Outreach System

Scrape → Enrich → Verify → Draft → Send → Track Replies → Follow Up — automatically, daily.

---

## Project Structure

```
student-jobs/
├── runner.py               # ← START HERE — orchestrates everything
├── lead_scraper.py         # Step 1: Google Maps → SQLite
├── contact_enricher.py     # Step 2: Find real emails from contact pages
├── email_verifier.py       # Step 3: MX record check, pick best email
├── outreach_generator.py   # Step 4: Generate personalised email drafts
├── followup_scheduler.py   # Step 5: Queue Day-3 and Day-7 follow-ups
├── email_sender.py         # Step 6: Send via Gmail SMTP (rate-limited)
├── reply_tracker.py        # Step 7: Detect replies in Gmail inbox
├── crm_dashboard.py        # Streamlit dashboard (view/edit leads)
├── database.py             # Central SQLite layer (leads.db)
├── .env.example            # Config template
├── requirements.txt
└── leads.db                # Auto-created SQLite database
```

---

## One-Time Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

### 2. Configure credentials

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Key | What to put |
|---|---|
| `GMAIL_ADDRESS` | your Gmail address |
| `GMAIL_APP_PASSWORD` | 16-char App Password (see below) |
| `SENDER_NAME` | your name, shown in From: header |

**Getting a Gmail App Password:**
1. Go to [myaccount.google.com](https://myaccount.google.com) → Security
2. Enable 2-Step Verification (required)
3. Search for **"App Passwords"**
4. Create one for "Mail" → copy the 16-character password into `.env`

### 3. Fill in your details in `outreach_generator.py`

```python
YOUR_NAME    = "Your Name"
YOUR_PHONE   = "+91 98765 43210"
YOUR_EMAIL   = "you@gmail.com"
YOUR_COMPANY = "Your Company"
```

---

## Running the Pipeline

### Option A — Fully automated (recommended)

```bash
python runner.py
```

- Runs the full pipeline **immediately on startup**, then again **every day at 09:00**
- Scrapes new leads, enriches, verifies, generates drafts, queues follow-ups, sends emails, checks replies
- Keeps running until you press Ctrl+C

### Option B — Single run, then exit

```bash
python runner.py --once
```

### Option C — Run specific steps only

```bash
python runner.py --once --steps enrich,verify,generate,send
python runner.py --once --no-scrape   # skip scraping
```

### Option D — Run modules individually

```bash
python lead_scraper.py --query "solar installers Hyderabad" --limit 40
python contact_enricher.py
python email_verifier.py
python outreach_generator.py --preview   # preview drafts before saving
python followup_scheduler.py --preview   # preview follow-ups before queuing
python email_sender.py --dry-run         # preview sends
python email_sender.py                   # actually send
python reply_tracker.py                  # check for replies
```

---

## CRM Dashboard

```bash
streamlit run crm_dashboard.py --browser.gatherUsageStats false
```

Open [http://localhost:8501](http://localhost:8501) to:
- View the pipeline funnel (how many leads at each stage)
- See today's sent emails
- Preview all drafts
- Update lead status and notes
- Add leads manually
- Download leads as CSV

---

## Pipeline Flow

```
Google Maps
    │
    ▼
lead_scraper.py ──────────────── status: scraped
    │
    ▼
contact_enricher.py ──────────── status: enriched
(visits /contact pages, guesses email formats)
    │
    ▼
email_verifier.py ────────────── status: verified / invalid
(MX record check, picks best email)
    │
    ▼
outreach_generator.py ────────── status: draft_ready
(industry-specific template, personalised tokens)
    │
    ▼
email_sender.py ──────────────── status: contacted
(Gmail SMTP, 80/day cap, 9am-6pm window, random delays)
    │
    ├── [3 days later]
    │       ▼
    │   followup_scheduler.py ── step-2 draft queued → contacted
    │
    ├── [7 days later]
    │       ▼
    │   followup_scheduler.py ── step-3 draft queued → contacted
    │
    ▼
reply_tracker.py ─────────────── status: replied
(matches In-Reply-To header, detects auto-replies)
    │
    ▼
[YOU] review replies → mark interested / converted in dashboard
```

---

## Status Reference

| Status | Meaning |
|---|---|
| `scraped` | Just scraped, not yet enriched |
| `enriched` | Domain and email candidates found |
| `verified` | MX check passed, best email selected |
| `draft_ready` | Email draft ready to send |
| `contacted` | Initial email sent |
| `replied` | They replied to your email |
| `interested` | You marked them as a hot lead |
| `converted` | Deal closed / call booked |
| `sequence_complete` | Day-7 sent, no reply — sequence ended |
| `invalid` | No domain / no MX record — skip |

---

## Follow-up Sequence

```
Day 0  → Initial outreach sent
Day 3  → Follow-up #1: short nudge ("did you see my email?")
Day 7  → Follow-up #2: final touch ("last one from me")
Day 7+ → sequence_complete (no more emails to this lead)
```

Sequence stops automatically if the lead replies at any point.

---

## Recommended `.env` Settings

```env
DAILY_SEND_LIMIT=80      # safe ceiling; Gmail allows 500/day
SEND_WINDOW_START=9      # only send during business hours
SEND_WINDOW_END=18
RUN_TIME=09:00           # daily pipeline trigger
SCRAPE_LIMIT=40          # leads per search query
```

---

## Tips

- Run `--dry-run` / `--preview` flags on every module before the first live run
- Check `leads.db` in the CRM dashboard after each step to confirm data looks right
- Keep `leads.db` backed up — it's your entire pipeline state
- Add more search queries in `lead_scraper.py → DEFAULT_QUERIES` to hit 50–100 leads/day
- Edit templates in `outreach_generator.py` to match your actual offer before sending
