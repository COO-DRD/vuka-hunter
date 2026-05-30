import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId, getMemberRole } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await resolveOrgId(user.id);
  const role  = await getMemberRole(user.id, orgId);

  // Only the org admin may bulk-delete all leads
  if (role !== "admin") {
    return NextResponse.json({ error: "Only the organisation admin can clear all leads." }, { status: 403 });
  }

  const db = createSupabaseServiceClient();

  const [{ count: leadCount }, { count: jobCount }] = await Promise.all([
    db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId),
    db.from("hunter_scrape_jobs").select("*", { count: "exact", head: true }).eq("org_id", orgId),
  ]);

  await db.from("hunter_leads").delete().eq("org_id", orgId);
  await db.from("hunter_scrape_jobs").delete().eq("org_id", orgId);
  await db.from("hunter_orgs").update({ credits_used: 0 }).eq("id", orgId);

  return NextResponse.json({
    ok: true,
    leadsDeleted: leadCount ?? 0,
    jobsDeleted:  jobCount  ?? 0,
  });
}
