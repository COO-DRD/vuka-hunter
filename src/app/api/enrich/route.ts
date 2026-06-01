import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId, checkOrgAccess, ACCESS_DENIED } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { isSafeUrl, enrichWebsite, computeReachabilityScore, getDecisionTitles } from "@/lib/enrichLead";
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

  const orgId = await resolveOrgId(user.id);

  const access = await checkOrgAccess(orgId);
  if (!access.allowed) {
    return NextResponse.json(
      { error: ACCESS_DENIED[access.reason!], reason: access.reason, upgradeUrl: "/upgrade" },
      { status: 402 }
    );
  }

  const { leadId, mode: modeOverride } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const [{ data: lead }, { data: org }] = await Promise.all([
    db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", orgId).single(),
    db.from("hunter_orgs")
      .select("use_case,priority_signals,target_description,org_description,enrichment_mode")
      .eq("id", orgId)
      .maybeSingle(),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!lead.website) {
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId).eq("org_id", orgId);
    return NextResponse.json({ error: "No website to enrich from" }, { status: 400 });
  }

  if (!isSafeUrl(lead.website)) {
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId).eq("org_id", orgId);
    return NextResponse.json({ error: "Website URL is not a public address" }, { status: 400 });
  }

  const mode = getMode(modeOverride ?? (org as Record<string, unknown> | null)?.enrichment_mode as string | undefined);

  try {
    const vertical = (lead.vertical as string | null) ?? undefined;
    const enriched = await enrichWebsite(lead.website, vertical, org ?? undefined);
    const reachabilityScore = computeReachabilityScore(
      enriched.emails,
      enriched.phones,
      enriched.whatsappNumber,
      enriched.socialLinks,
    );

    const painSignals = [
      ...enriched.verticalSignals.filter((s) => s.startsWith("gap:")),
      ...enriched.customSignals,
    ];

    await db.from("hunter_leads").update({
      enrichment_status:       "done",
      enriched_at:             new Date().toISOString(),
      emails_found:            enriched.emails,
      email:                   enriched.emails[0] ?? lead.email ?? null,
      tech_stack:              enriched.techStack,
      has_booking_system:      enriched.hasBookingSystem,
      has_live_chat:           enriched.hasLiveChat,
      social_links:            enriched.socialLinks,
      whatsapp_number:         enriched.whatsappNumber ?? null,
      digital_readiness_score: enriched.digitalReadinessScore,
      reachability_score:      reachabilityScore,
      // v2 fields
      phones_found:            enriched.phones.length > 0 ? enriched.phones : null,
      phone_primary:           enriched.phones[0] ? enriched.phones[0] : null,
      social_profiles:         Object.keys(enriched.socialProfiles).length > 0 ? enriched.socialProfiles : null,
      vertical_signals:        enriched.verticalSignals.length > 0 ? enriched.verticalSignals : null,
      year_established:        enriched.yearEstablished ?? null,
      location_count:          enriched.locationCount,
      staff_signal:            enriched.staffSignal ?? null,
      certifications:          enriched.certifications.length > 0 ? enriched.certifications : null,
      has_online_payment:      enriched.hasOnlinePayment,
      has_ssl:                 enriched.hasSsl,
      opportunity_score:       enriched.opportunityScore,
      enrichment_version:      2,
      ...(painSignals.length > 0 && { pain_signals: painSignals }),
    }).eq("id", leadId).eq("org_id", orgId);

    // Contact extraction is best-effort — Gemini failures must NOT overwrite the
    // "done" status that was already saved above.
    if (process.env.GEMINI_API_KEY) {
      try {
        const vTitles = getDecisionTitles(vertical);
        const [aboutContacts, igContacts] = await Promise.all([
          enriched.aboutPageHtml
            ? extractContactsFromAboutPage(enriched.aboutPageHtml, mode, vTitles)
            : Promise.resolve([]),
          enriched.instagramBio
            ? extractContactsFromInstagramBio(enriched.instagramBio, mode, vTitles)
            : Promise.resolve([]),
        ]);
        const contacts = mergeContacts(aboutContacts, igContacts);
        if (contacts.length > 0) {
          await db.from("hunter_lead_contacts").delete().eq("lead_id", leadId).eq("org_id", orgId);
          await db.from("hunter_lead_contacts").insert(
            contacts.map((c) => ({
              lead_id:     leadId,
              org_id:      orgId,
              name:        c.name,
              title:       c.title || null,
              source:      c.source,
              confidence:  c.confidence,
              email:       c.email || null,
              phone:       c.phone || null,
              raw_snippet: c.raw_snippet,
            }))
          );
          const top = contacts.sort((a, b) => (b.confidence as unknown as number) - (a.confidence as unknown as number))[0];
          if (top?.name) {
            await db.from("hunter_leads").update({
              decision_maker_name:  top.name,
              decision_maker_title: top.title || null,
            }).eq("id", leadId).eq("org_id", orgId);
          }
        }
      } catch (contactErr) {
        console.error("[enrich] contact extraction failed (non-fatal):", contactErr);
      }
    }

    logEvent(orgId, "enrich");
    return NextResponse.json({ ok: true, enriched });
  } catch (err) {
    console.error("[enrich]", err);
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId).eq("org_id", orgId);
    logError("/api/enrich", String(err), orgId, { leadId });
    return NextResponse.json({ error: "Enrichment failed — please retry" }, { status: 500 });
  }
}
