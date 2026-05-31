import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    businessName,
    senderName,
    useCase,
    orgDescription,
    targetDescription,
    prioritySignals,
    outreachChannel,
  } = await req.json();

  if (!businessName?.trim() || !senderName?.trim() || !useCase) {
    return NextResponse.json({ error: "Business name, your name, and role are required." }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  // Look up org by clerk_id — bypasses resolveOrgId so clerk_id is always set on the row
  const { data: existingOrg } = await db
    .from("hunter_orgs")
    .select("id")
    .eq("clerk_id", user.id)
    .maybeSingle();

  const profileFields = {
    name:                businessName.trim(),
    business_name:       businessName.trim(),
    sender_name:         senderName.trim(),
    use_case:            useCase,
    org_description:     orgDescription?.trim() ?? null,
    target_description:  targetDescription?.trim() ?? null,
    priority_signals:    prioritySignals ?? [],
    outreach_channel:    outreachChannel ?? "whatsapp",
    onboarding_complete: true,
  };

  if (existingOrg) {
    await db.from("hunter_orgs").update(profileFields).eq("id", existingOrg.id);
  } else {
    // Webhook hasn't fired yet — create the row with the full profile now
    await db.from("hunter_orgs").insert({
      id:               crypto.randomUUID(),
      clerk_id:         user.id,
      trial_started_at: new Date().toISOString(),
      trial_ends_at:    new Date(Date.now() + 7 * 86400000).toISOString(),
      ...profileFields,
    });
  }

  return NextResponse.json({ ok: true });
}
