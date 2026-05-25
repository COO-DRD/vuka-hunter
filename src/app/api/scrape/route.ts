import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { PROTOCOL, PROTOCOL_CITIES, applyProtocol } from "@/lib/protocol";

export const maxDuration = 300;

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
].join(",");

interface PlacesResult {
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  google_maps_url: string | null;
  org_id?: string;
  scrape_job_id?: string;
  vertical?: string;
  city?: string;
  imported_by?: string;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vertical, city, count = 100, source = "google_places" } = await req.json();
  if (!vertical || !city) return NextResponse.json({ error: "vertical and city required" }, { status: 400 });

  const vp = PROTOCOL[vertical];
  if (!vp) return NextResponse.json({ error: `"${vertical}" is not an approved vertical` }, { status: 400 });

  const approvedCity = PROTOCOL_CITIES.find((c) => c.value === city);
  if (!approvedCity) return NextResponse.json({ error: `"${city}" is not an approved city` }, { status: 400 });

  if (!process.env.GOOGLE_PLACES_API_KEY && source !== "osm") {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY not configured" }, { status: 500 });
  }

  const db = createSupabaseServiceClient();
  await db.from("hunter_orgs").upsert(
    { id: user.id, name: "My Workspace" },
    { onConflict: "id", ignoreDuplicates: true }
  );

  const { data: job, error } = await db
    .from("hunter_scrape_jobs")
    .insert({ org_id: user.id, vertical, city, count, source, status: "queued" })
    .select("id")
    .single();

  if (error || !job) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

  // Run after response is returned (Vercel keeps function alive for background work)
  after(async () => {
    await runScrapeJob(job.id, user.id, vertical, city, count, source, vp.placeQuery);
  });

  return NextResponse.json({ jobId: job.id });
}

async function scrapeGooglePlaces(
  query: string,
  city: string,
  maxCount: number,
): Promise<PlacesResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY!;
  const fullQuery = `${query} in ${city}, Kenya`;
  const results: PlacesResult[] = [];
  let pageToken: string | undefined;

  while (results.length < maxCount) {
    const body: Record<string, unknown> = { textQuery: fullQuery, pageSize: 20 };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Places API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const places = data.places ?? [];
    if (!places.length) break;

    for (const p of places) {
      if (results.length >= maxCount) break;
      results.push({
        name:                p.displayName?.text ?? "",
        phone:               p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
        email:               null,
        website:             p.websiteUri ?? null,
        address:             p.formattedAddress ?? null,
        google_rating:       p.rating ?? null,
        google_review_count: p.userRatingCount ?? null,
        google_maps_url:     p.googleMapsUri ?? null,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;

    // Respect Places API rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}

async function scrapeOSM(
  query: string,
  city: string,
  maxCount: number,
): Promise<PlacesResult[]> {
  // Use Nominatim to get city bbox, then Overpass for amenities
  const nomRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
    { headers: { "User-Agent": "Dullu Digital-Hunter/1.0 (contact@dulludigital.com)" } }
  );
  const nomData = await nomRes.json();
  if (!nomData.length) throw new Error(`City not found in OSM: ${city}`);

  const { boundingbox } = nomData[0];
  const [s, n, w, e] = boundingbox;

  // Map query to OSM amenity tags (simplified)
  const amenityMap: Record<string, string> = {
    "private dental clinic": "dentist",
    "private medical clinic": "clinic",
    "hotel": "hotel",
    "law firm": "lawyer",
    "gym fitness studio": "fitness_centre",
    "restaurant": "restaurant",
  };
  const amenity = amenityMap[query] ?? "office";

  const overpassQuery = `
    [out:json][timeout:30];
    (
      node["amenity"="${amenity}"](${s},${w},${n},${e});
      way["amenity"="${amenity}"](${s},${w},${n},${e});
    );
    out body ${maxCount};
  `;

  const ovRes = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: overpassQuery,
    headers: { "Content-Type": "text/plain" },
  });
  const ovData = await ovRes.json();
  const elements = ovData.elements ?? [];

  return elements.slice(0, maxCount).map((el: Record<string, Record<string, string>>) => ({
    name:                el.tags?.name ?? "",
    phone:               el.tags?.phone ?? el.tags?.["contact:phone"] ?? null,
    email:               el.tags?.email ?? el.tags?.["contact:email"] ?? null,
    website:             el.tags?.website ?? el.tags?.["contact:website"] ?? null,
    address:             el.tags?.["addr:full"] ?? el.tags?.["addr:street"] ?? null,
    google_rating:       null,
    google_review_count: null,
    google_maps_url:     null,
  })).filter((r: PlacesResult) => r.name);
}

async function runScrapeJob(
  jobId: string,
  orgId: string,
  vertical: string,
  city: string,
  count: number,
  source: string,
  placeQuery: string,
) {
  const db = createSupabaseServiceClient();
  await db
    .from("hunter_scrape_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    const raw =
      source === "osm"
        ? await scrapeOSM(placeQuery, city, count)
        : await scrapeGooglePlaces(placeQuery, city, count);

    const withMeta = raw.filter((r) => r.name).map((r) => ({
      ...r,
      org_id:        orgId,
      scrape_job_id: jobId,
      vertical,
      city,
      imported_by:   "scraper",
    }));

    const { accepted, rejected } = applyProtocol(withMeta);
    if (rejected.length) {
      console.log(
        `[Hunter] Protocol filtered ${rejected.length}/${withMeta.length} leads from job ${jobId}:`,
        rejected.slice(0, 5).map((r) => `${r.lead.name}: ${r.reason}`)
      );
    }

    // Update progress as we go
    await db.from("hunter_scrape_jobs")
      .update({ progress: raw.length, total: count })
      .eq("id", jobId);

    let imported = 0;
    for (let i = 0; i < accepted.length; i += 100) {
      const { data } = await db
        .from("hunter_leads")
        .upsert(accepted.slice(i, i + 100), { onConflict: "org_id,name", ignoreDuplicates: true })
        .select("id");
      imported += data?.length ?? 0;
    }

    await db.from("hunter_scrape_jobs").update({
      status:      "done",
      progress:    imported,
      total:       imported,
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);

  } catch (err) {
    console.error("[Hunter] Scrape job error:", err);
    await db.from("hunter_scrape_jobs").update({
      status:      "error",
      error:       String(err),
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
  }
}
