#!/usr/bin/env python3
"""
VUKA Hunter — Google Places lead scraper
Usage:
  python3 scrape_places.py "real estate agency" "Nairobi" --count 100
  python3 scrape_places.py "dental clinic" "Mombasa" --count 60 --out leads_dental.csv
  python3 scrape_places.py "logistics company" "Nairobi" --count 80 --import

Requires GOOGLE_PLACES_API_KEY in hunter/.env (same key as GOOGLE_PLACES_API_KEY on Vercel).
Get one: console.cloud.google.com → enable "Places API (New)" → Credentials.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY")
SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.googleMapsUri",
    "places.types",
    "nextPageToken",
])

CSV_HEADERS = ["name", "phone", "email", "website", "address",
               "google_rating", "google_review_count", "google_maps_url"]


def search_page(query: str, page_token: str | None = None) -> dict:
    body: dict = {"textQuery": query, "pageSize": 20}
    if page_token:
        body["pageToken"] = page_token

    r = httpx.post(
        SEARCH_URL,
        headers={
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": FIELD_MASK,
            "Content-Type": "application/json",
            "Referer": "https://digital.dullugroup.co.ke",
            "Origin": "https://digital.dullugroup.co.ke",
        },
        json=body,
        timeout=20,
    )
    r.raise_for_status()
    return r.json()


def place_to_row(p: dict) -> dict:
    phone = p.get("nationalPhoneNumber") or p.get("internationalPhoneNumber") or ""
    return {
        "name":                p.get("displayName", {}).get("text", ""),
        "phone":               phone,
        "email":               "",
        "website":             p.get("websiteUri", ""),
        "address":             p.get("formattedAddress", ""),
        "google_rating":       str(p.get("rating", "")),
        "google_review_count": str(p.get("userRatingCount", "")),
        "google_maps_url":     p.get("googleMapsUri", ""),
    }


def scrape(query: str, count: int) -> list[dict]:
    if not API_KEY:
        sys.exit(
            "ERROR: GOOGLE_PLACES_API_KEY not set.\n"
            "Add it to hunter/.env  →  GOOGLE_PLACES_API_KEY=AIza...\n"
            "Get one: console.cloud.google.com → enable 'Places API (New)' → Credentials."
        )

    rows: list[dict] = []
    token: str | None = None
    page = 0

    print(f"Searching: '{query}' …")
    while len(rows) < count:
        try:
            data = search_page(query, token)
        except httpx.HTTPStatusError as e:
            sys.exit(f"API error: {e.response.status_code} — {e.response.text}")

        places = data.get("places", [])
        if not places:
            break

        for p in places:
            if len(rows) >= count:
                break
            rows.append(place_to_row(p))

        token = data.get("nextPageToken")
        page += 1
        print(f"  page {page}: +{len(places)} results ({len(rows)} total)")

        if not token:
            break
        time.sleep(0.3)  # be polite

    return rows


def write_csv(rows: list[dict], path: str) -> str:
    out = Path(path)
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        w.writeheader()
        w.writerows(rows)
    return str(out.resolve())


def import_to_db(rows: list[dict], vertical: str, city: str) -> None:
    """Pipe directly into Hunter DB — same logic as import_csv.py."""
    # Write temp CSV then call import_csv
    tmp = Path(__file__).parent / "_tmp_scrape.csv"
    write_csv(rows, str(tmp))
    import subprocess
    cmd = ["python3", str(Path(__file__).parent / "import_csv.py"),
           str(tmp), "--vertical", vertical, "--city", city]
    print(f"\nImporting into Supabase …")
    subprocess.run(cmd, check=True)
    tmp.unlink(missing_ok=True)


def main() -> None:
    ap = argparse.ArgumentParser(description="Scrape Google Places → CSV for VUKA Hunter")
    ap.add_argument("query",    help='Search query e.g. "real estate agency"')
    ap.add_argument("location", help='City / region e.g. "Nairobi"')
    ap.add_argument("--count",    type=int, default=100, help="Max results (default 100)")
    ap.add_argument("--out",      default="",            help="Output CSV filename (auto-named if omitted)")
    ap.add_argument("--vertical", default="",            help="Vertical tag for Hunter (e.g. real_estate)")
    ap.add_argument("--import",   dest="do_import", action="store_true",
                    help="Also import directly into Supabase after scraping")
    args = ap.parse_args()

    full_query = f"{args.query} in {args.location}"
    rows = scrape(full_query, args.count)

    if not rows:
        print("No results found. Try a broader query.")
        return

    # Output filename
    slug = full_query.lower().replace(" ", "_").replace("/", "-")[:60]
    out_path = args.out or f"leads_{slug}.csv"
    written = write_csv(rows, out_path)
    print(f"\n✓ {len(rows)} leads → {written}")
    print(f"\nNext steps:")
    print(f"  python3 import_csv.py {out_path} --vertical {args.vertical or 'VERTICAL'} --city {args.location}")
    print(f"  python3 run_enrichment.py --limit 50")
    print(f"  python3 run_scoring.py --limit 30 --min-rule-score 30")

    if args.do_import:
        vertical = args.vertical or args.query.lower().replace(" ", "_")
        import_to_db(rows, vertical, args.location)
        print(f"\nDone. Open /admin/hunter to fire.")


if __name__ == "__main__":
    main()
