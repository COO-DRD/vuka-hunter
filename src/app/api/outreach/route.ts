import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.startsWith("254"))                        return digits;
  if (digits.startsWith("7") && digits.length === 9)  return "254" + digits;
  return digits;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await resolveOrgId(user.id);

  const body = await req.json().catch(() => ({}));
  const { leadId, channel, message, subject } = body as Record<string, unknown>;
  if (!leadId || !channel) return NextResponse.json({ error: "leadId and channel required" }, { status: 400 });
  if (typeof message === "string" && message.length > 4000) {
    return NextResponse.json({ error: "Message too long (max 4000 chars)" }, { status: 400 });
  }
  if (typeof subject === "string" && subject.length > 200) {
    return NextResponse.json({ error: "Subject too long (max 200 chars)" }, { status: 400 });
  }

  const db = createSupabaseServiceClient();
  const { data: lead } = await db
    .from("hunter_leads")
    .select("id, phone, email, stage")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Track which member sent this
  await db.from("hunter_outreach_log").insert({
    org_id:          orgId,
    lead_id:         leadId,
    channel,
    message:         typeof message === "string" ? message : null,
    sent_by_user_id: user.id,
  });

  if (lead.stage === "new") {
    await db.from("hunter_leads")
      .update({ stage: "contacted", last_contacted_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("org_id", orgId);
  }

  let actionUrl: string | null = null;

  const messageStr = typeof message === "string" ? message : "";
  const subjectStr = typeof subject === "string" ? subject : "";

  if (channel === "whatsapp" && lead.phone) {
    const phone = formatPhone(lead.phone);
    actionUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageStr)}`;
  }

  if (channel === "email" && lead.email) {
    const params = new URLSearchParams();
    if (subjectStr) params.set("subject", subjectStr);
    if (messageStr) params.set("body", messageStr);
    actionUrl = `mailto:${lead.email}?${params.toString()}`;
  }

  return NextResponse.json({ ok: true, actionUrl, stage: "contacted" });
}
