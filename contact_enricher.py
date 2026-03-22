"""
contact_enricher.py  —  Enrich leads with domain, real emails, LinkedIn URL
Reads status=scraped leads from SQLite, enriches, writes back.

Usage:
    python contact_enricher.py
    python contact_enricher.py --limit 20
"""

import argparse
import json
import re
import time
import urllib.parse
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

import database as db

# ── Config ────────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    )
}
REQUEST_TIMEOUT = 8

GENERIC_PREFIXES = [
    "info", "contact", "hello", "enquiry", "enquiries",
    "sales", "support", "admin", "business", "team",
    "office", "mail", "connect",
]

CONTACT_PAGE_PATHS = [
    "/contact", "/contact-us", "/contactus", "/contact.html",
    "/about", "/about-us", "/reach-us", "/get-in-touch",
]

EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)

# ── Domain extraction ─────────────────────────────────────────────────────────

def extract_domain(website: str) -> str:
    if not website:
        return ""
    raw = website.strip()
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    try:
        parsed = urlparse(raw)
        host = parsed.netloc or parsed.path
        host = re.sub(r"^(www\d?|m|app)\.", "", host)
        host = host.split(":")[0]
        return host.lower()
    except Exception:
        return ""


# ── Contact page scraper ──────────────────────────────────────────────────────

def scrape_emails_from_page(url: str) -> list[str]:
    """Fetch a URL and extract all email addresses found in the page."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, "html.parser")

        emails: set[str] = set()

        # 1. mailto: links — most reliable
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("mailto:"):
                addr = href[7:].split("?")[0].strip().lower()
                if EMAIL_PATTERN.match(addr):
                    emails.add(addr)

        # 2. Visible text scan
        for match in EMAIL_PATTERN.finditer(soup.get_text()):
            addr = match.group(0).lower()
            # Filter obvious false positives (image filenames, etc.)
            if not any(addr.endswith(ext) for ext in [".png", ".jpg", ".gif", ".svg"]):
                emails.add(addr)

        return list(emails)

    except Exception:
        return []


def find_contact_emails(website: str) -> list[str]:
    """
    Try the homepage and common contact/about paths.
    Return deduplicated emails ordered by confidence
    (mailto: from contact page > text scan > homepage).
    """
    if not website:
        return []

    base = website.rstrip("/")
    if not base.startswith(("http://", "https://")):
        base = "https://" + base

    found: list[str] = []

    # Homepage first (quick win)
    found.extend(scrape_emails_from_page(base))

    # Contact / About pages
    for path in CONTACT_PAGE_PATHS:
        emails = scrape_emails_from_page(base + path)
        for e in emails:
            if e not in found:
                found.append(e)
        if found:
            # Stop as soon as we have something real
            break
        time.sleep(0.3)

    return found


# ── Email format guesser ──────────────────────────────────────────────────────

def name_to_parts(business_name: str) -> list[str]:
    stop = {"pvt", "ltd", "llp", "inc", "private", "limited", "co",
            "and", "the", "of", "for", "a", "an", "solutions", "services",
            "group", "india", "hyderabad"}
    return [w for w in re.findall(r"[a-z]+", business_name.lower()) if w not in stop]


def generate_email_guesses(domain: str, business_name: str) -> list[str]:
    if not domain:
        return []
    guesses: list[str] = []

    for prefix in GENERIC_PREFIXES:
        guesses.append(f"{prefix}@{domain}")

    parts = name_to_parts(business_name)
    if parts:
        slugs = dict.fromkeys([
            parts[0],
            "".join(parts[:3]),
            "".join(w[0] for w in parts[:4]),
        ])
        for slug in slugs:
            if slug and slug not in GENERIC_PREFIXES:
                guesses.append(f"{slug}@{domain}")

    return list(dict.fromkeys(guesses))  # deduplicate, preserve order


# ── LinkedIn URL ──────────────────────────────────────────────────────────────

def linkedin_search_url(business_name: str, city: str = "") -> str:
    if not business_name:
        return ""
    q = urllib.parse.quote_plus(f"{business_name} {city}".strip())
    return f"https://www.linkedin.com/search/results/companies/?keywords={q}"


# ── Domain ownership check ────────────────────────────────────────────────────

GENERIC_BIZ_WORDS = {
    # industry/type words that appear in many domains
    "digital", "tech", "web", "webs", "solar", "event", "events",
    "dental", "clinic", "clinics", "hospital", "hospitals", "care",
    "media", "agency", "studio", "design", "designs", "interiors",
    "solutions", "services", "consulting", "consultants", "software",
    "systems", "labs", "lab", "firm", "firms", "legal", "law",
    "realty", "property", "properties", "home", "homes", "house",
    # location / entity suffixes
    "india", "hyderabad", "hyd", "group", "global", "international",
    "pvt", "ltd", "llp", "inc", "corp", "the", "and", "for",
}


def domain_belongs_to_business(domain: str, business_name: str) -> bool:
    """Return True only if domain clearly belongs to this specific business.

    Requires at least one distinctive (non-generic, 4+ char) word from the
    business name to appear in the domain to prevent false positives from
    generic words like 'digital', 'tech', 'web'.
    """
    if not domain:
        return False
    words = [
        w for w in re.findall(r"[a-z]{4,}", business_name.lower())
        if w not in GENERIC_BIZ_WORDS
    ]
    return bool(words) and any(w in domain for w in words[:4])


# ── Core enrichment ───────────────────────────────────────────────────────────

def enrich_lead(lead: dict) -> dict:
    """Return a dict of fields to update on this lead."""
    raw_domain = extract_domain(lead.get("website", ""))
    business_name = lead.get("business_name", "")

    # Only use this domain if it actually belongs to this business
    if raw_domain and not domain_belongs_to_business(raw_domain, business_name):
        print(f"         ✗ domain mismatch: {raw_domain} ≠ '{business_name}' — skipping")
        domain = ""
        real_emails: list[str] = []
    else:
        domain = raw_domain
        # Real emails from contact pages (high confidence)
        real_emails = find_contact_emails(lead.get("website", "")) if domain else []

    # Guessed emails (lower confidence) — only if domain verified as ours
    guesses = generate_email_guesses(domain, business_name) if domain else []

    # Merge: real emails first, then guesses not already found
    all_candidates: list[str] = []
    seen: set[str] = set()
    for e in real_emails + guesses:
        if e not in seen:
            all_candidates.append(e)
            seen.add(e)

    li_url = linkedin_search_url(business_name, lead.get("city", ""))

    return {
        "domain":             domain,
        "email_candidates":   json.dumps(all_candidates),
        "linkedin_search_url": li_url,
        "outreach_status":    "enriched",
    }


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Enrich scraped leads")
    parser.add_argument("--limit", "-l", type=int, default=0,
                        help="Max leads to enrich this run (0 = all)")
    args = parser.parse_args()

    leads = db.get_leads_by_status("scraped")
    if args.limit:
        leads = leads[:args.limit]

    if not leads:
        print("[i] No scraped leads to enrich.")
        return

    print(f"=== Contact Enricher — {len(leads)} lead(s) ===\n")

    real_email_count = 0
    for i, lead in enumerate(leads, 1):
        name = lead["business_name"]
        print(f"  [{i:02d}/{len(leads)}] {name[:40]}")

        updates = enrich_lead(lead)
        candidates = json.loads(updates["email_candidates"])

        # Count leads where we found real (non-guessed) emails
        guesses_only = generate_email_guesses(updates["domain"], name)
        if any(e not in guesses_only for e in candidates):
            real_email_count += 1
            print(f"         ✓ real email found: {candidates[0]}")
        else:
            print(f"         ~ guesses only  : {updates['domain'] or '(no domain)'}")

        db.update_lead(lead["id"], **updates)
        time.sleep(0.5)  # polite delay

    counts = db.pipeline_counts()
    print(f"\n✓ Enriched {len(leads)} lead(s).")
    print(f"  Real emails found : {real_email_count}/{len(leads)}")
    print(f"  DB enriched total : {counts['enriched']}")


if __name__ == "__main__":
    main()
