import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { PROTOCOL } from "@/lib/protocol";
import { runScrapeJob } from "@/lib/scrapeJob";

export const maxDuration = 60;

const ADMIN_EMAILS    = new Set(["ian.dullu@akamom.org", "dr.dullu@gmail.com"]);
const STUCK_RUNNING_MS = 10 * 60 * 1000;
const STUCK_QUEUED_MS  =  5 * 60 * 1000;

export async function POST() {
  const user = await getUser();
  if (!user || !ADMIN_EMAILS.has(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db  = createSupabaseServiceClient();
  const now = Date.now();

  const { data: candidates } = await db
    .from("hunter_scrape_jobs")
    .select("*")
    .in("status", ["queued", "running"]);

  const stuck = (candidates ?? []).filter((job) => {
    const ref       = job.status === "running" ? job.started_at : job.created_at;
    const threshold = job.status === "running" ? STUCK_RUNNING_MS : STUCK_QUEUED_MS;
    return now - new Date(ref ?? 0).getTime() > threshold;
  });

  if (!stuck.length) {
    return NextResponse.json({ healed: 0, message: "No stuck jobs found" });
  }

  // Mark stuck jobs as error
  await db.from("hunter_scrape_jobs")
    .update({ status: "error", error: "Timed out — auto-healed", finished_at: new Date().toISOString() })
    .in("id", stuck.map((j) => j.id));

  let requeued = 0;
  for (const job of stuck) {
    const vp = PROTOCOL[job.vertical];
    if (!vp) continue;

    const { data: newJob } = await db
      .from("hunter_scrape_jobs")
      .insert({
        org_id:   job.org_id,
        vertical: job.vertical,
        city:     job.city,
        count:    job.count ?? 100,
        source:   job.source ?? "google_places",
        status:   "queued",
      })
      .select("id")
      .single();

    if (newJob) {
      const { id, org_id, vertical, city } = job;
      const count  = job.count  ?? 100;
      const source = job.source ?? "google_places";
      after(async () => {
        await runScrapeJob(newJob.id, org_id, vertical, city, count, source, vp.placeQuery);
      });
      requeued++;
      console.log(`[heal] Re-queued stuck job ${id} → new job ${newJob.id}`);
    }
  }

  return NextResponse.json({ healed: stuck.length, requeued });
}
