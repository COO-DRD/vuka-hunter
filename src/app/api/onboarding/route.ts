import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { NextRequest, NextResponse } from "next/server";

const TEMPLATE_WELCOME = process.env.WHATSAPP_TEMPLATE_WELCOME ?? "hunter_welcome";

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
    whatsappNumber,
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

  const normalizedPhone = whatsappNumber?.replace(/\s+/g, "").trim() || null;

  const profileFields: Record<string, unknown> = {
    name:                businessName.trim(),
    business_name:       businessName.trim(),
    sender_name:         senderName.trim(),
    use_case:            useCase,
    org_description:     orgDescription?.trim() ?? null,
    target_description:  targetDescription?.trim() ?? null,
    priority_signals:    prioritySignals ?? [],
    outreach_channel:    outreachChannel ?? "whatsapp",
    onboarding_complete: true,
    whatsapp_number:     normalizedPhone,
    ...(normalizedPhone ? { whatsapp_onboarded_at: new Date().toISOString() } : {}),
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

  // Fire Day 1 WhatsApp welcome — non-blocking, swallow errors
  if (normalizedPhone) {
    const firstName = senderName.trim().split(" ")[0];
    void sendWhatsAppTemplate(normalizedPhone, TEMPLATE_WELCOME, [
      { type: "body", parameters: [{ type: "text", text: firstName }] },
    ]).catch((err) => console.error("[onboarding] whatsapp day1 failed:", err));
  }

  return NextResponse.json({ ok: true });
}
