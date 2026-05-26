import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { geminiStream } from "@/lib/gemini";
import { logEvent, logError } from "@/lib/logEvent";

const VERTICAL_PAIN: Record<string, string> = {
  dental:      "Most dental clinics lose 20–30% of appointment slots to no-shows and don't follow up with patients automatically.",
  clinic:      "Clinics typically miss after-hours enquiries and have no automated patient follow-up.",
  hotel:       "Hotels lose direct bookings to OTAs and pay 15–25% commission they don't need to.",
  real_estate: "Real estate agencies miss leads that come in outside office hours — usually the serious ones.",
  law_firm:    "Law firms rarely follow up on initial enquiries quickly, losing clients to whoever responds first.",
  gym:         "Gyms lose members silently — no automated re-engagement for people who stop showing up.",
  restaurant:  "Restaurants with no online booking system lose reservations to competitors who make it one tap.",
  minimart:    "Most dukas and mini-marts lose repeat customers because there's no way to browse stock or order remotely — customers go to whoever has a WhatsApp catalog first.",
};

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const [{ data: lead }, { data: org }] = await Promise.all([
    db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", user.id).single(),
    db.from("hunter_orgs")
      .select("business_name,name,sender_name,org_description,target_description,outreach_channel")
      .eq("id", user.id)
      .single(),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!process.env.GEMINI_API_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

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

  const leadSignal = (() => {
    if (hasBook === false) return `no online booking system detected`;
    if (hasChat === false) return `no live chat on their website`;
    if (pains !== "none detected") return `key signals: ${pains}`;
    if (rating !== "N/A") return `${rating}★ on Google (${reviews} reviews)`;
    return `active ${vertical} in ${city}`;
  })();

  const prompt = `You are a senior B2B sales copywriter.
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

SENDER: ${senderName}, ${bizName} — ${bizDesc}.

OUTPUT FORMAT — follow EXACTLY:
---WHATSAPP---
[2 sentences MAX. Start with "Hi ${name.split(" ")[0]}," or a short natural form of their name. In sentence 1: cite the lead signal with a specific number or fact. In sentence 2: one CTA question that implies ${senderName} has the fix. NO sign-off. Under 40 words total.]
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
        const geminiRes = await geminiStream(prompt, { temperature: 0.7, maxOutputTokens: 600 });

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
              const json  = JSON.parse(payload);
              const token = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
        }).eq("id", leadId);

        logEvent(user.id, "opener");
        send({ done: true, whatsapp, subject, email });
      } catch (err) {
        console.error("[opener]", err);
        logError("/api/opener", String(err), user.id, { leadId });
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
