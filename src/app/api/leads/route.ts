import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgId();

  const { searchParams } = req.nextUrl;
  const q        = (searchParams.get("q") ?? "").slice(0, 100);
  const vertical = searchParams.get("vertical") ?? "";
  const stage    = searchParams.get("stage") ?? "";
  const minScore = parseInt(searchParams.get("min_score") ?? "0");
  const limit    = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "200") || 200), 1000);

  const db = createSupabaseServiceClient();
  let query = db
    .from("hunter_leads")
    .select("id,name,vertical,city,phone,email,website,google_rating,google_review_count,score,stage,enrichment_status,created_at")
    .eq("org_id", orgId)
    .order("score", { ascending: false, nullsFirst: false })
    .order("google_rating", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (q)        query = query.ilike("name", `%${q}%`);
  if (vertical) query = query.eq("vertical", vertical);
  if (stage)    query = query.eq("stage", stage);
  if (minScore) query = query.gte("score", minScore);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: data });
}
