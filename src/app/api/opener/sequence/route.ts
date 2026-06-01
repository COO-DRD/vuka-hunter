import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId, checkOrgAccess, ACCESS_DENIED } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { logEvent, logError } from "@/lib/logEvent";

const VERTICAL_PAIN: Record<string, string> = {
  dental:        "Dental clinics lose 20–30% of appointment slots to no-shows and manual scheduling.",
  clinic:        "Clinics miss after-hours enquiries and have no automated patient follow-up.",
  hotel:         "Hotels pay 15–25% OTA commission on bookings they could have taken direct.",
  real_estate:   "Real estate agencies miss leads that come in outside office hours.",
  law_firm:      "Law firms lose clients to whoever responds first to the initial enquiry.",
  gym:           "Gyms lose members silently with no re-engagement for people who stop showing up.",
  restaurant:    "Restaurants with no online booking lose reservations to competitors who make it one tap.",
  salon:         "Salons can't re-activate the 60-day inactive clients — that's recoverable revenue.",
  pharmacy:      "Pharmacies lose repeat buyers to whoever owns the WhatsApp relationship.",
  logistics:     "Logistics companies lose contracts to whoever responds first with a clear quote.",
  accounting:    "Accounting firms lose SME clients to competitors who market harder during filing season.",
  consultancy:   "Consultancies stall when the referral network saturates — pipeline becomes unpredictable.",
  it_company:    "IT firms lose clients to competitors who followed up first.",
  digital_agency:"Agencies are hired by whoever has the most visible proof of results at decision time.",
  auto_workshop: "Workshops that retain clients long-term have a proactive communication channel, not just skills.",
};

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

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

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const [{ data: lead }, { data: org }] = await Promise.all([
    db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", orgId).single(),
    db.from("hunter_orgs")
      .select("business_name,name,sender_name,org_description,target_description,outreach_channel")
      .eq("id", orgId)
      .single(),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!process.env.GEMINI_API_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const senderName = (org?.sender_name || user.email?.split("@")[0] || "the team") as string;
  const bizName    = (org?.business_name || org?.name || "our company") as string;
  const bizDesc    = (org?.org_description || "digital growth solutions for local businesses") as string;
  const targetDesc = (org?.target_description || VERTICAL_PAIN[lead.vertical as string] || "") as string;

  const name     = (lead.name     as string) ?? "the business";
  const vertical = (lead.vertical as string) ?? "";
  const city     = (lead.city     as string) ?? "Nairobi";
  const dmName   = (lead.decision_maker_name as string | null) ?? null;
  const dmFirst  = dmName ? dmName.split(" ")[0] : (name.split(" ")[0]);
  const pains    = (lead.pain_signals as string[])?.join(", ") ?? "";
  const hasBook  = lead.has_booking_system;
  const hasChat  = lead.has_live_chat;
  const rating   = lead.google_rating ?? null;
  const opener   = (lead.opener_whatsapp as string) ?? "";

  const gap = hasBook === false
    ? `no online booking system — ${vertical} businesses typically lose 20–30% of appointments to phone tag`
    : hasChat === false
      ? `no live chat — ${vertical} businesses that respond within 5 minutes win 80% of enquiries`
      : pains
        ? `key signals: ${pains}`
        : rating
          ? `${rating}★ on Google — reputation management and review generation matter here`
          : `active ${vertical} business in ${city}`;

  const prompt = `You are a senior B2B sales copywriter. The opener message below was already sent to ${name}. Write TWO follow-up messages: one for Day 3 and one for Day 7.

BUSINESS: ${name}
TYPE: ${vertical} in ${city}
GAP IDENTIFIED: ${gap}
TARGET CONTEXT: ${targetDesc}
SENDER: ${senderName}, ${bizName} — ${bizDesc}
ADDRESSEE: ${dmFirst}
ORIGINAL OPENER SENT: "${opener}"

---
RULES FOR BOTH MESSAGES:
- Never repeat the opener wording
- Never say "I hope you got my last message" or "just following up"
- Day 3 should add ONE specific insight about their gap — something useful they can act on whether or not they reply
- Day 7 should come from a completely different angle: social proof, a quick win offer, or acknowledge they're busy and make it easy to say yes or no
- WhatsApp: under 45 words. Email: 3 sentences max.
- Sign off WhatsApp messages with just "${senderName}" — no company name
- Sign off email: ${senderName} | ${bizName}
- Address ${dmFirst} by first name in every message

OUTPUT FORMAT — follow EXACTLY:
---DAY3-WHATSAPP---
[message]
---DAY3-EMAIL-SUBJECT---
[subject]
---DAY3-EMAIL---
[message]
---DAY7-WHATSAPP---
[message]
---DAY7-EMAIL-SUBJECT---
[subject]
---DAY7-EMAIL---
[message]`;

  try {
    const raw = await callGemini(prompt);

    const get = (tag: string, end: string) => {
      const m = raw.match(new RegExp(`---${tag}---\\s*([\\s\\S]*?)(?=---${end}---|$)`));
      return m?.[1]?.trim() ?? "";
    };

    const day3wa      = get("DAY3-WHATSAPP",      "DAY3-EMAIL-SUBJECT");
    const day3subject = get("DAY3-EMAIL-SUBJECT",  "DAY3-EMAIL");
    const day3email   = get("DAY3-EMAIL",          "DAY7-WHATSAPP");
    const day7wa      = get("DAY7-WHATSAPP",       "DAY7-EMAIL-SUBJECT");
    const day7subject = get("DAY7-EMAIL-SUBJECT",  "DAY7-EMAIL");
    const day7email   = get("DAY7-EMAIL",          "NEVER");

    await db.from("hunter_leads").update({
      followup_day3_whatsapp:      day3wa      || null,
      followup_day3_email_subject: day3subject || null,
      followup_day3_email:         day3email   || null,
      followup_day7_whatsapp:      day7wa      || null,
      followup_day7_email_subject: day7subject || null,
      followup_day7_email:         day7email   || null,
    }).eq("id", leadId).eq("org_id", orgId);

    logEvent(orgId, "sequence");
    return NextResponse.json({ ok: true, day3wa, day3subject, day3email, day7wa, day7subject, day7email });
  } catch (err) {
    console.error("[sequence]", err);
    logError("/api/opener/sequence", String(err), orgId, { leadId });
    return NextResponse.json({ error: "Generation failed — please retry" }, { status: 500 });
  }
}
