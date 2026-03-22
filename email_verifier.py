"""
email_verifier.py  —  MX record check + best email selection
Reads status=enriched leads, verifies domain can receive mail, picks best candidate.

Usage:
    python email_verifier.py
    python email_verifier.py --limit 50
"""

import argparse
import json
import re
import time

import dns.resolver
import dns.exception

import database as db

# ── MX check ─────────────────────────────────────────────────────────────────

_mx_cache: dict[str, bool] = {}  # domain → has_mx


def domain_has_mx(domain: str) -> bool:
    """Return True if the domain has at least one MX record."""
    if not domain:
        return False
    if domain in _mx_cache:
        return _mx_cache[domain]

    try:
        answers = dns.resolver.resolve(domain, "MX", lifetime=5)
        result = len(answers) > 0
    except (dns.exception.DNSException, Exception):
        result = False

    _mx_cache[domain] = result
    return result


# ── Candidate ranking ─────────────────────────────────────────────────────────

# Addresses from contact pages are higher quality than guesses.
# We rank by these prefix priorities when all come from guesses.
PREFERRED_PREFIXES = ["info", "contact", "hello", "enquiry", "sales"]

# Patterns that indicate a personal/role address (higher value)
PERSONAL_PATTERN = re.compile(
    r"^(ceo|founder|director|owner|md|manager|head)\b", re.IGNORECASE
)


def score_candidate(email: str, is_real: bool) -> int:
    """
    Higher score = better candidate.
    Real (scraped from page) >> preferred prefix >> generic prefix.
    """
    prefix = email.split("@")[0].lower()
    score = 0
    if is_real:
        score += 1000
    if PERSONAL_PATTERN.match(prefix):
        score += 500
    try:
        score += (len(PREFERRED_PREFIXES) - PREFERRED_PREFIXES.index(prefix)) * 10
    except ValueError:
        pass
    return score


def pick_best_email(candidates: list[str], domain: str) -> str:
    """
    From the candidates list, return the best email on the verified domain.
    Candidates earlier in the list were found on the contact page (real),
    later ones are guesses.
    """
    if not candidates:
        return ""

    # Separate real (from contact page) vs guesses
    # We detect guesses by checking if they're in the standard guess format
    # (the enricher puts real emails first)
    # Simple heuristic: first N candidates whose prefix is NOT in GENERIC_PREFIXES = real
    generic_prefixes = {
        "info", "contact", "hello", "enquiry", "enquiries",
        "sales", "support", "admin", "business", "team",
        "office", "mail", "connect",
    }

    def is_real(email: str) -> bool:
        prefix = email.split("@")[0].lower()
        return prefix not in generic_prefixes

    # Filter to only emails on THIS domain (don't send to gmail.com etc from contact pages)
    on_domain = [e for e in candidates if e.endswith(f"@{domain}")]

    if not on_domain:
        # Fall back to all candidates regardless of domain
        on_domain = candidates

    scored = sorted(on_domain, key=lambda e: score_candidate(e, is_real(e)), reverse=True)
    return scored[0] if scored else ""


# ── Core verifier ─────────────────────────────────────────────────────────────

def verify_lead(lead: dict) -> tuple[str, str]:
    """
    Returns (verified_email, new_status).
    new_status is 'verified' or 'invalid'.
    """
    domain = lead.get("domain", "")
    raw_candidates = lead.get("email_candidates", "[]")

    try:
        candidates: list[str] = json.loads(raw_candidates) if isinstance(raw_candidates, str) else raw_candidates
    except (json.JSONDecodeError, TypeError):
        candidates = []

    if not domain:
        return "", "invalid"

    if not domain_has_mx(domain):
        return "", "invalid"

    best = pick_best_email(candidates, domain)
    if not best:
        # Domain is valid but no candidate — use info@ as a safe fallback
        best = f"info@{domain}"

    return best, "verified"


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MX-verify enriched leads")
    parser.add_argument("--limit", "-l", type=int, default=0,
                        help="Max leads to verify this run (0 = all)")
    args = parser.parse_args()

    leads = db.get_leads_by_status("enriched")
    if args.limit:
        leads = leads[:args.limit]

    if not leads:
        print("[i] No enriched leads to verify.")
        return

    print(f"=== Email Verifier — {len(leads)} lead(s) ===\n")

    verified_count = invalid_count = 0

    for i, lead in enumerate(leads, 1):
        name   = lead["business_name"]
        domain = lead.get("domain", "")

        verified_email, new_status = verify_lead(lead)

        if new_status == "verified":
            verified_count += 1
            print(f"  [{i:02d}] ✓ {name[:35]:<35} → {verified_email}")
        else:
            invalid_count += 1
            print(f"  [{i:02d}] ✗ {name[:35]:<35}   (no MX: {domain or 'no domain'})")

        db.update_lead(lead["id"],
                       verified_email=verified_email,
                       outreach_status=new_status)

        time.sleep(0.1)  # avoid hammering DNS

    counts = db.pipeline_counts()
    print(f"\n✓ Verified: {verified_count}  |  Invalid: {invalid_count}")
    print(f"  DB verified total : {counts['verified']}")
    print(f"  DB invalid  total : {counts['invalid']}")


if __name__ == "__main__":
    main()
