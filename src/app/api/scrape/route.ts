import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { PROTOCOL, PROTOCOL_CITIES } from "@/lib/protocol";
import { runScrapeJob } from "@/lib/scrapeJob";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await resolveOrgId(user.id);

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

  after(async () => {
    await runScrapeJob(job.id, orgId, vertical, city, count, source, vp.placeQuery);
  });

  return NextResponse.json({ jobId: job.id });
}
