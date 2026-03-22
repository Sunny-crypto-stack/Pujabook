"""
outreach_generator.py  —  Generate personalised email drafts → SQLite
"""

import argparse
import hashlib

import database as db

# ── Sender details ────────────────────────────────────────────────────────────

YOUR_NAME    = "Sanmay Pachika"
YOUR_COMPANY = "LeadFlow"
YOUR_PHONE   = "+1 (470) 338-1677"
YOUR_EMAIL   = "collegeapplications372@gmail.com"

# ── Interior Design — 3 variants so not every email looks identical ───────────

INTERIOR_A = {
    "subject": "Getting more clients for {business_name}?",
    "body": """\
Hi {business_name},

I came across your studio while looking at interior designers in {city} — the work looks great.

Quick question: are you currently happy with how many new project inquiries you're getting, \
or is that something you're actively trying to grow?

I run a small lead-gen service that connects interior design studios with homeowners and \
businesses in {city} who are actively searching for designers — not random ad traffic, \
but people already looking to hire.

Happy to show you exactly how it works in a 15-minute call this week.

Warm regards,
{your_name}
{your_company}
{your_phone}
{your_email}

---
To stop receiving emails, reply with "unsubscribe".\
""",
}

INTERIOR_B = {
    "subject": "More interior design projects in {city}?",
    "body": """\
Hi {business_name},

I help interior design studios in {city} fill their project pipeline — \
without relying on referrals or spending heavily on ads.

The way it works: I identify homeowners and businesses in {city} who are \
actively researching interior designers right now, and pass them directly \
to studios like yours as warm leads.

Would you be open to a quick 15-minute chat to see if this makes sense for {business_name}?

Best,
{your_name}
{your_company}
{your_phone}
{your_email}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

INTERIOR_C = {
    "subject": "Question about {business_name}'s client pipeline",
    "body": """\
Hi {business_name},

I'll keep this short — I work with interior design studios in {city} to bring \
in a consistent flow of new project inquiries.

Most studios I speak to either rely entirely on word-of-mouth (which is unpredictable) \
or spend on ads that attract the wrong people. I take a different approach: \
I find people already looking to hire an interior designer in {city} and connect them \
directly to your team.

Worth a 15-minute call?

{your_name}
{your_company}
{your_phone}
{your_email}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

SOLAR_A = {
    "subject": "More solar installation leads for {business_name}?",
    "body": """\
Hi {business_name},

I help solar companies in {city} connect with homeowners and businesses who are \
actively looking for installation quotes — not cold prospects, people already searching.

Rather than broad ad spend, my approach delivers warm leads directly to your sales team.

Could we do a quick 15-minute call this week?

Best,
{your_name}
{your_company}
{your_phone}
{your_email}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

SOLAR_B = {
    "subject": "Qualified solar leads in {city} — interested?",
    "body": """\
Hi {business_name},

Quick one — I run a lead generation service for solar companies in {city}. \
I identify residential and commercial prospects actively researching solar and \
send them to installers as qualified leads.

No long contracts, no upfront ad spend. Happy to explain the model in 15 minutes.

Interested?

{your_name}
{your_company}
{your_phone}
{your_email}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

DIGITAL_MARKETING_A = {
    "subject": "Client referrals for {business_name}?",
    "body": """\
Hi {business_name},

I came across {business_name} while researching marketing agencies in {city}.

I run a B2B lead gen service and sometimes come across businesses looking for \
digital marketing help that's outside what I offer. I wanted to check if \
{business_name} has capacity for new clients and would be open to referrals.

Happy to connect for 15 minutes if that sounds useful.

{your_name}
{your_company}
{your_phone}
{your_email}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

REAL_ESTATE_A = {
    "subject": "Consistent property leads for {business_name}?",
    "body": """\
Hi {business_name},

Finding a consistent stream of qualified buyers and sellers is one of the \
toughest parts of running an agency in {city} — I hear this constantly.

I run a lead generation service for real estate agencies. I identify people \
actively searching for property in {city} and deliver them as warm leads \
directly to your team.

Happy to walk you through it in 15 minutes — no pitch, just a quick overview.

{your_name}
{your_company}
{your_phone}
{your_email}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

GENERAL_A = {
    "subject": "Quick question for {business_name}",
    "body": """\
Hi {business_name},

I came across your business while researching companies in {city} and wanted to reach out.

I help local businesses generate more qualified leads — people already looking for the \
services they offer — without depending entirely on referrals or expensive ads.

Would you be open to a 15-minute call this week?

{your_name}
{your_company}
{your_phone}
{your_email}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

GENERAL_B = {
    "subject": "Growing {business_name}'s client base",
    "body": """\
Hi {business_name},

Short question: is bringing in more clients something {business_name} is \
actively focused on right now?

I run a lead generation service for businesses in {city} and help connect them \
with people already searching for what they offer. Happy to share how it works \
in a quick 15-minute call.

{your_name}
{your_company}
{your_phone}
{your_email}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

# ── Template pools per industry ───────────────────────────────────────────────

TEMPLATE_POOLS: dict[str, list[dict]] = {
    "interior_design":   [INTERIOR_A, INTERIOR_B, INTERIOR_C],
    "solar":             [SOLAR_A, SOLAR_B],
    "digital_marketing": [DIGITAL_MARKETING_A],
    "real_estate":       [REAL_ESTATE_A],
    "general":           [GENERAL_A, GENERAL_B],
}

INDUSTRY_TEMPLATE_MAP = {
    "interior design": "interior_design",
    "solar / energy":  "solar",
    "digital marketing": "digital_marketing",
    "real estate":     "real_estate",
}

# ── Follow-up templates ───────────────────────────────────────────────────────

FOLLOWUP_STEP2 = {
    "subject": "Re: {original_subject}",
    "body": """\
Hi {business_name},

Just checking in — wanted to make sure my last email didn't get buried.

If the timing isn't right, no problem at all. But if growing {business_name}'s \
client base is something you're thinking about, I'd love to chat.

{your_name}
{your_company}
{your_phone}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

FOLLOWUP_STEP3 = {
    "subject": "Re: {original_subject}",
    "body": """\
Hi {business_name},

Last one from me — I don't want to clutter your inbox.

If you ever want to explore bringing in more leads for {business_name} \
in {city}, feel free to reach out any time.

Wishing you a great week ahead.

{your_name}
{your_company}
{your_phone}

---
To unsubscribe, reply with "unsubscribe".\
""",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def pick_template(lead: dict) -> dict:
    """Pick a template variant deterministically per lead (same lead always gets same variant)."""
    industry = lead.get("industry", "").lower()
    pool_key = next(
        (v for k, v in INDUSTRY_TEMPLATE_MAP.items() if k in industry),
        "general"
    )
    pool = TEMPLATE_POOLS[pool_key]
    # Use lead id hash to distribute variants evenly and consistently
    idx = int(hashlib.md5(str(lead.get("id", 0)).encode()).hexdigest(), 16) % len(pool)
    return pool[idx]


def render(template: str, lead: dict, extra: dict | None = None) -> str:
    tokens = {
        "business_name":   lead.get("business_name", "there"),
        "city":            lead.get("city", "your city"),
        "industry":        lead.get("industry", ""),
        "your_name":       YOUR_NAME,
        "your_company":    YOUR_COMPANY,
        "your_phone":      YOUR_PHONE,
        "your_email":      YOUR_EMAIL,
    }
    if extra:
        tokens.update(extra)
    return template.format(**tokens)


def get_original_subject(lead_id: int) -> str:
    """Fetch the subject of the step-1 outreach for threading follow-ups."""
    with db.get_conn() as conn:
        cur = conn.execute(
            "SELECT subject FROM outreach WHERE lead_id=? AND sequence_step=1 ORDER BY id LIMIT 1",
            (lead_id,),
        )
        row = cur.fetchone()
    return row["subject"] if row else "my previous email"


# ── Step 1: Initial outreach ──────────────────────────────────────────────────

def generate_initial(preview: bool = False) -> int:
    leads = db.get_leads_by_status("verified")
    if not leads:
        print("[i] No verified leads to generate drafts for.")
        return 0

    print(f"[>] Generating initial drafts for {len(leads)} lead(s)…\n")
    count = 0
    for lead in leads:
        tmpl = pick_template(lead)
        subj = render(tmpl["subject"], lead)
        body = render(tmpl["body"],    lead)

        if preview:
            print(f"{'='*55}")
            print(f"To      : {lead.get('verified_email')}")
            print(f"Subject : {subj}")
            print(body)
        else:
            db.insert_outreach(lead["id"], step=1, subject=subj, body=body)
            db.update_status(lead["id"], "draft_ready")

        count += 1
        print(f"  [✓] {lead['business_name']}")

    return count


# ── Step 2 & 3: Follow-ups ────────────────────────────────────────────────────

def generate_followup(lead: dict, step: int) -> tuple[str, str]:
    tmpl = FOLLOWUP_STEP2 if step == 2 else FOLLOWUP_STEP3
    original_subject = get_original_subject(lead["id"])
    extra = {"original_subject": original_subject}
    subj = render(tmpl["subject"], lead, extra)
    body = render(tmpl["body"],    lead, extra)
    return subj, body


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate outreach email drafts")
    parser.add_argument("--step",    type=int, default=1, choices=[1, 2, 3])
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()

    print("=== Outreach Generator ===\n")

    if args.step == 1:
        n = generate_initial(preview=args.preview)
        if not args.preview:
            counts = db.pipeline_counts()
            print(f"\n✓ {n} draft(s) created. DB draft_ready: {counts['draft_ready']}")
    else:
        print("[i] Steps 2 & 3 are handled by followup_scheduler.py")


if __name__ == "__main__":
    main()
