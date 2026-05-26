import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { isSafeUrl, enrichWebsite } from "@/lib/enrichLead";
import { logEvent, logError } from "@/lib/logEvent";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const { data: lead } = await db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", user.id).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!lead.website) {
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId);
    return NextResponse.json({ error: "No website to enrich from" }, { status: 400 });
  }

  if (!isSafeUrl(lead.website)) {
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId);
    return NextResponse.json({ error: "Website URL is not a public address" }, { status: 400 });
  }

  try {
    const enriched = await enrichWebsite(lead.website);
    await db.from("hunter_leads").update({
      enrichment_status: "done",
      enriched_at: new Date().toISOString(),
      emails_found: enriched.emails,
      email: enriched.emails[0] ?? lead.email ?? null,
      tech_stack: enriched.techStack,
      has_booking_system: enriched.hasBookingSystem,
      has_live_chat: enriched.hasLiveChat,
      social_links: enriched.socialLinks,
    }).eq("id", leadId);

    logEvent(user.id, "enrich");
    return NextResponse.json({ ok: true, enriched });
  } catch (err) {
    console.error("[enrich]", err);
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId);
    logError("/api/enrich", String(err), user.id, { leadId });
    return NextResponse.json({ error: "Enrichment failed — please retry" }, { status: 500 });
  }
}
