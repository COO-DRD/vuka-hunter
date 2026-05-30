import { NextRequest, NextResponse } from "next/server";
import { getUser, resolveOrgId } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const VALID_PLANS = ["solo", "starter", "growth", "enterprise"];

function genRef(): string {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `4U-${n}`;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to request an upgrade." }, { status: 401 });

  let body: { plan?: string; phone?: string; note?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const { plan, phone, note } = body;

  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Select a valid plan." }, { status: 400 });
  }

  const orgId = await resolveOrgId(user.id);
  const db    = createSupabaseServiceClient();

  // One pending request per org at a time
  const { data: existing } = await db
    .from("hunter_upgrade_requests")
    .select("ref_number, created_at")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok:         true,
      ref_number: existing.ref_number,
      duplicate:  true,
    });
  }

  let ref = genRef();
  // Retry once on collision (astronomically unlikely but correct)
  const { data: conflict } = await db
    .from("hunter_upgrade_requests")
    .select("id")
    .eq("ref_number", ref)
    .maybeSingle();
  if (conflict) ref = genRef();

  const { error } = await db.from("hunter_upgrade_requests").insert({
    org_id:     orgId,
    plan,
    email:      user.email ?? "",
    phone:      phone?.trim() || null,
    note:       note?.trim() || null,
    ref_number: ref,
  });

  if (error) {
    return NextResponse.json({ error: "Could not submit request. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ref_number: ref });
}
