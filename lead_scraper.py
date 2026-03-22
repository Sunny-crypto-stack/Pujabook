"""
lead_scraper.py  —  Google Maps lead scraper (Playwright) → SQLite
Usage:
    python lead_scraper.py
    python lead_scraper.py --query "interior designers Hyderabad" --limit 40
    python lead_scraper.py --show-browser
"""

import argparse
import re
import time
from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

import database as db

# ── Helpers ───────────────────────────────────────────────────────────────────

def clean(text: str) -> str:
    return text.strip() if text else ""


INDUSTRY_MAP = {
    "interior design": ["interior"],
    "Digital Marketing": ["digital marketing", "seo", "social media"],
    "Real Estate": ["real estate", "property", "realty"],
    "Restaurant / Food": ["restaurant", "cafe", "food", "hotel", "dhaba"],
    "IT / Software": ["it", "software", "tech", "developer"],
    "Education": ["coaching", "institute", "school", "college", "tutor"],
    "Healthcare": ["clinic", "hospital", "doctor", "medical", "pharmacy"],
    "Finance": ["ca", "accountant", "finance", "tax", "audit"],
    "Legal": ["lawyer", "advocate", "legal", "law firm"],
    "Retail": ["shop", "store", "boutique", "retail"],
    "Solar / Energy": ["solar", "energy", "renewable"],
    "Logistics": ["logistics", "transport", "courier", "cargo"],
}


def infer_industry(query: str) -> str:
    q = query.lower()
    for industry, terms in INDUSTRY_MAP.items():
        if any(t in q for t in terms):
            return industry
    return "General"


def extract_city(address: str, fallback: str = "Hyderabad") -> str:
    parts = [p.strip() for p in address.split(",")]
    skip = {"india", "telangana", "andhra pradesh"}
    for part in reversed(parts):
        part_clean = re.sub(r"\d", "", part).strip()
        if 3 < len(part_clean) < 30 and part_clean.lower() not in skip:
            return part_clean
    return fallback


# ── Junk filter ──────────────────────────────────────────────────────────────

JUNK_PATTERNS = re.compile(
    r"^(top \d+|best \d+|\d+ (companies|agencies|firms|services|institutes)|"
    r"list of|ranking of)",
    re.IGNORECASE,
)

JUNK_DOMAINS = re.compile(
    r"(clutch\.co|justdial|sulekha|indiamart|tradeindia|linkedin\.com|"
    r"glassdoor|ambitionbox|naukri|goodfirms|designrush|themanifest|"
    r"techbehemoths|superbcompanies|geeksforgeeks|builtin\.com|qoruz|"
    r"registerkaro|guvi\.in|soravjain\.com|iide\.co)",
    re.IGNORECASE,
)

def is_junk_name(name: str) -> bool:
    """Return True only for clear directory/article titles, not real businesses."""
    # Starts with "Top N" / "Best N" / "List of" patterns
    if JUNK_PATTERNS.search(name.strip()):
        return True
    return False

def is_junk_website(url: str) -> bool:
    return bool(JUNK_DOMAINS.search(url)) if url else False


# ── Core scraper ──────────────────────────────────────────────────────────────

def scrape_google_maps(query: str, limit: int = 40, headless: bool = True) -> list[dict]:
    results = []
    url = f"https://www.google.com/maps/search/{quote_plus(query)}"
    industry = infer_industry(query)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        page = ctx.new_page()

        print(f"[>] Google Maps: {query}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)

        # Dismiss consent banner if present
        for selector in ['button[aria-label*="Accept"]', '#L2AGLb']:
            try:
                btn = page.locator(selector).first
                if btn.is_visible(timeout=2000):
                    btn.click()
                    page.wait_for_timeout(1000)
            except Exception:
                pass

        try:
            page.wait_for_selector('div[role="feed"]', timeout=15000)
        except PWTimeout:
            print("[!] Result feed not found — Maps may have changed layout or rate-limited.")
            browser.close()
            return results

        feed = page.locator('div[role="feed"]')

        # Scroll to load cards
        print(f"[>] Scrolling for up to {limit} listings…")
        prev_count = stall = 0
        while True:
            cards = page.locator('div[role="feed"] > div > div[jsaction]').all()
            count = len(cards)
            if count >= limit:
                break
            if count == prev_count:
                stall += 1
                if stall >= 5:
                    break
            else:
                stall = 0
            prev_count = count
            feed.evaluate("el => el.scrollBy(0, el.scrollHeight)")
            page.wait_for_timeout(1500)

        cards = page.locator('div[role="feed"] > div > div[jsaction]').all()[:limit]
        print(f"[>] {len(cards)} cards found — extracting details…")

        PLATFORM_DOMAINS_LOCAL = re.compile(
            r"(livspace\.com|houzz\.com|urbancompany\.com|sulekha\.com|"
            r"justdial\.com|indiamart\.com|tradeindia\.com|99acres\.com|"
            r"magicbricks\.com|housing\.com|olx\.in|quikr\.com)",
            re.IGNORECASE,
        )
        GENERIC_BIZ_WORDS = {
            "digital", "tech", "web", "webs", "solar", "event", "events",
            "dental", "clinic", "clinics", "hospital", "hospitals", "care",
            "media", "agency", "studio", "design", "designs", "interiors",
            "solutions", "services", "consulting", "consultants", "software",
            "systems", "labs", "lab", "firm", "firms", "legal", "law",
            "realty", "property", "properties", "home", "homes", "house",
            "india", "hyderabad", "hyd", "group", "global", "international",
            "pvt", "ltd", "llp", "inc", "corp", "the", "and", "for",
        }

        prev_h1 = ""  # track previous panel's h1 to detect panel refresh

        for i, card in enumerate(cards, 1):
            try:
                # Get h1 text BEFORE clicking so we can wait for it to change
                try:
                    prev_h1 = clean(page.locator('h1.DUwDvf').first.inner_text(timeout=1000))
                except Exception:
                    prev_h1 = ""

                card.click()

                # Wait for the detail panel to refresh (h1 must change from prev)
                if prev_h1:
                    try:
                        page.wait_for_function(
                            f"() => (document.querySelector('h1.DUwDvf')?.innerText?.trim() || '') !== {repr(prev_h1)}",
                            timeout=6000,
                        )
                    except Exception:
                        pass
                else:
                    page.wait_for_timeout(2000)

                def txt(sel: str) -> str:
                    try:
                        return clean(page.locator(sel).first.inner_text(timeout=3000))
                    except Exception:
                        return ""

                name = txt('h1.DUwDvf') or txt('h1[data-attrid="title"]')
                if not name:
                    continue

                # Filter out non-business results (directory pages, articles, etc.)
                if is_junk_name(name):
                    print(f"  [{i:02d}] SKIP (not a business): {name[:60]}")
                    continue

                # Phone
                phone = ""
                for sel in ['a[href^="tel:"]', 'button[aria-label*="+91"]']:
                    try:
                        el = page.locator(sel).first
                        if el.count() > 0:
                            raw = el.get_attribute("href") or el.get_attribute("aria-label") or ""
                            m = re.search(r"[\+\d][\d\s\-]{8,14}", raw)
                            if m:
                                phone = m.group(0).strip()
                                break
                    except Exception:
                        pass

                # Website — only accept if domain clearly belongs to THIS business.
                # We require at least one distinctive (non-generic) word from the
                # business name to appear in the domain.  This prevents domain
                # bleed where the previous card's website URL persists in the DOM.
                website = ""
                name_words = [
                    w for w in re.findall(r"[a-z]{4,}", name.lower())
                    if w not in GENERIC_BIZ_WORDS
                ][:4]
                try:
                    wlink = page.locator(
                        'a[data-tooltip="Open website"], a[aria-label*="website" i]'
                    ).first
                    if wlink.count() > 0:
                        href = wlink.get_attribute("href") or ""
                        href_lower = href.lower()
                        if (href
                                and not PLATFORM_DOMAINS_LOCAL.search(href)
                                and name_words
                                and any(w in href_lower for w in name_words)):
                            website = href
                except Exception:
                    pass

                # Address
                address = ""
                try:
                    addr_btn = page.locator('button[data-tooltip="Copy address"]').first
                    if addr_btn.count() > 0:
                        address = clean(addr_btn.inner_text(timeout=2000))
                except Exception:
                    pass
                if not address:
                    address = txt('div.Io6YTe')

                city = extract_city(address)

                if is_junk_website(website):
                    print(f"  [{i:02d}] SKIP (directory site): {name[:50]}")
                    continue

                # Clean name: strip taglines after " - " or " | "
                clean_name = re.split(r"\s[\|\-]\s", name)[0].strip()
                # Remove trailing location suffixes
                clean_name = re.sub(
                    r"\s*[,\-]?\s*(in\s+)?(hyderabad|secunderabad|telangana).*$",
                    "", clean_name, flags=re.IGNORECASE
                ).strip()
                # Remove unclosed parenthetical junk at the end e.g. "(Best and Top..."
                clean_name = re.sub(r"\s*\([^)]*$", "", clean_name).strip()
                name = clean_name or name

                results.append({
                    "business_name":  name,
                    "website":        website,
                    "phone":          phone,
                    "address":        address,
                    "city":           city,
                    "industry":       industry,
                    "outreach_status": "scraped",
                    "notes":          "",
                })
                print(f"  [{i:02d}] {name} | {phone or '—'} | {website or '—'}")

            except Exception as e:
                print(f"  [!] Card {i} skipped: {e}")
                continue

        browser.close()
    return results


# ── CLI ───────────────────────────────────────────────────────────────────────

DEFAULT_QUERIES = [
    # Businesses most likely to have own websites (not platform-only)
    "software development company Hyderabad",
    "digital marketing agency Hyderabad",
    "chartered accountant firm Hyderabad",
    "architect firm Hyderabad",
    "event management company Hyderabad",
    "IT consulting firm Hyderabad",
    "web design company Hyderabad",
    "dental clinic Hyderabad",
    "law firm Hyderabad",
    "solar energy company Hyderabad",
]


def main():
    parser = argparse.ArgumentParser(description="Google Maps lead scraper → SQLite")
    parser.add_argument("--query", "-q", default="")
    parser.add_argument("--limit", "-l", type=int, default=40)
    parser.add_argument("--show-browser", action="store_true", default=False)
    args = parser.parse_args()

    headless = not args.show_browser

    if args.query:
        queries = [args.query]
    else:
        print("=== Google Maps Lead Scraper ===\n")
        for i, q in enumerate(DEFAULT_QUERIES, 1):
            print(f"  {i}. {q}")
        custom = input("\nCustom query (Enter = run all defaults): ").strip()
        queries = [custom] if custom else DEFAULT_QUERIES

    total_new = 0
    for query in queries:
        print(f"\n{'='*55}")
        leads = scrape_google_maps(query, limit=args.limit, headless=headless)
        added = 0
        for lead in leads:
            lead_id = db.upsert_lead(lead)
            if lead_id:
                added += 1
        total_new += added
        print(f"[+] {added} new lead(s) from: {query}")

    counts = db.pipeline_counts()
    print(f"\n✓ Done. {total_new} new lead(s) added.")
    print(f"  DB total: {counts['total']} leads | scraped: {counts['scraped']}")


if __name__ == "__main__":
    main()
