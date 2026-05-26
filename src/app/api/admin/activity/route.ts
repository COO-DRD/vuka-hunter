import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const ADMIN_EMAILS = new Set(["ian.dullu@akamom.org", "dr.dullu@gmail.com"]);
const STUCK_RUNNING_MS = 10 * 60 * 1000;
const STUCK_QUEUED_MS  =  5 * 60 * 1000;

export async function GET() {
  const user = await getUser();
  if (!user || !ADMIN_EMAILS.has(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db  = createSupabaseServiceClient();
  const now = Date.now();

  const [
    usersRes,
    orgsRes,
    activeJobsRes,
    recentEventsRes,
    recentErrorsRes,
  ] = await Promise.all([
    // auth.users is the source of truth — every signup ends up here
    db.auth.admin.listUsers({ perPage: 500 }),
    db.from("hunter_orgs").select("id,name,credits_used"),
    db.from("hunter_scrape_jobs")
      .select("id,org_id,vertical,city,status,progress,total,started_at,created_at,error")
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false }),
    db.from("hunter_events")
      .select("id,org_id,event_type,created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    db.from("hunter_error_log")
      .select("id,org_id,route,message,context,created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const authUsers = usersRes.data?.users ?? [];
  const orgMap    = new Map((orgsRes.data ?? []).map((o) => [o.id, o]));

  // emailMap keyed by user id (string) for annotating events/jobs
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? "—"]));

  // Per-user usage counts derived from existing tables.
  // Source of truth is auth.users — users without an org row get 0s.
  const userStats = await Promise.all(
    authUsers.map(async (u) => {
      const org = orgMap.get(u.id);
      const [scrapes, enriched, scored, openers] = await Promise.all([
        db.from("hunter_scrape_jobs")
          .select("*", { count: "exact", head: true })
          .eq("org_id", u.id)
          .eq("status", "done"),
        db.from("hunter_leads")
          .select("*", { count: "exact", head: true })
          .eq("org_id", u.id)
          .eq("enrichment_status", "done"),
        db.from("hunter_leads")
          .select("*", { count: "exact", head: true })
          .eq("org_id", u.id)
          .not("score", "is", null),
        db.from("hunter_leads")
          .select("*", { count: "exact", head: true })
          .eq("org_id", u.id)
          .not("opener_generated_at", "is", null),
      ]);
      return {
        orgId:       u.id,
        email:       u.email ?? "—",
        signedUpAt:  u.created_at,
        scrapes:     scrapes.count    ?? 0,
        enrichments: enriched.count   ?? 0,
        scores:      scored.count     ?? 0,
        openers:     openers.count    ?? 0,
        creditsUsed: org?.credits_used ?? 0,
      };
    })
  );

  // Sort by sign-up date descending so newest users appear first
  userStats.sort((a, b) => new Date(b.signedUpAt).getTime() - new Date(a.signedUpAt).getTime());

  // Split active jobs into current vs stuck
  const activeJobs: typeof activeJobsRes.data = [];
  const stuckJobs:  typeof activeJobsRes.data = [];

  for (const job of activeJobsRes.data ?? []) {
    const ref       = job.status === "running" ? job.started_at : job.created_at;
    const threshold = job.status === "running" ? STUCK_RUNNING_MS : STUCK_QUEUED_MS;
    const age       = now - new Date(ref ?? 0).getTime();
    if (age > threshold) stuckJobs.push(job);
    else                 activeJobs.push(job);
  }

  const recentEvents = (recentEventsRes.data ?? []).map((e) => ({
    ...e,
    email: emailMap.get(e.org_id) ?? "—",
  }));
  const recentErrors = (recentErrorsRes.data ?? []).map((e) => ({
    ...e,
    email: e.org_id ? (emailMap.get(e.org_id) ?? "—") : "—",
  }));

  return NextResponse.json({
    userStats,
    activeJobs,
    stuckJobs,
    recentEvents,
    recentErrors,
  });
}
