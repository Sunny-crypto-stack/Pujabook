"""
lead_matcher.py — Match buyer leads to active clients and queue deliveries.

Logic:
  - Client's service_category must match buyer_lead's service_category
  - Optionally: buyer's location_mentioned must be in client's coverage_areas
  - One buyer lead is delivered to AT MOST one client per category (first match wins)
  - Skips buyer leads already matched/delivered

Usage:
    python lead_matcher.py            # match all new buyer leads
    python lead_matcher.py --dry-run  # preview without writing
"""

import argparse
import json

import database as db


def areas_overlap(buyer_area: str, client_areas: list[str]) -> bool:
    """Return True if buyer's area is in client's coverage list, or client covers all."""
    if not client_areas or "hyderabad" in [a.lower() for a in client_areas]:
        return True  # client covers all of Hyderabad
    if not buyer_area:
        return True  # no area info = don't filter out
    buyer_lower = buyer_area.lower()
    return any(buyer_lower in a.lower() or a.lower() in buyer_lower for a in client_areas)


def match_all(dry_run: bool = False) -> int:
    new_leads    = db.get_buyer_leads(status="new")
    active_clients = db.get_active_clients()

    if not new_leads:
        print("[i] No new buyer leads to match.")
        return 0
    if not active_clients:
        print("[i] No active clients. Add a client first via the dashboard.")
        return 0

    # Build a lookup: category → list of clients
    client_map: dict[str, list[dict]] = {}
    for c in active_clients:
        cat = c["service_category"]
        client_map.setdefault(cat, []).append(c)

    matched = 0
    for lead in new_leads:
        cat     = lead["service_category"]
        clients = client_map.get(cat, [])

        if not clients:
            continue

        # Pick the best-matching client (first by coverage area, then first in list)
        buyer_area = lead.get("location_mentioned", "")
        target = None
        for c in clients:
            try:
                areas = json.loads(c.get("coverage_areas", '["Hyderabad"]'))
            except Exception:
                areas = ["Hyderabad"]
            if areas_overlap(buyer_area, areas):
                target = c
                break

        if not target:
            continue

        if dry_run:
            print(f"  [DRY] Would match: '{lead['service_needed'][:60]}' → {target['business_name']}")
            matched += 1
            continue

        delivery_id = db.insert_delivery(
            buyer_lead_id = lead["id"],
            client_id     = target["id"],
            price         = target.get("lead_price_inr", 500.0),
            method        = target.get("delivery_method", "email"),
        )
        if delivery_id:
            db.update_buyer_lead_status(lead["id"], "matched")
            matched += 1
            print(f"  [✓] Matched: '{lead['service_needed'][:60]}' → {target['business_name']}")

    print(f"\n{'[DRY] ' if dry_run else ''}Matched {matched} lead(s).")
    return matched


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    match_all(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
