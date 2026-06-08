import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId, checkOrgAccess, ACCESS_DENIED } from "@/lib/auth";
import { getOrgId } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { isSafeUrl, enrichWebsite } from "@/lib/enrichLead";
import { logEvent } from "@/lib/logEvent";

export async function POST(req: NextRequest) {
  const { orgId, isAnon } = await getOrgId();

  if (!isAnon) {
    const access = await checkOrgAccess(orgId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: ACCESS_DENIED[access.reason!], reason: access.reason, upgradeUrl: "/upgrade" },
        { status: 402 }
      );
    }
  }

  const { limit = 50, minRating = 0 } = await req.json().catch(() => ({}));

  const db = createSupabaseServiceClient();

  const [leadsRes, orgRes] = await Promise.all([
    (() => {
      let q = db
        .from("hunter_leads")
        .select("id,website,email,vertical")
        .eq("org_id", orgId)
        .eq("enrichment_status", "pending")
        .not("website", "is", null)
        .limit(limit);
      if (minRating > 0) q = q.gte("google_rating", minRating);
      return q;
    })(),
    db.from("hunter_orgs")
      .select("use_case,priority_signals,target_description,org_description,enrichment_mode")
      .eq("id", orgId)
      .maybeSingle(),
  ]);

  const leads = leadsRes.data;
  const org   = orgRes.data ?? undefined;

  if (!leads?.length) return NextResponse.json({ ok: true, enriched: 0 });

  let enriched = 0;

  for (const lead of leads) {
    if (!lead.website || !isSafeUrl(lead.website)) {
      await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", lead.id);
      continue;
    }
    try {
      const vertical = (lead.vertical as string | null) ?? undefined;
      const result = await enrichWebsite(lead.website, vertical, org);
      const painSignals = [
        ...result.verticalSignals.filter((s) => s.startsWith("gap:")),
        ...result.customSignals,
      ];
      await db.from("hunter_leads").update({
        enrichment_status:   "done",
        enriched_at:         new Date().toISOString(),
        emails_found:        result.emails,
        email:               result.emails[0] ?? lead.email ?? null,
        tech_stack:          result.techStack,
        has_booking_system:  result.hasBookingSystem,
        has_live_chat:       result.hasLiveChat,
        social_links:        result.socialLinks,
        phones_found:        result.phones.length > 0 ? result.phones : null,
        phone_primary:       result.phones[0] ?? null,
        social_profiles:     Object.keys(result.socialProfiles).length > 0 ? result.socialProfiles : null,
        vertical_signals:    result.verticalSignals.length > 0 ? result.verticalSignals : null,
        year_established:    result.yearEstablished ?? null,
        location_count:      result.locationCount,
        staff_signal:        result.staffSignal ?? null,
        certifications:      result.certifications.length > 0 ? result.certifications : null,
        has_online_payment:  result.hasOnlinePayment,
        has_ssl:             result.hasSsl,
        opportunity_score:   result.opportunityScore,
        enrichment_version:  2,
        ...(painSignals.length > 0 && { pain_signals: painSignals }),
      }).eq("id", lead.id);
      enriched++;
    } catch (err) {
      console.error("[enrich/bulk] lead", lead.id, err);
      await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", lead.id);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  if (enriched > 0) logEvent(orgId, "enrich");
  return NextResponse.json({ ok: true, enriched, total: leads.length });
}
