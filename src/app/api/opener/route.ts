import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId, checkOrgAccess, ACCESS_DENIED } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { geminiStream, extractGeminiToken } from "@/lib/gemini";
import { logEvent, logError } from "@/lib/logEvent";
import { checkAIHourlyCap } from "@/lib/aiGuard";
import { getMode } from "@/lib/enrichmentModes";

const VERTICAL_PAIN: Record<string, string> = {
  dental:        "Most dental clinics lose 20–30% of appointment slots to no-shows and don't follow up with patients automatically.",
  clinic:        "Clinics typically miss after-hours enquiries and have no automated patient follow-up — the first practice to respond wins.",
  hotel:         "Hotels lose direct bookings to OTAs and pay 15–25% commission they don't need to.",
  real_estate:   "Real estate agencies miss leads that come in outside office hours — usually the serious ones.",
  law_firm:      "Law firms rarely follow up on initial enquiries quickly, losing clients to whoever responds first.",
  gym:           "Gyms lose members silently — no automated re-engagement for people who stop showing up.",
  restaurant:    "Restaurants with no online booking system lose reservations to competitors who make it one tap.",
  minimart:      "Most dukas and mini-marts lose repeat customers because there's no way to browse stock or order remotely — customers go to whoever has a WhatsApp catalog first.",
  insurance:     "Insurance agents spend 60–70% of their week on cold prospecting. The ones who close consistently aren't better at selling — they're better at knowing who to call before the call.",
  sacco:         "SACCOs lose member interest between AGMs because there's no channel to communicate loan products or share performance updates between meetings.",
  bank:          "Branch-led banks are haemorrhaging SME clients to digital lenders — the gap is speed and visibility, not product.",
  school:        "Schools fill classroom capacity by word of mouth, which caps enrolment. The ones growing fastest have a structured way to reach parents before registration season.",
  logistics:     "Logistics companies win contracts because they respond first with a clear quote — most lose business to a competitor who just picked up the phone faster.",
  transport:     "Transport operators price by feel rather than data, leaving 15–25% margin on the table every route.",
  pharmacy:      "Pharmacies within 2km of each other compete on price alone — the ones that win long-term own the customer relationship via WhatsApp or loyalty.",
  salon:         "Salons run on referrals with no way to re-activate clients who haven't booked in 60+ days — that's recoverable revenue sitting idle.",
  construction:  "Contractors win tenders by relationship, not by visibility — a structured digital presence turns that into a reliable inbound pipeline.",
  agriculture:   "Smallholder agri-businesses miss bulk buyers because their supply and capacity are invisible outside their immediate network.",
  accounting:    "Accounting firms in Kenya lose SME clients at year-end because competitors market more aggressively during filing season.",
  tech:          "B2B tech companies in Kenya convert at under 2% on cold outreach because messages are generic — specificity beats volume every time.",
  consultancy:   "Consultancies grow by referral and stall when the network saturates — a structured outreach system turns expertise into a replicable sales motion.",
  it_company:    "Most IT firms in Kenya win clients through personal introductions and lose to competitors who followed up first — a structured pipeline changes that ratio fast.",
  architecture:  "Architecture firms fill their pipeline by word-of-mouth, which caps growth. The ones winning consistently have a way to reach decision-makers before the project brief is issued.",
  digital_agency:"Digital agencies are hired by whoever has the most visible proof of results at the moment a client decides to spend. Being first in their inbox at that moment is the whole game.",
  auto_workshop: "Car owners are loyal to one mechanic — until they have a bad experience. Workshops that retain clients long-term have a proactive communication channel, not just a skills advantage.",
  car_wash:      "The best car washes in Nairobi aren't the cheapest — they're the ones clients trust enough to pre-book. That trust is built through consistent, personalised follow-up.",
  driving_school:"Driving school enrolment spikes at year-end and during school holidays. The ones that fill up first reached out to their waitlist before the rush — not during it.",
  physio:        "Most physio clients drop out before full recovery because nobody follows up after the second session. The clinics with the best outcomes have structured re-engagement, not just good therapists.",
  bakery:        "Artisan bakeries turn occasional buyers into weekly regulars through pre-order systems and personalised communication — without it, they're competing on walk-in traffic alone.",
  print_shop:    "Print companies win corporate accounts before the tender, not during it. The relationship starts with a proactive sample delivery and a personalised follow-up — not a cold quote.",
  security_firm: "Security contracts are won on trust and visibility before a client ever needs a proposal. Firms that are in the conversation early win the RFP.",
  electronics_shop:"Electronics shops in Kenya lose repeat buyers to Jumia and OLX because they don't have a channel to reach customers when they're ready to upgrade — WhatsApp catalogues change that.",
  tutoring:      "Parents choose tutoring centres based on word-of-mouth referrals and first impressions during intake season. The ones that fill up have structured parent communication year-round.",
  catering:      "Catering companies book their best events from clients they've already served — but most lose those relationships between events because there's no follow-up channel.",
  mosque:        "Mosques organising Umra and Hajj trips lose members to agencies that got there first — a structured pipeline for group travel enquiries converts congregation interest into confirmed bookings before Ramadan rush.",
  visa_agency:   "Visa agencies win repeat business from clients who feel looked after between applications — most lose referrals to competitors who followed up first with the next trip or renewal.",
};

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

  const aiCap = await checkAIHourlyCap(orgId, access.plan);
  if (!aiCap.allowed) {
    return NextResponse.json(
      { error: `Hourly AI limit reached (${aiCap.used}/${aiCap.cap} actions). Resets within the hour.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { leadId } = body as Record<string, unknown>;
  if (!leadId || typeof leadId !== "string" || !/^[0-9a-f-]{36}$/i.test(leadId)) {
    return NextResponse.json({ error: "Invalid leadId" }, { status: 400 });
  }

  const db = createSupabaseServiceClient();
  const [{ data: lead }, { data: org }] = await Promise.all([
    db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", orgId).single(),
    db.from("hunter_orgs")
      .select("business_name,name,sender_name,org_description,target_description,outreach_channel,enrichment_mode")
      .eq("id", orgId)
      .single(),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!process.env.GEMINI_API_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const mode = getMode((org as Record<string, unknown> | null)?.enrichment_mode as string | undefined);

  // Profile — fall back gracefully for legacy accounts
  const senderName   = (org?.sender_name   || user.email?.split("@")[0] || "the team") as string;
  const bizName      = (org?.business_name || org?.name || "our company") as string;
  const bizDesc      = (org?.org_description  || "digital growth solutions for local businesses") as string;
  const targetDesc   = (org?.target_description || VERTICAL_PAIN[lead.vertical as string] || "Many local businesses miss leads outside office hours.") as string;
  const channel      = (org?.outreach_channel || "WhatsApp") as string;

  const pains    = (lead.pain_signals as string[])?.join(", ") ?? "none detected";
  const tech     = (lead.tech_stack  as string[])?.join(", ") ?? "unknown";
  const socials  = lead.social_links ? JSON.stringify(lead.social_links) : "none found";
  const hasBook  = lead.has_booking_system;
  const hasChat  = lead.has_live_chat;
  const rating   = lead.google_rating ?? "N/A";
  const reviews  = lead.google_review_count ?? 0;
  const vertical = lead.vertical ?? "";
  const city     = lead.city ?? "Nairobi";
  const name     = lead.name ?? "there";
  const website  = lead.website ?? "none";
  const score    = lead.score ?? "unscored";
  const dmName   = (lead.decision_maker_name  as string | null) ?? null;
  const dmTitle  = (lead.decision_maker_title as string | null) ?? null;
  const drScore  = (lead.digital_readiness_score as number | null) ?? null;
  const rScore   = (lead.reachability_score as number | null) ?? null;

  const leadSignal = (() => {
    if (hasBook === false) return `no online booking system detected`;
    if (hasChat === false) return `no live chat on their website`;
    if (pains !== "none detected") return `key signals: ${pains}`;
    if (rating !== "N/A") return `${rating}★ on Google (${reviews} reviews)`;
    return `active ${vertical} in ${city}`;
  })();

  const prompt = `You are a senior B2B sales copywriter. Outreach angle for this account type (${mode.label}): ${mode.outreachAngle}

Write TWO cold outreach messages for the business below on behalf of the sender. Use the business's real name. Be hyper-specific — cite actual numbers or observations, not generalities. No fluff.

BUSINESS: ${name}
TYPE: ${vertical} in ${city}
GOOGLE: ${rating}★ · ${reviews} reviews
WEBSITE: ${website}
TECH STACK: ${tech}
BOOKING SYSTEM: ${hasBook === true ? "YES — they have one" : hasBook === false ? "NO — missing completely" : "unknown"}
LIVE CHAT: ${hasChat === true ? "YES" : hasChat === false ? "NO" : "unknown"}
PAIN SIGNALS: ${pains}
SOCIAL: ${socials}
FIT SCORE: ${score}/100
LEAD SIGNAL (use this to open): ${leadSignal}
CONTEXT (what the sender offers / what they're looking for): ${targetDesc}

DECISION-MAKER: ${dmName ? `${dmName}${dmTitle ? `, ${dmTitle}` : ""}` : "unknown — address the business by name"}
DIGITAL READINESS: ${drScore !== null ? `${drScore}/100` : "unknown"}
REACHABILITY: ${rScore !== null ? `${rScore}/100` : "unknown"}

SENDER: ${senderName}, ${bizName} — ${bizDesc}.

OUTPUT FORMAT — follow EXACTLY:
---WHATSAPP---
[2 sentences MAX. Start with "Hi ${dmName ? dmName.split(" ")[0] : name.split(" ")[0]}," — use the decision-maker first name if known, otherwise business name. In sentence 1: cite the lead signal with a specific number or fact. In sentence 2: one CTA question that implies ${senderName} has the fix. NO sign-off. Under 40 words total.]
---EMAIL SUBJECT---
[7 words max. Name the specific gap or opportunity. No "quick question" or "partnership" clichés.]
---EMAIL BODY---
[5 sentences. S1: observation that proves you looked (cite rating, gap, or tech). S2: name the cost of that gap in revenue or customers. S3: what ${bizName} delivers to fix it. S4: one proof point or quick win. S5: soft CTA — one question or offer to chat. Sign off: ${senderName} | ${bizName}]

HARD RULES:
- Use "${name}" by name — never "your business" or "you"
- Never say "I hope this message finds you well", "I came across", or "I wanted to reach out"
- WhatsApp must be under 40 words — people skim on mobile
- Email subject must reference ${name} or their specific gap
- Primary outreach channel for this sender is ${channel} — lead with that`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc  = new TextEncoder();
      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const geminiRes = await geminiStream(prompt, { temperature: 0.7, maxOutputTokens: 2000, thinkingBudget: 1024 }, "opener");

        if (!geminiRes.ok) {
          console.error("[opener] Gemini error", geminiRes.status, await geminiRes.text().catch(() => ""));
          send({ error: "Generation failed — please retry" });
          controller.close();
          return;
        }

        const reader  = geminiRes.body!.getReader();
        const decoder = new TextDecoder();
        let buf      = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const token = extractGeminiToken(JSON.parse(payload));
              if (token) { fullText += token; send({ t: token }); }
            } catch { /* malformed chunk */ }
          }
        }

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
        }).eq("id", leadId).eq("org_id", orgId);

        logEvent(orgId, "opener");
        send({ done: true, whatsapp, subject, email });
      } catch (err) {
        console.error("[opener]", err);
        logError("/api/opener", String(err), orgId, { leadId });
        send({ error: "Generation failed — please retry" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
