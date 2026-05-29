import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { isSafeUrl, enrichWebsite } from "@/lib/enrichLead";
import { logEvent, logError } from "@/lib/logEvent";
import { getMode } from "@/lib/enrichmentModes";
import {
  extractContactsFromAboutPage,
  extractContactsFromInstagramBio,
  mergeContacts,
} from "@/lib/contactExtraction";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const [{ data: lead }, { data: org }] = await Promise.all([
    db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", user.id).single(),
    db.from("hunter_orgs")
      .select("use_case,priority_signals,target_description,org_description,enrichment_mode")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!lead.website) {
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId);
    return NextResponse.json({ error: "No website to enrich from" }, { status: 400 });
  }

  if (!isSafeUrl(lead.website)) {
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId);
    return NextResponse.json({ error: "Website URL is not a public address" }, { status: 400 });
  }

  const mode = getMode((org as Record<string, unknown> | null)?.enrichment_mode as string | undefined);

  try {
    const enriched = await enrichWebsite(lead.website, org ?? undefined);
    await db.from("hunter_leads").update({
      enrichment_status: "done",
      enriched_at: new Date().toISOString(),
      emails_found: enriched.emails,
      email: enriched.emails[0] ?? lead.email ?? null,
      tech_stack: enriched.techStack,
      has_booking_system: enriched.hasBookingSystem,
      has_live_chat: enriched.hasLiveChat,
      social_links: enriched.socialLinks,
      // Pre-scoring signals from HTML — scoring AI will read and refine these
      ...(enriched.customSignals.length > 0 && { pain_signals: enriched.customSignals }),
    }).eq("id", leadId);

    // Extract named contacts from About page and Instagram bio (per-lead enrich only)
    if (process.env.GEMINI_API_KEY) {
      const [aboutContacts, igContacts] = await Promise.all([
        enriched.aboutPageHtml
          ? extractContactsFromAboutPage(enriched.aboutPageHtml, mode)
          : Promise.resolve([]),
        enriched.instagramBio
          ? extractContactsFromInstagramBio(enriched.instagramBio, mode)
          : Promise.resolve([]),
      ]);
      const contacts = mergeContacts(aboutContacts, igContacts);
      if (contacts.length > 0) {
        await db.from("hunter_lead_contacts").delete().eq("lead_id", leadId);
        await db.from("hunter_lead_contacts").insert(
          contacts.map((c) => ({
            lead_id:     leadId,
            org_id:      user.id,
            name:        c.name,
            title:       c.title || null,
            source:      c.source,
            confidence:  c.confidence,
            email:       c.email || null,
            phone:       c.phone || null,
            raw_snippet: c.raw_snippet,
          }))
        );
      }
    }

    logEvent(user.id, "enrich");
    return NextResponse.json({ ok: true, enriched });
  } catch (err) {
    console.error("[enrich]", err);
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId);
    logError("/api/enrich", String(err), user.id, { leadId });
    return NextResponse.json({ error: "Enrichment failed — please retry" }, { status: 500 });
  }
}
