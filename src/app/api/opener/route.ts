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

  const pains = (lead.pain_signals as string[])?.join(", ") ?? "";
  const tech = (lead.tech_stack as string[])?.join(", ") ?? "";

  const prompt = `Write a short personalized cold outreach message for a local business.

Sender: A digital growth agency that builds AI automation, booking systems, and websites.
Recipient: ${lead.name} — a ${lead.vertical} in ${lead.city}
Google rating: ${lead.google_rating ?? "N/A"} (${lead.google_review_count ?? 0} reviews)
Website: ${lead.website ?? "none"}
Tech stack: ${tech || "unknown"}
Pain signals: ${pains || "none detected"}
Has booking system: ${lead.has_booking_system ?? "unknown"}

Rules:
- 3–5 sentences max
- Mention 1 specific thing about their business
- One clear value prop: save time, get more bookings, look more professional
- End with a soft CTA: "Worth a quick chat?" or "Open to a 15-min call?"
- No fluff, no "I hope this finds you well"
- Write only the message body, no subject line or sign-off`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
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
              generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
            }),
          }
        );

        if (!geminiRes.ok) {
          const err = await geminiRes.json();
          send({ error: err?.error?.message ?? "Gemini error" });
          controller.close();
          return;
        }

        const reader = geminiRes.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
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
              const json = JSON.parse(payload);
              const token = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              if (token) {
                fullText += token;
                send({ t: token });
              }
            } catch { /* malformed chunk */ }
          }
        }

        await db
          .from("hunter_leads")
          .update({ opener_text: fullText, opener_generated_at: new Date().toISOString() })
          .eq("id", leadId);

        send({ done: true });
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
