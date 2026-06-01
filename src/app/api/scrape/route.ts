import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId, checkOrgAccess, ACCESS_DENIED } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { PROTOCOL, PROTOCOL_CITIES } from "@/lib/protocol";
import { runScrapeJob, type OrgProfile } from "@/lib/scrapeJob";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await resolveOrgId(user.id);

  // ── Trial / subscription gate ───────────────────────────────────────────
  const access = await checkOrgAccess(orgId);
  if (!access.allowed) {
    return NextResponse.json(
      { error: ACCESS_DENIED[access.reason!], reason: access.reason, upgradeUrl: "/upgrade" },
      { status: 402 }
    );
  }

  const {
    vertical, city,
    count = 100,
    source = "google_places",
    minRatingOverride,
    minReviewsOverride,
  } = await req.json();
  if (!vertical || !city) return NextResponse.json({ error: "vertical and city required" }, { status: 400 });

  const vp = PROTOCOL[vertical];
  if (!vp) return NextResponse.json({ error: `"${vertical}" is not an approved vertical` }, { status: 400 });

  const overrides: { minRating?: number; minReviews?: number } = {};
  if (minRatingOverride !== undefined) {
    const r = parseFloat(minRatingOverride);
    if (isNaN(r) || r < 0 || r > 5) return NextResponse.json({ error: "minRatingOverride must be 0–5" }, { status: 400 });
    overrides.minRating = r;
  }
  if (minReviewsOverride !== undefined) {
    const n = parseInt(minReviewsOverride);
    if (isNaN(n) || n < 0 || n > 500) return NextResponse.json({ error: "minReviewsOverride must be 0–500" }, { status: 400 });
    overrides.minReviews = n;
  }

  const approvedCity = PROTOCOL_CITIES.find((c) => c.value === city);
  if (!approvedCity) return NextResponse.json({ error: `"${city}" is not an approved city` }, { status: 400 });

  // ── Trial lead ceiling ─────────────────────────────────────────────────
  if (access.isTrialing) {
    const db2 = createSupabaseServiceClient();
    const { count: currentLeads } = await db2
      .from("hunter_leads")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);
    if ((currentLeads ?? 0) >= access.trialLeadLimit) {
      return NextResponse.json({
        error:      `Free trial limit: you can store up to ${access.trialLeadLimit} leads. Upgrade to remove this cap.`,
        reason:     "leads_limit",
        upgradeUrl: "/upgrade",
      }, { status: 402 });
    }
  }

  if (source === "google_places" && !process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }
  if (source === "foursquare" && !process.env.FOURSQUARE_API_KEY) {
    return NextResponse.json({ error: "Foursquare API key not configured. Add FOURSQUARE_API_KEY to your environment." }, { status: 500 });
  }

  const db = createSupabaseServiceClient();

  const { count: activeJobs } = await db
    .from("hunter_scrape_jobs")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .in("status", ["queued", "running"]);

  if (activeJobs && activeJobs > 0) {
    return NextResponse.json({ error: "A scrape job is already running. Wait for it to finish." }, { status: 429 });
  }

  const { data: job, error } = await db
    .from("hunter_scrape_jobs")
    .insert({ org_id: orgId, vertical, city, count, source, status: "queued" })
    .select("id")
    .single();

  if (error || !job) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

  // Smart filter — fetch org profile for Pro/Agency/Beta accounts
  let orgProfile: OrgProfile | undefined;
  const smartFilterPlans = ["pro", "agency", "starter", "beta"];
  if (smartFilterPlans.includes(access.plan)) {
    const { data: profile } = await db
      .from("hunter_orgs")
      .select("org_description, target_description, priority_signals")
      .eq("id", orgId)
      .single();
    if (profile?.org_description || profile?.target_description) {
      orgProfile = profile as OrgProfile;
    }
  }

  after(async () => {
    await runScrapeJob(job.id, orgId, vertical, city, count, source, vp.placeQuery,
      Object.keys(overrides).length ? overrides : undefined, orgProfile);
  });

  return NextResponse.json({ jobId: job.id });
}
