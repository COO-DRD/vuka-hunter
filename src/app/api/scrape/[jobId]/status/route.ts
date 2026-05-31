import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await resolveOrgId(user.id);
  const db = createSupabaseServiceClient();
  const { data: job } = await db
    .from("hunter_scrape_jobs")
    .select("id,status,progress,total,error")
    .eq("id", jobId)
    .eq("org_id", orgId)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let leadsFound = 0;
  if (job.status === "done") {
    const { count } = await db.from("hunter_leads")
      .select("*", { count: "exact", head: true })
      .eq("scrape_job_id", jobId);
    leadsFound = count ?? 0;
  }

  return NextResponse.json({ ...job, leadsFound });
}
