import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createSupabaseServiceClient();

  // Count first so we can return a meaningful summary
  const [{ count: leadCount }, { count: jobCount }] = await Promise.all([
    db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", user.id),
    db.from("hunter_scrape_jobs").select("*", { count: "exact", head: true }).eq("org_id", user.id),
  ]);

  // Delete leads first (FK: hunter_leads.scrape_job_id → hunter_scrape_jobs.id)
  await db.from("hunter_leads").delete().eq("org_id", user.id);
  await db.from("hunter_scrape_jobs").delete().eq("org_id", user.id);

  // Reset credit counter so it reflects only future usage
  await db.from("hunter_orgs").update({ credits_used: 0 }).eq("id", user.id);

  return NextResponse.json({
    ok: true,
    leadsDeleted: leadCount ?? 0,
    jobsDeleted:  jobCount  ?? 0,
  });
}
