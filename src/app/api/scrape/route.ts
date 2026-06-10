import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId, checkOrgAccess, ACCESS_DENIED } from "@/lib/auth";
import { getOrgId } from "@/lib/session";
import { checkScrapeLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { PROTOCOL, PROTOCOL_CITIES } from "@/lib/protocol";
import { runScrapeJob, type OrgProfile } from "@/lib/scrapeJob";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { orgId, isAnon } = await getOrgId();

  // eslint-disable-next-line prefer-const
  let access: Awaited<ReturnType<typeof checkOrgAccess>> | null = null;

  if (isAnon) {
    // ── Free-tier rate limit ─────────────────────────────────────────────
    const limit = await checkScrapeLimit(orgId);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Free limit reached", detail: `${limit.limit} scrape jobs per hour on the free tier. Sign up for unlimited.`, remaining: 0 },
        { status: 429 }
      );
    }
  } else {
    // ── Trial / subscription gate (authenticated users only) ────────────
    access = await checkOrgAccess(orgId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: ACCESS_DENIED[access.reason!], reason: access.reason, upgradeUrl: "/upgrade" },
        { status: 402 }
      );
    }
  }

  const {
    vertical, city,
    count = 100,
    source = "google_places",
    minRatingOverride,
    minReviewsOverride,
    requireWebsite,
    requirePhone,
    nameInclude,
    nameExclude,
  } = await req.json();
  if (!vertical || !city) return NextResponse.json({ error: "vertical and city required" }, { status: 400 });

  const vp = PROTOCOL[vertical];
  if (!vp) return NextResponse.json({ error: `"${vertical}" is not an approved vertical` }, { status: 400 });

  const overrides: import("@/lib/protocol").ProtocolOverrides = {};
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
  if (requireWebsite === true)                              overrides.requireWebsite = true;
  if (requirePhone   === true)                              overrides.requirePhone   = true;
  if (typeof nameInclude === "string" && nameInclude.trim()) overrides.nameInclude   = nameInclude.trim().slice(0, 60);
  if (typeof nameExclude === "string" && nameExclude.trim()) overrides.nameExclude   = nameExclude.trim().slice(0, 60);

  const approvedCity = PROTOCOL_CITIES.find((c) => c.value === city);
  if (!approvedCity) return NextResponse.json({ error: `"${city}" is not an approved city` }, { status: 400 });

  // ── Trial lead ceiling (authenticated users only) ───────────────────────
  if (!isAnon && access?.isTrialing) {
    const db2 = createSupabaseServiceClient();
    const { count: currentLeads } = await db2
      .from("hunter_leads")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);
    if ((currentLeads ?? 0) >= (access?.trialLeadLimit ?? 0)) {
      return NextResponse.json({
        error:      `Free trial limit: you can store up to ${access?.trialLeadLimit} leads. Upgrade to remove this cap.`,
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
  if (!isAnon && access && smartFilterPlans.includes(access.plan)) {
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
