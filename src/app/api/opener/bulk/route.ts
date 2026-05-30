import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { geminiComplete } from "@/lib/gemini";
import { logEvent, logError } from "@/lib/logEvent";
import { getMode } from "@/lib/enrichmentModes";

const VERTICAL_PAIN: Record<string, string> = {
  dental:       "Most dental clinics lose 20–30% of appointment slots to no-shows and don't follow up with patients automatically.",
  clinic:       "Clinics typically miss after-hours enquiries and have no automated patient follow-up.",
  hotel:        "Hotels lose direct bookings to OTAs and pay 15–25% commission they don't need to.",
  real_estate:  "Real estate agencies miss leads outside office hours — usually the serious ones.",
  law_firm:     "Law firms rarely follow up on initial enquiries quickly, losing clients to whoever responds first.",
  gym:          "Gyms lose members silently — no automated re-engagement for people who stop showing up.",
  restaurant:   "Restaurants with no online booking system lose reservations to competitors who make it one tap.",
  minimart:     "Dukas lose repeat customers because there's no way to browse stock remotely.",
  insurance:    "Insurance agents spend 60–70% of their week on cold prospecting. The ones closing consistently know who to call before the call.",
  sacco:        "SACCOs lose member interest between AGMs because there's no structured communication channel.",
  bank:         "Branch-led banks are losing SME clients to digital lenders — the gap is speed and visibility.",
  school:       "Schools fill classroom capacity by word of mouth, which caps enrolment.",
  logistics:    "Logistics companies win contracts by responding first with a clear quote.",
  pharmacy:     "Pharmacies compete on price alone — the ones that win own the customer relationship via WhatsApp.",
  salon:        "Salons have no way to re-activate clients who haven't booked in 60+ days.",
  agriculture:  "Agri-businesses miss bulk buyers because their supply is invisible outside their immediate network.",
  accounting:   "Accounting firms lose SME clients at year-end to competitors who market during filing season.",
  consultancy:  "Consultancies grow by referral and stall when the network saturates.",
};

const MAX_LEADS = 20;

function buildPrompt(
  lead: Record<string, unknown>,
  org: Record<string, unknown>,
  mode: { label: string; outreachAngle: string },
): string {
  const senderName = (org.sender_name || org.name || "the team") as string;
  const bizName    = (org.business_name || org.name || "our company") as string;
  const bizDesc    = (org.org_description || "digital growth solutions") as string;
  const targetDesc = (org.target_description || VERTICAL_PAIN[lead.vertical as string] || "Many local businesses miss leads outside office hours.") as string;
  const channel    = (org.outreach_channel || "WhatsApp") as string;

  const pains   = (lead.pain_signals as string[])?.join(", ") ?? "none detected";
  const tech    = (lead.tech_stack  as string[])?.join(", ") ?? "unknown";
  const socials = lead.social_links ? JSON.stringify(lead.social_links) : "none found";
  const dmName  = (lead.decision_maker_name as string | null) ?? null;
  const dmTitle = (lead.decision_maker_title as string | null) ?? null;

  const hasBook = lead.has_booking_system;
  const hasChat = lead.has_live_chat;
  const rating  = lead.google_rating ?? "N/A";
  const reviews = lead.google_review_count ?? 0;
  const name    = lead.name ?? "there";
  const website = lead.website ?? "none";
  const score   = lead.score ?? "unscored";
  const city    = lead.city ?? "Nairobi";
  const vertical = lead.vertical ?? "";

  const leadSignal = (() => {
    if (hasBook === false) return "no online booking system detected";
    if (hasChat === false) return "no live chat on their website";
    if (pains !== "none detected") return `key signals: ${pains}`;
    if (rating !== "N/A") return `${rating}★ on Google (${reviews} reviews)`;
    return `active ${vertical} in ${city}`;
  })();

  return `You are a senior B2B sales copywriter. Mode (${mode.label}): ${mode.outreachAngle}

Write TWO cold outreach messages for the business below on behalf of the sender. Use real name. Be hyper-specific. No fluff.

BUSINESS: ${name}
TYPE: ${vertical} in ${city}
GOOGLE: ${rating}★ · ${reviews} reviews
WEBSITE: ${website}
TECH STACK: ${tech}
BOOKING SYSTEM: ${hasBook === true ? "YES" : hasBook === false ? "NO — missing" : "unknown"}
LIVE CHAT: ${hasChat === true ? "YES" : hasChat === false ? "NO" : "unknown"}
PAIN SIGNALS: ${pains}
SOCIAL: ${socials}
FIT SCORE: ${score}/100
LEAD SIGNAL: ${leadSignal}
DECISION-MAKER: ${dmName ? `${dmName}${dmTitle ? `, ${dmTitle}` : ""}` : "unknown"}
CONTEXT: ${targetDesc}

SENDER: ${senderName}, ${bizName} — ${bizDesc}.

OUTPUT FORMAT — follow EXACTLY:
---WHATSAPP---
[2 sentences MAX. Start with "Hi ${dmName ? dmName.split(" ")[0] : (name as string).split(" ")[0]},". Under 40 words total. One CTA question.]
---EMAIL SUBJECT---
[7 words max. Name the specific gap. No clichés.]
---EMAIL BODY---
[5 sentences. S1: observation. S2: cost of gap. S3: what ${bizName} delivers. S4: proof point. S5: soft CTA. Sign off: ${senderName} | ${bizName}]

Primary channel for this sender: ${channel}`;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { leadIds?: unknown; channel?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const leadIds = body.leadIds;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds array required." }, { status: 400 });
  }
  if (leadIds.length > MAX_LEADS) {
    return NextResponse.json({ error: `Maximum ${MAX_LEADS} leads per bulk request.` }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  const orgId = await resolveOrgId(user.id);

  const db = createSupabaseServiceClient();
  const [{ data: leads }, { data: org }] = await Promise.all([
    db.from("hunter_leads")
      .select("*")
      .eq("org_id", orgId)
      .in("id", leadIds as string[]),
    db.from("hunter_orgs")
      .select("business_name,name,sender_name,org_description,target_description,outreach_channel,enrichment_mode")
      .eq("id", orgId)
      .single(),
  ]);

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: "No leads found." }, { status: 404 });
  }

  const mode = getMode((org as Record<string, unknown> | null)?.enrichment_mode as string | undefined);
  const results: Array<{ leadId: string; leadName: string; ok: boolean; whatsapp?: string; subject?: string; email?: string; error?: string }> = [];

  for (const lead of leads as Record<string, unknown>[]) {
    try {
      const prompt = buildPrompt(lead, (org as Record<string, unknown>) ?? {}, mode);
      const fullText = await geminiComplete(prompt, { temperature: 0.7, maxOutputTokens: 1500, thinkingBudget: 0 });

      const waMatch  = fullText.match(/---WHATSAPP---\s*([\s\S]*?)(?=---EMAIL SUBJECT---|$)/);
      const subMatch = fullText.match(/---EMAIL SUBJECT---\s*([\s\S]*?)(?=---EMAIL BODY---|$)/);
      const bodMatch = fullText.match(/---EMAIL BODY---\s*([\s\S]*?)$/);

      const whatsapp = waMatch?.[1]?.trim()  ?? fullText.trim();
      const subject  = subMatch?.[1]?.trim() ?? "";
      const email    = bodMatch?.[1]?.trim() ?? "";

      await db.from("hunter_leads").update({
        opener_text:         whatsapp,
        opener_whatsapp:     whatsapp,
        opener_email:        email,
        opener_subject:      subject,
        opener_generated_at: new Date().toISOString(),
      }).eq("id", lead.id as string).eq("org_id", orgId);

      results.push({ leadId: lead.id as string, leadName: lead.name as string, ok: true, whatsapp, subject, email });
      logEvent(orgId, "opener");
    } catch (err) {
      const msg = String(err);
      logError("/api/opener/bulk", msg, orgId, { leadId: lead.id });
      results.push({ leadId: lead.id as string, leadName: lead.name as string, ok: false, error: msg });
    }
  }

  return NextResponse.json({ results, total: results.length, succeeded: results.filter((r) => r.ok).length });
}
