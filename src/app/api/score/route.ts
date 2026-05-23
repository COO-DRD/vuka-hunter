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

  // Prompt that streams readable text then structured data at the end
  const prompt = `You are a B2B sales analyst scoring a local business lead for digital marketing / AI automation outreach.

Lead:
- Name: ${lead.name}
- Vertical: ${lead.vertical}
- City: ${lead.city}
- Google Rating: ${lead.google_rating ?? "unknown"} (${lead.google_review_count ?? 0} reviews)
- Website: ${lead.website ?? "none"}
- Has booking system: ${lead.has_booking_system ?? "unknown"}
- Has live chat: ${lead.has_live_chat ?? "unknown"}
- Tech stack: ${(lead.tech_stack as string[])?.join(", ") ?? "unknown"}
- Phone: ${lead.phone ? "yes" : "no"}
- Email found: ${lead.email ? "yes" : "no"}

Write 2–3 sentences of plain-prose analysis explaining WHY this lead is or isn't a strong prospect.
Then on new lines output EXACTLY:
SCORE: <0-100>
SIGNALS: <comma-separated pain signals, max 4>`;

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
              generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
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
                // Only stream the prose portion (before SCORE:)
                const scoreIdx = fullText.indexOf("SCORE:");
                if (scoreIdx === -1) {
                  send({ t: token });
                }
              }
            } catch { /* malformed chunk */ }
          }
        }

        // Parse structured data from end of output
        const scoreMatch = fullText.match(/SCORE:\s*(\d+)/);
        const signalsMatch = fullText.match(/SIGNALS:\s*(.+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
        const pain_signals = signalsMatch
          ? signalsMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        const reasoning = fullText.split("SCORE:")[0].trim();

        await db.from("hunter_leads").update({
          score,
          score_reasoning: reasoning,
          pain_signals,
          scored_at: new Date().toISOString(),
        }).eq("id", leadId);

        send({ done: true, score, reasoning, pain_signals });
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
