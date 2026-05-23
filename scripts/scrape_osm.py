#!/usr/bin/env python3
"""
Standalone lead scraper — OpenStreetMap Overpass API.
No API key. No signup. Run directly.

Usage:
  python3 scrape_osm.py real_estate Nairobi
  python3 scrape_osm.py dental Nairobi
  python3 scrape_osm.py hotel Nairobi
  python3 scrape_osm.py all Nairobi          # scrape all verticals at once
"""
from __future__ import annotations

import csv
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

VERTICALS: dict[str, dict] = {
    "real_estate": {
        "label": "Real Estate Agency",
        "tags": [
            '["office"="estate_agent"]',
            '["shop"="estate_agent"]',
            '["amenity"="real_estate_agent"]',
        ],
    },
    "dental": {
        "label": "Dental Clinic",
        "tags": [
            '["amenity"="dentist"]',
            '["healthcare"="dentist"]',
        ],
    },
    "hotel": {
        "label": "Hotel / Hospitality",
        "tags": [
            '["tourism"="hotel"]',
            '["tourism"="guest_house"]',
            '["tourism"="hostel"]',
        ],
    },
    "clinic": {
        "label": "Medical Clinic",
        "tags": [
            '["amenity"="clinic"]',
            '["amenity"="doctors"]',
            '["healthcare"="clinic"]',
        ],
    },
    "logistics": {
        "label": "Logistics / Courier",
        "tags": [
            '["office"="logistics"]',
            '["amenity"="courier"]',
            '["shop"="courier"]',
        ],
    },
    "restaurant": {
        "label": "Restaurant / Food",
        "tags": [
            '["amenity"="restaurant"]',
            '["amenity"="fast_food"]',
        ],
    },
    "school": {
        "label": "School / Education",
        "tags": [
            '["amenity"="school"]',
            '["amenity"="college"]',
        ],
    },
}

CITY_AREAS: dict[str, str] = {
    "Nairobi":  '["name"~"Nairobi"]["admin_level"~"4|5|6|7|8"]',
    "Mombasa":  '["name"~"Mombasa"]["admin_level"~"4|5|6|7|8"]',
    "Kisumu":   '["name"~"Kisumu"]["admin_level"~"4|5|6|7|8"]',
    "Nakuru":   '["name"~"Nakuru"]["admin_level"~"4|5|6|7|8"]',
    "Eldoret":  '["name"~"Eldoret"]["admin_level"~"4|5|6|7|8"]',
}


def build_query(tags: list[str], city: str) -> str:
    area_filter = CITY_AREAS.get(city, f'["name"~"{city}"]["admin_level"~"4|5|6|7|8"]')
    unions = []
    for tag in tags:
        unions.append(f'  node{tag}(area.searchArea);')
        unions.append(f'  way{tag}(area.searchArea);')
        unions.append(f'  relation{tag}(area.searchArea);')
    return f"""
[out:json][timeout:90];
area{area_filter}->.searchArea;
(
{chr(10).join(unions)}
);
out body center qt;
""".strip()


def parse_element(el: dict) -> dict | None:
    tags = el.get("tags", {})
    name = tags.get("name") or tags.get("brand") or tags.get("operator")
    if not name:
        return None

    phone = (tags.get("phone") or tags.get("contact:phone") or
             tags.get("mobile") or tags.get("contact:mobile") or "")
    website = (tags.get("website") or tags.get("contact:website") or
               tags.get("url") or "")
    email = (tags.get("email") or tags.get("contact:email") or "")
    city_tag = (tags.get("addr:city") or tags.get("addr:suburb") or "")
    street = (tags.get("addr:street") or "")
    housenumber = (tags.get("addr:housenumber") or "")
    address_parts = [p for p in [housenumber, street, city_tag] if p]
    address = ", ".join(address_parts)

    lat = el.get("lat") or (el.get("center", {}) or {}).get("lat") or ""
    lon = el.get("lon") or (el.get("center", {}) or {}).get("lon") or ""
    maps_url = f"https://www.google.com/maps?q={lat},{lon}" if lat and lon else ""

    return {
        "name": name,
        "phone": phone,
        "email": email,
        "website": website,
        "address": address,
        "google_rating": "",
        "google_review_count": "",
        "google_maps_url": maps_url,
    }


def scrape_vertical(vertical_key: str, city: str) -> list[dict]:
    v = VERTICALS[vertical_key]
    query = build_query(v["tags"], city)

    print(f"  Fetching {v['label']} in {city} …", end=" ", flush=True)
    try:
        r = httpx.post(
            OVERPASS_URL,
            data={"data": query},
            timeout=90,
            headers={"User-Agent": "VUKA-Hunter/1.0 (lead-scraper)"},
        )
        r.raise_for_status()
    except httpx.HTTPError as e:
        print(f"FAILED ({e})")
        return []

    elements = r.json().get("elements", [])
    rows = []
    seen: set[str] = set()
    for el in elements:
        row = parse_element(el)
        if row and row["name"] not in seen:
            seen.add(row["name"])
            rows.append(row)

    print(f"{len(rows)} leads")
    return rows


def main() -> None:
    import argparse
    ap = argparse.ArgumentParser(description="Scrape OpenStreetMap → CSV")
    ap.add_argument("vertical", nargs="?", default="all")
    ap.add_argument("city",     nargs="?", default="Nairobi")
    ap.add_argument("--out",    default="", help="Output CSV path (auto-named if omitted)")
    args = ap.parse_args()

    vertical_arg = args.vertical
    city = args.city

    if vertical_arg == "all":
        keys = list(VERTICALS.keys())
    elif vertical_arg in VERTICALS:
        keys = [vertical_arg]
    else:
        print(f"Unknown vertical '{vertical_arg}'. Choose: {', '.join(VERTICALS)} or 'all'")
        sys.exit(1)

    print(f"\nHunter OSM Scraper — {city}\n{'─'*40}")
    all_rows: list[dict] = []

    for i, key in enumerate(keys):
        rows = scrape_vertical(key, city)
        for r in rows:
            r["vertical"] = VERTICALS[key]["label"]
        all_rows.extend(rows)
        if i < len(keys) - 1:
            time.sleep(1)

    if not all_rows:
        print("\nNo results. Try a different city spelling.")
        return

    # Deduplicate by name
    seen_names: set[str] = set()
    deduped = []
    for r in all_rows:
        if r["name"] not in seen_names:
            seen_names.add(r["name"])
            deduped.append(r)

    # Write CSV
    if args.out:
        out_path = Path(args.out)
    else:
        slug = city.lower()
        if vertical_arg != "all":
            slug = f"{vertical_arg}_{slug}"
        ts = datetime.now().strftime("%Y%m%d_%H%M")
        out_path = Path(__file__).parent.parent / f"leads_{slug}_{ts}.csv"

    fieldnames = ["name", "phone", "email", "website", "address",
                  "google_rating", "google_review_count", "google_maps_url", "vertical"]
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(deduped)

    print(f"\n✓ {len(deduped)} unique leads → {out_path.name}")


if __name__ == "__main__":
    main()
