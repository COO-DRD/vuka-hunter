import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId, checkOrgAccess, ACCESS_DENIED } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { geminiStream, extractGeminiToken } from "@/lib/gemini";
import { logEvent, logError } from "@/lib/logEvent";
import { checkAIHourlyCap } from "@/lib/aiGuard";
import { getMode } from "@/lib/enrichmentModes";

function buildFeedbackContext(feedback: Array<{ outcome: string; vertical: string }>) {
  if (!feedback.length) return "";
  const counts: Record<string, number> = {};
  for (const f of feedback) counts[f.outcome] = (counts[f.outcome] ?? 0) + 1;
  const total = feedback.length;
  const converted = (counts.converted ?? 0) + (counts.meeting ?? 0) + (counts.replied ?? 0);
  const pct = Math.round((converted / total) * 100);
  const parts = Object.entries(counts).map(([o, n]) => `${o}: ${n}`).join(", ");
  return `\nHISTORICAL PERFORMANCE (this vertical, your account, last 90 days)
${total} leads contacted — ${pct}% positive outcomes (${parts}).
Use this to calibrate confidence in your score.`;
}

function buildScoringPrompt(lead: Record<string, unknown>, org: Record<string, unknown> | null, feedback?: Array<{ outcome: string; vertical: string }>) {
  const mode       = getMode(org?.enrichment_mode as string | undefined);
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
  const modeCtx    = `Scoring frame (${mode.label}): ${mode.scoringFrame}`;
  const channelCtx    = `Primary outreach channel: ${(org?.outreach_channel as string) || "WhatsApp"}.`;
  const feedbackCtx   = feedback?.length ? buildFeedbackContext(feedback) : "";

  const tech    = (lead.tech_stack as string[] | null)?.join(", ") || "unknown";
  const preSigs = (lead.pain_signals as string[] | null)?.join(", ") || "none";

  return `You are a B2B lead qualification analyst.

SEARCHER CONTEXT
${offerCtx}
${targetCtx}
${signalCtx}
${modeCtx}
${channelCtx}${feedbackCtx}

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

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const [{ data: lead }, { data: org }] = await Promise.all([
    db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", orgId).single(),
    db.from("hunter_orgs").select("business_name,name,org_description,target_description,priority_signals,outreach_channel,enrichment_mode").eq("id", orgId).single(),
  ]);

  // Pull feedback from same vertical in this org (last 90 days) to calibrate scoring
  const d90 = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data: feedbackRows } = lead ? await db
    .from("hunter_lead_feedback")
    .select("outcome, hunter_leads!inner(vertical)")
    .eq("org_id", orgId)
    .gte("created_at", d90)
    .eq("hunter_leads.vertical", lead.vertical as string)
    .limit(50) : { data: null };
  const feedback = (feedbackRows ?? []).map((r: Record<string, unknown>) => ({
    outcome:  r.outcome as string,
    vertical: (r.hunter_leads as Record<string, unknown>)?.vertical as string,
  }));

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!process.env.GEMINI_API_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const prompt = buildScoringPrompt(lead as Record<string, unknown>, org as Record<string, unknown> | null, feedback);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const geminiRes = await geminiStream(prompt, {
          temperature: 0.2,
          maxOutputTokens: 800,
        }, "score");

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
        }).eq("id", leadId).eq("org_id", orgId);

        logEvent(orgId, "score");
        send({ done: true, score, reasoning, pain_signals });
      } catch (err) {
        console.error("[score]", err);
        logError("/api/score", String(err), orgId, { leadId });
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
