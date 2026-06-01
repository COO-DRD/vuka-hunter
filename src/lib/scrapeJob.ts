import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { applyProtocol, PROTOCOL_CITIES, type ProtocolOverrides } from "@/lib/protocol";
import { geminiComplete } from "@/lib/gemini";
import { logEvent, logError } from "@/lib/logEvent";

export const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
export const FIELD_MASK = [
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

export interface PlacesResult {
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

export function getPlacesApiKey(): string {
  const keys = [
    process.env.GOOGLE_PLACES_API_KEY,
    process.env.GOOGLE_PLACES_API_KEY_2,
    process.env.GOOGLE_PLACES_API_KEY_3,
    process.env.GOOGLE_PLACES_API_KEY_4,
  ].filter(Boolean) as string[];
  if (!keys.length) throw new Error("No GOOGLE_PLACES_API_KEY configured");
  return keys[Math.floor(Math.random() * keys.length)];
}

export async function scrapeGooglePlaces(
  query: string,
  city: string,
  maxCount: number,
  country = "Kenya",
): Promise<PlacesResult[]> {
  const apiKey = getPlacesApiKey();
  const fullQuery = `${query} in ${city}, ${country}`;
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
      const contentType = res.headers.get("content-type") ?? "";
      const err = contentType.includes("json") ? await res.text() : `HTTP ${res.status}`;
      if (res.status === 403) {
        throw new Error(
          `Google Places API key rejected (403). In Google Cloud Console → Credentials → ` +
          `your key → remove HTTP referrer restriction (server-side calls don't need it).`
        );
      }
      throw new Error(`Google Places API error ${res.status}: ${err}`);
    }

    let data: Record<string, unknown>;
    try { data = await res.json(); }
    catch { throw new Error("Google Places API returned unexpected non-JSON response"); }

    const places = (data.places ?? []) as Record<string, unknown>[];
    if (!places.length) break;

    for (const p of places) {
      if (results.length >= maxCount) break;
      const dn = p.displayName as Record<string, string> | undefined;
      results.push({
        name:                dn?.text ?? "",
        phone:               (p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null) as string | null,
        email:               null,
        website:             (p.websiteUri ?? null) as string | null,
        address:             (p.formattedAddress ?? null) as string | null,
        google_rating:       (p.rating ?? null) as number | null,
        google_review_count: (p.userRatingCount ?? null) as number | null,
        google_maps_url:     (p.googleMapsUri ?? null) as string | null,
      });
    }

    pageToken = data.nextPageToken as string | undefined;
    if (!pageToken) break;

    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}

export async function scrapeOSM(
  query: string,
  city: string,
  maxCount: number,
): Promise<PlacesResult[]> {
  const nomRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
    { headers: { "User-Agent": "Dullu Digital-Hunter/1.0 (contact@dulludigital.com)" } }
  );
  const nomData = await nomRes.json();
  if (!nomData.length) throw new Error(`City not found in OSM: ${city}`);

  const { boundingbox } = nomData[0];
  const [s, n, w, e] = boundingbox;

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

export async function scrapeFoursquare(
  query: string,
  city: string,
  maxCount: number,
): Promise<PlacesResult[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) throw new Error("FOURSQUARE_API_KEY not configured. Add it to your environment variables.");

  const results: PlacesResult[] = [];
  let cursor: string | undefined;

  while (results.length < maxCount) {
    const params = new URLSearchParams({
      query:   `${query} ${city} Kenya`,
      limit:   String(Math.min(50, maxCount - results.length)),
      fields:  "fsq_id,name,location,website,tel,rating,stats",
      ...(cursor && { cursor }),
    });

    const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
      headers: { Authorization: apiKey, Accept: "application/json" },
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Foursquare API error ${res.status}: ${msg}`);
    }

    const data = await res.json() as {
      results: Array<{
        name: string;
        location?: { address?: string; locality?: string };
        website?: string;
        tel?: string;
        rating?: number;
        stats?: { total_ratings?: number };
      }>;
      context?: { next_cursor?: string };
    };

    const places = data.results ?? [];
    if (!places.length) break;

    for (const p of places) {
      if (results.length >= maxCount) break;
      const addr = [p.location?.address, p.location?.locality].filter(Boolean).join(", ") || null;
      results.push({
        name:                p.name ?? "",
        phone:               p.tel ?? null,
        email:               null,
        website:             p.website ?? null,
        address:             addr,
        google_rating:       p.rating ? Math.round((p.rating / 2) * 10) / 10 : null,
        google_review_count: p.stats?.total_ratings ?? null,
        google_maps_url:     null,
      });
    }

    cursor = data.context?.next_cursor;
    if (!cursor) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  return results.filter((r) => r.name);
}

const SCRAPE_TIMEOUT_MS = 250_000;
const COMPAT_THRESHOLD  = 45;

export interface OrgProfile {
  org_description?:  string | null;
  target_description?: string | null;
  priority_signals?: string[] | null;
}

// Batch-scores all leads against the org profile in a single Gemini call.
// Returns the set of indices that pass the compatibility threshold.
// Fails open — if Gemini errors, all leads are kept.
async function runCompatFilter(
  leads: Array<PlacesResult & { vertical?: string; city?: string }>,
  profile: OrgProfile,
): Promise<Set<number>> {
  const offer  = profile.org_description?.trim()    ?? "";
  const target = profile.target_description?.trim() ?? "";
  if (!offer && !target) return new Set(leads.map((_, i) => i));

  const signalLine = (profile.priority_signals ?? []).length
    ? `Priority signals: ${(profile.priority_signals as string[]).join(", ")}.`
    : "";

  const leadLines = leads
    .map((l, i) =>
      `${i}: ${l.name} — ${l.vertical ?? "business"}, ${l.city ?? ""}, ` +
      `${l.google_rating ?? "?"}★, ${l.google_review_count ?? 0} reviews, ` +
      `website: ${l.website ? "yes" : "no"}`
    )
    .join("\n");

  const prompt = `You are a B2B lead qualification AI.

SEARCHER PROFILE
What they offer: ${offer}
Who they are looking for: ${target}
${signalLine}

Score each business's compatibility with this searcher 0–100.
0 = completely wrong target, 100 = perfect match.
Base scores only on the data given — no assumptions.

Return ONLY valid JSON, no markdown, no explanation:
{"0": 82, "1": 14, "2": 67}

LEADS (index: name, vertical, city, rating, reviews, website):
${leadLines}`;

  try {
    const raw = await geminiComplete(
      prompt,
      { temperature: 0, maxOutputTokens: 1024, timeoutMs: 30000 },
      "enrich",
    );
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return new Set(leads.map((_, i) => i));

    const scores = JSON.parse(match[0]) as Record<string, number>;
    const passing = new Set<number>();
    for (let i = 0; i < leads.length; i++) {
      const s = scores[String(i)];
      if (s === undefined || s >= COMPAT_THRESHOLD) passing.add(i); // missing = benefit of the doubt
    }
    return passing;
  } catch {
    return new Set(leads.map((_, i) => i)); // never block a scrape on filter failure
  }
}

export async function runScrapeJob(
  jobId: string,
  orgId: string,
  vertical: string,
  city: string,
  count: number,
  source: string,
  placeQuery: string,
  overrides?: ProtocolOverrides,
  orgProfile?: OrgProfile,
) {
  const db      = createSupabaseServiceClient();
  const country = PROTOCOL_CITIES.find((c) => c.value === city)?.country ?? "Kenya";

  await db
    .from("hunter_scrape_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId);

  const timer = setTimeout(async () => {
    await db.from("hunter_scrape_jobs").update({
      status:      "error",
      error:       "Job timed out after 250s",
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
  }, SCRAPE_TIMEOUT_MS);

  try {
    const raw =
      source === "osm"         ? await scrapeOSM(placeQuery, city, count)                    :
      source === "foursquare"  ? await scrapeFoursquare(placeQuery, city, count)              :
      await scrapeGooglePlaces(placeQuery, city, count, country);

    const withMeta = raw.filter((r) => r.name).map((r) => ({
      ...r,
      org_id:        orgId,
      scrape_job_id: jobId,
      vertical,
      city,
      imported_by:   "scraper",
    }));

    const { accepted, rejected } = applyProtocol(withMeta, overrides);
    if (rejected.length) {
      console.log(
        `[Hunter] Protocol filtered ${rejected.length}/${withMeta.length} leads from job ${jobId}:`,
        rejected.slice(0, 5).map((r) => `${r.lead.name}: ${r.reason}`)
      );
    }

    // ── Smart Compatibility Filter (Pro) ────────────────────────────────────
    let toInsert = accepted;
    if (orgProfile && accepted.length > 0) {
      const passing = await runCompatFilter(accepted, orgProfile);
      toInsert = accepted.filter((_, i) => passing.has(i));
      const dropped = accepted.length - toInsert.length;
      if (dropped > 0) {
        console.log(`[Hunter] Smart filter removed ${dropped}/${accepted.length} low-compat leads — job ${jobId}`);
      }
    }

    await db.from("hunter_scrape_jobs")
      .update({ progress: raw.length, total: count })
      .eq("id", jobId);

    let imported = 0;
    for (let i = 0; i < toInsert.length; i += 100) {
      const { data } = await db
        .from("hunter_leads")
        .upsert(toInsert.slice(i, i + 100), { onConflict: "org_id,name", ignoreDuplicates: true })
        .select("id");
      imported += data?.length ?? 0;
    }

    await db.from("hunter_scrape_jobs").update({
      status:      "done",
      progress:    imported,
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);

    if (imported > 0) {
      const [{ data: org }] = await Promise.all([
        db.from("hunter_orgs").select("credits_used").eq("id", orgId).single(),
        db.from("hunter_credit_transactions").insert({
          org_id: orgId,
          delta:  -imported,
          reason: `scrape:${vertical}:${city}`,
        }),
      ]);
      await db.from("hunter_orgs")
        .update({ credits_used: (org?.credits_used ?? 0) + imported })
        .eq("id", orgId);
    }

    logEvent(orgId, "scrape");
  } catch (err) {
    console.error("[Hunter] Scrape job error:", err);
    const msg = String(err);
    await db.from("hunter_scrape_jobs").update({
      status:      "error",
      error:       msg,
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
    logError("/api/scrape", msg, orgId, { jobId });
  } finally {
    clearTimeout(timer);
  }
}
