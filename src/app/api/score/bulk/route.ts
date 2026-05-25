import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { geminiStream } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { limit = 30 } = await req.json().catch(() => ({}));

  const db = createSupabaseServiceClient();
  const { data: leads } = await db
    .from("hunter_leads")
    .select("*")
    .eq("org_id", user.id)
    .eq("enrichment_status", "done")
    .is("score", null)
    .limit(limit);

  if (!leads?.length) return NextResponse.json({ ok: true, scored: 0 });

  let scored = 0;

  for (const lead of leads) {
    try {
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

      const geminiRes = await geminiStream(prompt, { temperature: 0.2, maxOutputTokens: 300 });
      if (!geminiRes.ok) {
        console.error("[score/bulk] Gemini error", geminiRes.status);
        continue;
      }

      // Drain the SSE stream without streaming to a client
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
            fullText += json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          } catch { /* malformed chunk */ }
        }
      }

      const scoreMatch   = fullText.match(/SCORE:\s*(\d+)/);
      const signalsMatch = fullText.match(/SIGNALS:\s*(.+)/);
      const score        = scoreMatch ? parseInt(scoreMatch[1]) : 50;
      const pain_signals = signalsMatch
        ? signalsMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const reasoning    = fullText.split("SCORE:")[0].trim();

      await db.from("hunter_leads").update({
        score,
        score_reasoning: reasoning,
        pain_signals,
        scored_at: new Date().toISOString(),
      }).eq("id", lead.id);

      scored++;
    } catch (err) {
      console.error("[score/bulk] lead", lead.id, err);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({ ok: true, scored, total: leads.length });
}
