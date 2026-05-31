import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser, resolveOrgId } from "@/lib/auth";

const VALID_OUTCOMES = ["converted","replied","meeting","no_response","not_interested","wrong_number","wrong_person","bad_lead"] as const;

export async function POST(req: NextRequest) {
  const user  = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const body  = await req.json().catch(() => null);
  if (!body?.leadId || !body?.outcome) {
    return NextResponse.json({ error: "leadId and outcome required" }, { status: 422 });
  }
  if (!VALID_OUTCOMES.includes(body.outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 422 });
  }

  const db = createSupabaseServiceClient();

  // Verify the lead belongs to this org
  const { data: lead } = await db
    .from("hunter_leads")
    .select("id")
    .eq("id", body.leadId)
    .eq("org_id", orgId)
    .single();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Upsert feedback (one row per lead per org — replace if they re-rate)
  const { error } = await db.from("hunter_lead_feedback").upsert({
    lead_id:          body.leadId,
    org_id:           user.id,
    outcome:          body.outcome,
    contact_accurate: body.contactAccurate ?? null,
    data_accurate:    body.dataAccurate    ?? null,
    quality_rating:   body.qualityRating   ?? null,
    note:             body.note?.trim()    || null,
    contacted_at:     body.contactedAt     ?? null,
  }, { onConflict: "lead_id,org_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update last_contacted_at on the lead for quick UI access
  await db.from("hunter_leads")
    .update({ last_contacted_at: body.contactedAt ?? new Date().toISOString() })
    .eq("id", body.leadId)
    .eq("org_id", orgId);

  return NextResponse.json({ ok: true });
}
