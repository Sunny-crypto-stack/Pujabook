"""
buyer_scraper.py — Scrape buyer intent signals from Sulekha, JustDial, DuckDuckGo
People in Hyderabad actively looking for services → stored as buyer_leads

Usage:
    python buyer_scraper.py                          # run all sources, all categories
    python buyer_scraper.py --source sulekha         # one source only
    python buyer_scraper.py --category dental        # one category only
    python buyer_scraper.py --limit 20               # max leads per source/category
"""

import argparse
import random
import re
import time
import urllib.parse
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

import database as db

# ── Category map ──────────────────────────────────────────────────────────────

SERVICE_CATEGORY_MAP = {
    "dental":           ["dentist", "dental", "teeth", "root canal", "orthodont", "braces", "tooth"],
    "legal":            ["lawyer", "advocate", "legal", "attorney", "law firm", "court case", "vakeel"],
    "interior_design":  ["interior", "home decor", "renovation", "false ceiling", "modular kitchen", "interior designer"],
    "it_software":      ["software", "app development", "website", "mobile app", "web developer", "IT company"],
    "real_estate":      ["flat", "apartment", "house", "property", "2bhk", "3bhk", "rent", "buy home", "pg"],
    "ca_finance":       ["ca firm", "tax", "gst", "audit", "chartered accountant", "itr filing", "income tax"],
    "education":        ["coaching", "tuition", "iit", "neet", "spoken english", "classes", "course"],
    "healthcare":       ["doctor", "physician", "hospital", "specialist", "clinic", "treatment", "gynaecologist", "dermatologist"],
    "event_management": ["event", "wedding", "birthday party", "decorator", "catering", "mehendi"],
    "solar":            ["solar panel", "solar installation", "solar energy", "rooftop solar"],
    "pest_control":     ["pest control", "cockroach", "termite", "bed bugs", "mosquito spray"],
    "packers_movers":   ["shifting", "moving", "packers", "movers", "relocation", "transport"],
}

# Sulekha URL slugs per category
SULEKHA_SLUGS = {
    "dental":           "dentists",
    "legal":            "lawyers-advocates",
    "interior_design":  "interior-designers-decorators",
    "it_software":      "web-designers-developers",
    "real_estate":      "real-estate-agents",
    "ca_finance":       "chartered-accountants",
    "education":        "tutors-coaching-classes",
    "healthcare":       "doctors",
    "event_management": "event-management-companies",
    "solar":            "solar-panel-dealers",
    "pest_control":     "pest-control-services",
    "packers_movers":   "packers-and-movers",
}

# DuckDuckGo search queries per category
DDG_QUERIES = {
    "dental":           ["need dentist hyderabad", "looking for dental clinic hyderabad", "good dentist near me hyderabad"],
    "legal":            ["need lawyer hyderabad", "looking for advocate hyderabad", "legal help hyderabad"],
    "interior_design":  ["need interior designer hyderabad", "home renovation hyderabad", "looking for interior designer hyderabad budget"],
    "it_software":      ["need web developer hyderabad", "looking for software company hyderabad", "app development hyderabad"],
    "real_estate":      ["looking for flat hyderabad", "2bhk rent hyderabad", "property for sale hyderabad"],
    "ca_finance":       ["need ca hyderabad", "gst filing hyderabad", "looking for chartered accountant hyderabad"],
    "education":        ["need tuition hyderabad", "coaching classes hyderabad", "looking for tutor hyderabad"],
    "healthcare":       ["need doctor hyderabad", "good hospital hyderabad", "specialist doctor hyderabad"],
    "event_management": ["need event planner hyderabad", "wedding organizer hyderabad", "birthday party hyderabad"],
    "solar":            ["solar installation hyderabad", "rooftop solar hyderabad", "solar panels hyderabad"],
    "pest_control":     ["pest control hyderabad", "termite treatment hyderabad"],
    "packers_movers":   ["packers movers hyderabad", "home shifting hyderabad"],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

HYDERABAD_AREAS = [
    "banjara hills", "jubilee hills", "madhapur", "gachibowli", "hitech city",
    "kondapur", "kukatpally", "miyapur", "ameerpet", "sr nagar", "begumpet",
    "secunderabad", "lb nagar", "dilsukhnagar", "mehdipatnam", "tolichowki",
    "manikonda", "financial district", "nanakramguda", "raidurg", "uppal",
    "kompally", "alwal", "shamirpet", "bachupally", "nizampet", "bowenpally",
    "tarnaka", "nacharam", "malakpet", "nampally", "abids", "somajiguda",
]


def normalize_phone(raw: str) -> str:
    if not raw:
        return ""
    digits = re.sub(r"[^\d]", "", raw)
    if len(digits) == 10:
        return "+91" + digits
    if len(digits) == 11 and digits.startswith("0"):
        return "+91" + digits[1:]
    if len(digits) == 12 and digits.startswith("91"):
        return "+" + digits
    return raw.strip()


def detect_area(text: str) -> str:
    text_lower = text.lower()
    for area in HYDERABAD_AREAS:
        if area in text_lower:
            return area.title()
    return ""


def infer_category(text: str) -> str:
    text_lower = text.lower()
    for cat, keywords in SERVICE_CATEGORY_MAP.items():
        if any(kw in text_lower for kw in keywords):
            return cat
    return "general"


def score_intent(text: str) -> int:
    """Score 0-100 based on urgency signals in the text."""
    score = 40
    text_lower = text.lower()
    urgency_words = ["urgent", "asap", "immediately", "today", "this week", "emergency", "need now"]
    budget_words  = ["budget", "quote", "price", "cost", "how much", "rate"]
    action_words  = ["looking for", "need", "want", "require", "searching", "recommend"]
    if any(w in text_lower for w in urgency_words):  score += 30
    if any(w in text_lower for w in budget_words):   score += 15
    if any(w in text_lower for w in action_words):   score += 15
    return min(score, 100)


# ── Sulekha scraper ───────────────────────────────────────────────────────────

def scrape_sulekha(category: str, limit: int = 30) -> list[dict]:
    slug = SULEKHA_SLUGS.get(category)
    if not slug:
        return []

    results = []
    url = f"https://www.sulekha.com/{slug}/hyderabad"
    print(f"  [Sulekha] {url}")

    try:
        sess = requests.Session()
        resp = sess.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  [!] Sulekha returned {resp.status_code}")
            return []

        soup = BeautifulSoup(resp.text, "html.parser")

        # Look for requirement/request postings — Sulekha embeds them in the page
        # as "Recent Requests" or "Customer Requirements" sections
        req_sections = soup.find_all(["div", "section"], class_=re.compile(r"requirement|request|customer", re.I))

        for section in req_sections[:limit]:
            text = section.get_text(separator=" ", strip=True)
            if len(text) < 20:
                continue
            area = detect_area(text)
            cat  = infer_category(text) or category
            results.append({
                "buyer_name":       "Anonymous",
                "phone":            "",
                "email":            "",
                "service_needed":   text[:300],
                "service_category": cat,
                "location_mentioned": area,
                "city":             "Hyderabad",
                "source":           "sulekha",
                "source_url":       url,
                "raw_text":         text[:500],
                "intent_score":     score_intent(text),
            })

        # Also parse meta description / structured data for requirements
        # Sulekha sometimes lists recent service requests in JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                import json
                data = json.loads(script.string or "")
                if isinstance(data, list):
                    for item in data:
                        desc = item.get("description", "")
                        if desc and any(kw in desc.lower() for kw in SERVICE_CATEGORY_MAP.get(category, [])):
                            area = detect_area(desc)
                            results.append({
                                "buyer_name":       item.get("name", "Anonymous"),
                                "service_needed":   desc[:300],
                                "service_category": category,
                                "location_mentioned": area,
                                "city":             "Hyderabad",
                                "source":           "sulekha",
                                "source_url":       url,
                                "raw_text":         desc[:500],
                                "intent_score":     score_intent(desc),
                            })
            except Exception:
                pass

        time.sleep(random.uniform(2, 4))

    except Exception as e:
        print(f"  [!] Sulekha scrape error: {e}")

    print(f"  [Sulekha] Found {len(results)} requirement(s) for '{category}'")
    return results[:limit]


# ── JustDial scraper ──────────────────────────────────────────────────────────

def scrape_justdial(category: str, limit: int = 30) -> list[dict]:
    """Scrape JustDial listing pages and extract embedded requirement postings."""
    slug_map = {
        "dental":           "dentists",
        "legal":            "lawyers",
        "interior_design":  "interior-designers",
        "it_software":      "software-companies",
        "healthcare":       "doctors",
        "event_management": "event-management",
        "ca_finance":       "chartered-accountants",
        "education":        "coaching-centres",
        "solar":            "solar-energy-equipment",
        "pest_control":     "pest-control",
        "packers_movers":   "packers-and-movers",
    }
    slug = slug_map.get(category)
    if not slug:
        return []

    results = []
    url = f"https://www.justdial.com/Hyderabad/{slug}"
    print(f"  [JustDial] {url}")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                viewport={"width": 1280, "height": 900},
                locale="en-IN",
            )
            page = ctx.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(3000)

            html = page.content()
            soup = BeautifulSoup(html, "html.parser")

            # JustDial embeds customer reviews and requirements in listing cards
            cards = soup.find_all("div", class_=re.compile(r"resultbox|listsec|jdPaidListing", re.I))
            for card in cards[:limit * 2]:
                # Look for "requirements" or customer request text
                req_el = card.find(class_=re.compile(r"review|requirement|feedback", re.I))
                if not req_el:
                    continue
                text = req_el.get_text(separator=" ", strip=True)
                if len(text) < 20:
                    continue
                area = detect_area(text)
                results.append({
                    "buyer_name":       "Anonymous",
                    "service_needed":   text[:300],
                    "service_category": category,
                    "location_mentioned": area,
                    "city":             "Hyderabad",
                    "source":           "justdial",
                    "source_url":       url,
                    "raw_text":         text[:500],
                    "intent_score":     score_intent(text),
                })
                if len(results) >= limit:
                    break

            browser.close()

    except Exception as e:
        print(f"  [!] JustDial scrape error: {e}")

    print(f"  [JustDial] Found {len(results)} requirement(s) for '{category}'")
    return results[:limit]


# ── DuckDuckGo search intent scraper ─────────────────────────────────────────

def scrape_duckduckgo(category: str, limit: int = 20) -> list[dict]:
    """Search DuckDuckGo for people posting about needing services in Hyderabad."""
    queries = DDG_QUERIES.get(category, [])
    if not queries:
        return []

    results = []
    seen_urls: set[str] = set()

    for query in queries[:2]:  # max 2 queries per category to stay polite
        full_query = f"{query} site:quora.com OR site:reddit.com OR site:facebook.com OR site:magicbricks.com OR site:housing.com"
        ddg_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(full_query)}"
        print(f"  [DDG] {query}")

        try:
            resp = requests.get(ddg_url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, "html.parser")

            for result in soup.find_all("div", class_="result"):
                title_el  = result.find("a", class_="result__a")
                snippet_el = result.find("a", class_="result__snippet")
                if not title_el:
                    continue

                title   = title_el.get_text(strip=True)
                snippet = snippet_el.get_text(strip=True) if snippet_el else ""
                href    = title_el.get("href", "")

                if href in seen_urls:
                    continue
                seen_urls.add(href)

                combined = f"{title} {snippet}"
                keywords = SERVICE_CATEGORY_MAP.get(category, [])
                if not any(kw in combined.lower() for kw in keywords):
                    continue

                area = detect_area(combined)
                results.append({
                    "buyer_name":       "Anonymous",
                    "service_needed":   combined[:300],
                    "service_category": category,
                    "location_mentioned": area,
                    "city":             "Hyderabad",
                    "source":           "google_search",
                    "source_url":       href,
                    "raw_text":         combined[:500],
                    "intent_score":     score_intent(combined),
                })
                if len(results) >= limit:
                    break

            time.sleep(random.uniform(3, 5))

        except Exception as e:
            print(f"  [!] DDG error for '{query}': {e}")

    print(f"  [DDG] Found {len(results)} result(s) for '{category}'")
    return results[:limit]


# ── Facebook public groups ────────────────────────────────────────────────────

FACEBOOK_GROUPS = [
    "https://www.facebook.com/groups/hyderabadhomeowners",
    "https://www.facebook.com/groups/HyderabadExpats",
    "https://www.facebook.com/groups/hyderabadfamilies",
    "https://www.facebook.com/groups/HyderabadRecommendations",
    "https://www.facebook.com/groups/hyderabadproperties",
]

def scrape_facebook_groups(category: str, limit: int = 20) -> list[dict]:
    """Scrape public Facebook group posts matching service category."""
    keywords = SERVICE_CATEGORY_MAP.get(category, [])
    results  = []

    print(f"  [Facebook] Searching groups for '{category}'")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                viewport={"width": 1280, "height": 900},
                locale="en-IN",
            )
            page = ctx.new_page()

            for group_url in FACEBOOK_GROUPS[:3]:
                try:
                    page.goto(group_url, wait_until="domcontentloaded", timeout=15000)
                    page.wait_for_timeout(3000)

                    # Facebook often requires login — check if redirected
                    if "login" in page.url or "checkpoint" in page.url:
                        print(f"  [!] Facebook requires login — skipping public group scrape")
                        break

                    # Scroll to load posts
                    for _ in range(3):
                        page.evaluate("window.scrollBy(0, 1000)")
                        page.wait_for_timeout(1500)

                    html = page.content()
                    soup = BeautifulSoup(html, "html.parser")

                    # Find post text elements
                    post_els = soup.find_all("div", attrs={"data-ad-preview": "message"})
                    if not post_els:
                        # Fallback: look for divs with role="article"
                        post_els = soup.find_all("div", role="article")

                    for post in post_els:
                        text = post.get_text(separator=" ", strip=True)
                        if len(text) < 30:
                            continue
                        if not any(kw in text.lower() for kw in keywords):
                            continue
                        area = detect_area(text)
                        # Try to extract name from post
                        name_el = post.find("a", class_=re.compile(r"profileLink|author", re.I))
                        buyer_name = name_el.get_text(strip=True) if name_el else "Facebook User"
                        results.append({
                            "buyer_name":       buyer_name[:50],
                            "service_needed":   text[:300],
                            "service_category": category,
                            "location_mentioned": area,
                            "city":             "Hyderabad",
                            "source":           "facebook_group",
                            "source_url":       group_url,
                            "raw_text":         text[:500],
                            "intent_score":     score_intent(text) + 10,  # FB posts = higher intent
                        })
                        if len(results) >= limit:
                            break

                except PWTimeout:
                    print(f"  [!] Facebook group timeout: {group_url}")
                    continue

                time.sleep(random.uniform(3, 6))
                if len(results) >= limit:
                    break

            browser.close()

    except Exception as e:
        print(f"  [!] Facebook scrape error: {e}")

    print(f"  [Facebook] Found {len(results)} post(s) for '{category}'")
    return results[:limit]


# ── Main orchestrator ─────────────────────────────────────────────────────────

SOURCES = {
    "sulekha":   scrape_sulekha,
    "justdial":  scrape_justdial,
    "duckduckgo": scrape_duckduckgo,
    "facebook":  scrape_facebook_groups,
}

def run(sources: list[str] | None = None, categories: list[str] | None = None, limit: int = 30) -> int:
    sources    = sources    or list(SOURCES.keys())
    categories = categories or list(SERVICE_CATEGORY_MAP.keys())
    total_new  = 0

    print(f"\n{'='*55}")
    print(f"  Buyer Scraper — {datetime.now().strftime('%d %b %Y %H:%M')}")
    print(f"  Sources: {', '.join(sources)}")
    print(f"  Categories: {', '.join(categories)}")
    print(f"{'='*55}\n")

    for source_name in sources:
        scrape_fn = SOURCES.get(source_name)
        if not scrape_fn:
            continue
        for cat in categories:
            print(f"\n[{source_name.upper()}] {cat}")
            try:
                leads = scrape_fn(cat, limit=limit)
                added = 0
                for lead in leads:
                    lead_id = db.upsert_buyer_lead(lead)
                    if lead_id:
                        added += 1
                total_new += added
                print(f"  → {added} new lead(s) saved (of {len(leads)} scraped)")
            except Exception as e:
                print(f"  [!] Error in {source_name}/{cat}: {e}")
            time.sleep(random.uniform(1, 3))

    counts = db.buyer_counts()
    print(f"\n{'='*55}")
    print(f"✓ Done. {total_new} new buyer lead(s) added.")
    print(f"  Total in DB: {counts['total_buyer_leads']} | New: {counts['new']} | Delivered: {counts['delivered']}")
    return total_new


def main():
    parser = argparse.ArgumentParser(description="Scrape buyer intent signals")
    parser.add_argument("--source",   "-s", default="", help=f"Source: {','.join(SOURCES.keys())}")
    parser.add_argument("--category", "-c", default="", help=f"Category: {','.join(SERVICE_CATEGORY_MAP.keys())}")
    parser.add_argument("--limit",    "-l", type=int, default=30)
    args = parser.parse_args()

    sources    = [args.source]    if args.source    else None
    categories = [args.category]  if args.category  else None
    run(sources=sources, categories=categories, limit=args.limit)


if __name__ == "__main__":
    main()
