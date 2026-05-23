import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

function formatPhone(raw: string): string {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, "");
  // Kenya: 07xx → 2547xx, already 254xxx stays
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.startsWith("254"))                        return digits;
  if (digits.startsWith("7") && digits.length === 9)  return "254" + digits;
  return digits;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, channel, message, subject } = await req.json();
  if (!leadId || !channel) return NextResponse.json({ error: "leadId and channel required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const { data: lead } = await db
    .from("hunter_leads")
    .select("id, phone, email, stage")
    .eq("id", leadId)
    .eq("org_id", user.id)
    .single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Log the outreach
  await db.from("hunter_outreach_log").insert({
    org_id:  user.id,
    lead_id: leadId,
    channel,
    message,
    sent_by: user.id,
  });

  // Advance stage to "contacted" if still new
  if (lead.stage === "new") {
    await db.from("hunter_leads")
      .update({ stage: "contacted", last_contacted_at: new Date().toISOString() })
      .eq("id", leadId);
  }

  // Build the deep-link URL
  let actionUrl: string | null = null;

  if (channel === "whatsapp" && lead.phone) {
    const phone = formatPhone(lead.phone);
    actionUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message ?? "")}`;
  }

  if (channel === "email" && lead.email) {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (message) params.set("body", message);
    actionUrl = `mailto:${lead.email}?${params.toString()}`;
  }

  return NextResponse.json({ ok: true, actionUrl, stage: "contacted" });
}
