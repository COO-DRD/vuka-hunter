import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { geminiStream, extractGeminiToken } from "@/lib/gemini";
import { logEvent, logError } from "@/lib/logEvent";

function buildScoringPrompt(lead: Record<string, unknown>, org: Record<string, unknown> | null) {
  const bizName    = (org?.business_name || org?.name || "the searcher") as string;
  const offerCtx   = org?.org_description
    ? `${bizName} — ${org.org_description}`
    : `${bizName} — a business looking for qualified leads`;
  const targetCtx  = org?.target_description
    ? `They are specifically looking for: ${org.target_description}.`
    : `They are looking for established local businesses to engage.`;
  const signalCtx  = (org?.priority_signals as string[] | null)?.length
    ? `Their top qualification signals (weighted highest in scoring): ${(org?.priority_signals as string[]).join(", ")}.`
    : "";
  const channelCtx = `Primary outreach channel: ${(org?.outreach_channel as string) || "WhatsApp"}.`;

  const tech    = (lead.tech_stack as string[] | null)?.join(", ") || "unknown";
  const preSigs = (lead.pain_signals as string[] | null)?.join(", ") || "none";

  return `You are a B2B lead qualification analyst.

SEARCHER CONTEXT
${offerCtx}
${targetCtx}
${signalCtx}
${channelCtx}

LEAD TO EVALUATE
- Name: ${lead.name}
- Vertical: ${lead.vertical} in ${lead.city}
- Google: ${lead.google_rating ?? "unknown"}★ (${lead.google_review_count ?? 0} reviews)
- Website: ${lead.website ?? "none"}
- Has booking system: ${lead.has_booking_system ?? "unknown"}
- Has live chat: ${lead.has_live_chat ?? "unknown"}
- Tech stack: ${tech}
- Phone: ${lead.phone ? "yes" : "no"}
- Email found: ${lead.email ? "yes" : "no"}
- Pre-enrichment signals: ${preSigs}

Write 2–3 sentences explaining whether this lead is a strong match for the searcher — anchor your reasoning to their specific offering and ideal lead, not generic quality signals.
Then on new lines output EXACTLY:
SCORE: <0-100>
SIGNALS: <comma-separated match signals relevant to this searcher's priorities, max 4>`;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const [{ data: lead }, { data: org }] = await Promise.all([
    db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", user.id).single(),
    db.from("hunter_orgs").select("business_name,name,org_description,target_description,priority_signals,outreach_channel").eq("id", user.id).single(),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!process.env.GEMINI_API_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const prompt = buildScoringPrompt(lead as Record<string, unknown>, org as Record<string, unknown> | null);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const geminiRes = await geminiStream(prompt, {
          temperature: 0.2,
          maxOutputTokens: 800,
          thinkingBudget: 0, // structured output — thinking not needed
        });

        if (!geminiRes.ok) {
          console.error("[score] Gemini error", geminiRes.status, await geminiRes.text().catch(() => ""));
          send({ error: "Scoring failed — please retry" });
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
              const token = extractGeminiToken(JSON.parse(payload));
              if (token) {
                fullText += token;
                if (fullText.indexOf("SCORE:") === -1) send({ t: token });
              }
            } catch { /* malformed chunk */ }
          }
        }

        const scoreMatch   = fullText.match(/SCORE:\s*(\d+)/);
        const signalsMatch = fullText.match(/SIGNALS:\s*(.+)/);
        const score        = scoreMatch ? parseInt(scoreMatch[1]) : 50;
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

        logEvent(user.id, "score");
        send({ done: true, score, reasoning, pain_signals });
      } catch (err) {
        console.error("[score]", err);
        logError("/api/score", String(err), user.id, { leadId });
        send({ error: "Scoring failed — please retry" });
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
