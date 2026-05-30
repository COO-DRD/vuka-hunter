import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId } from "@/lib/auth";
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

  const orgId = await resolveOrgId(user.id);
  const db = createSupabaseServiceClient();
  await db.from("hunter_orgs").upsert({
    id:                  orgId,
    name:                businessName.trim(),
    business_name:       businessName.trim(),
    sender_name:         senderName.trim(),
    use_case:            useCase,
    org_description:     orgDescription?.trim() ?? null,
    target_description:  targetDescription?.trim() ?? null,
    priority_signals:    prioritySignals ?? [],
    outreach_channel:    outreachChannel ?? "whatsapp",
    onboarding_complete: true,
    plan:                "beta",
    credits_total:       999999,
  }, { onConflict: "id" });

  return NextResponse.json({ ok: true });
}
