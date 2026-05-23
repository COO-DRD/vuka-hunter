import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_STREAM_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const { data: lead } = await db
    .from("hunter_leads")
    .select("*")
    .eq("id", leadId)
    .eq("org_id", user.id)
    .single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!process.env.GEMINI_API_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

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

  // Map vertical to a human pain point
  const VERTICAL_PAIN: Record<string, string> = {
    dental:      "Most dental clinics lose 20–30% of appointment slots to no-shows and don't follow up with patients automatically.",
    clinic:      "Clinics typically miss after-hours enquiries and have no automated patient follow-up.",
    hotel:       "Hotels lose direct bookings to OTAs and pay 15–25% commission they don't need to.",
    real_estate: "Real estate agencies miss leads that come in outside office hours — usually the serious ones.",
    law_firm:    "Law firms rarely follow up on initial enquiries quickly, losing clients to whoever responds first.",
    gym:         "Gyms lose members silently — no automated re-engagement for people who stop showing up.",
    restaurant:  "Restaurants with no online booking system lose reservations to competitors who make it one tap.",
  };
  const verticalPain = VERTICAL_PAIN[vertical] ?? "Many local businesses miss leads outside office hours.";

  const prompt = `You are a senior B2B sales copywriter for a Kenyan AI & digital growth agency (VUKA Digital).
Write TWO cold outreach messages for the same prospect. Be specific, confident, and direct. No fluff.

PROSPECT DATA:
- Business: ${name}
- Type: ${vertical} in ${city}
- Google: ${rating}★ across ${reviews} reviews
- Website: ${website}
- Tech stack: ${tech}
- Booking system: ${hasBook === true ? "YES" : hasBook === false ? "NO — big gap" : "unknown"}
- Live chat: ${hasChat === true ? "YES" : hasChat === false ? "NO" : "unknown"}
- Pain signals detected: ${pains}
- Social presence: ${socials}
- Fit score: ${score}/100
- Known vertical pain: ${verticalPain}

SENDER: Dr. Dullu, founder of VUKA Digital — we build AI automation, booking systems, and growth infrastructure for local businesses. We're based in Nairobi.

OUTPUT FORMAT — follow EXACTLY, including the markers:
---WHATSAPP---
[2–3 sentences MAX. Conversational. Start with "Hi [name or shortened business name]," — pick something natural. Reference ONE specific thing you observed. Name the pain. One CTA question at the end. NO subject line. NO sign-off.]
---EMAIL SUBJECT---
[One sharp subject line, 6–10 words, specific to their business, no clickbait]
---EMAIL BODY---
[4–5 sentences. Professional but warm. Open with a specific observation. Name the problem clearly. State the outcome you'd deliver. Soft CTA. Sign off as: Dr. Dullu | VUKA Digital]

RULES for both:
- Never say "I hope this message finds you well"
- Never say "I came across your business"
- Be specific — mention their rating, the booking gap, or their tech stack
- WhatsApp must be SHORT — people skim WA messages, they read email
- Email subject must feel personal, not like a newsletter`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc  = new TextEncoder();
      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const geminiRes = await fetch(
          `${GEMINI_STREAM_URL}&key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.65, maxOutputTokens: 500 },
            }),
          }
        );

        if (!geminiRes.ok) {
          const err = await geminiRes.json();
          send({ error: err?.error?.message ?? "Gemini error" });
          controller.close();
          return;
        }

        const reader  = geminiRes.body!.getReader();
        const decoder = new TextDecoder();
        let buf      = "";
        let fullText = "";

        // Stream tokens — client infers section from the running text
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

        // Parse the three sections from the full output
        const waMatch  = fullText.match(/---WHATSAPP---\s*([\s\S]*?)(?=---EMAIL SUBJECT---|$)/);
        const subMatch = fullText.match(/---EMAIL SUBJECT---\s*([\s\S]*?)(?=---EMAIL BODY---|$)/);
        const bodMatch = fullText.match(/---EMAIL BODY---\s*([\s\S]*?)$/);

        const whatsapp = waMatch?.[1]?.trim()  ?? fullText.trim();
        const subject  = subMatch?.[1]?.trim() ?? "";
        const email    = bodMatch?.[1]?.trim() ?? "";

        await db.from("hunter_leads").update({
          opener_text:      whatsapp,   // primary = whatsapp (short)
          opener_whatsapp:  whatsapp,
          opener_email:     email,
          opener_subject:   subject,
          opener_generated_at: new Date().toISOString(),
        }).eq("id", leadId);

        send({ done: true, whatsapp, subject, email });
      } catch (err) {
        send({ error: String(err) });
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
