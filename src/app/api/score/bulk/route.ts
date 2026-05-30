import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId, checkOrgAccess, ACCESS_DENIED } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { geminiStream, extractGeminiToken } from "@/lib/gemini";
import { logEvent } from "@/lib/logEvent";

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

  const { limit = 30 } = await req.json().catch(() => ({}));

  const db = createSupabaseServiceClient();

  const [{ data: leads }, { data: org }] = await Promise.all([
    db.from("hunter_leads")
      .select("*")
      .eq("org_id", orgId)
      .eq("enrichment_status", "done")
      .is("score", null)
      .limit(limit),
    db.from("hunter_orgs")
      .select("business_name,name,org_description,target_description,priority_signals,outreach_channel")
      .eq("id", orgId)
      .single(),
  ]);

  if (!leads?.length) return NextResponse.json({ ok: true, scored: 0 });

  const bizName   = (org?.business_name || org?.name || "the searcher") as string;
  const offerCtx  = org?.org_description
    ? `${bizName} — ${org.org_description}`
    : `${bizName} — a business looking for qualified leads`;
  const targetCtx = org?.target_description
    ? `They are specifically looking for: ${org.target_description}.`
    : `They are looking for established local businesses to engage.`;
  const signalCtx = (org?.priority_signals as string[] | null)?.length
    ? `Top qualification signals: ${(org?.priority_signals as string[]).join(", ")}.`
    : "";
  const channel   = (org?.outreach_channel as string) || "WhatsApp";

  function buildPrompt(lead: Record<string, unknown>): string {
    const tech    = (lead.tech_stack as string[] | null)?.join(", ") || "unknown";
    const preSigs = (lead.pain_signals as string[] | null)?.join(", ") || "none";
    return `You are a B2B lead qualification analyst.

SEARCHER: ${offerCtx}
${targetCtx}
${signalCtx}
Outreach channel: ${channel}.

LEAD: ${lead.name} · ${lead.vertical} in ${lead.city}
Google: ${lead.google_rating ?? "unknown"}★ (${lead.google_review_count ?? 0} reviews)
Website: ${lead.website ?? "none"} | Booking: ${lead.has_booking_system ?? "unknown"} | Tech: ${tech}
Phone: ${lead.phone ? "yes" : "no"} | Email: ${lead.email ? "yes" : "no"}
Pre-enrichment signals: ${preSigs}

Write 2–3 sentences on fit for this searcher specifically. Then:
SCORE: <0-100>
SIGNALS: <comma-separated match signals, max 4>`;
  }

  let scored = 0;

  for (const lead of leads) {
    try {
      const geminiRes = await geminiStream(
        buildPrompt(lead as Record<string, unknown>),
        { temperature: 0.2, maxOutputTokens: 800, thinkingBudget: 0 },
      );
      if (!geminiRes.ok) {
        console.error("[score/bulk] Gemini error", geminiRes.status);
        continue;
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
            if (token) fullText += token;
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
      }).eq("id", lead.id);

      scored++;
    } catch (err) {
      console.error("[score/bulk] lead", lead.id, err);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  if (scored > 0) logEvent(orgId, "score");
  return NextResponse.json({ ok: true, scored, total: leads.length });
}
