import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser, resolveOrgId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user  = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const db    = createSupabaseServiceClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: leads },
    { data: outreachLog },
    { data: recentLeads },
  ] = await Promise.all([
    db.from("hunter_leads")
      .select("id,stage,score,vertical,enrichment_status,has_booking_system,has_live_chat,social_links,email,phone,whatsapp_number,opener_generated_at,created_at")
      .eq("org_id", orgId),
    db.from("hunter_outreach_log")
      .select("created_at,channel")
      .eq("org_id", orgId)
      .gte("created_at", sevenDaysAgo),
    db.from("hunter_leads")
      .select("created_at")
      .eq("org_id", orgId)
      .gte("created_at", sevenDaysAgo),
  ]);

  const all = (leads ?? []) as Record<string, unknown>[];

  // Pipeline counts
  const pipeline: Record<string, number> = {};
  for (const l of all) {
    const s = (l.stage as string) ?? "new";
    pipeline[s] = (pipeline[s] ?? 0) + 1;
  }

  // Conversion rates through funnel
  const FUNNEL = ["new", "contacted", "replied", "qualified", "won"];
  const funnelCounts = FUNNEL.map((s) => pipeline[s] ?? 0);
  const total = all.length;
  const conversionRates = funnelCounts.map((c) => (total > 0 ? Math.round((c / total) * 100) : 0));

  // Stage-to-stage drop-off
  const dropOff = FUNNEL.slice(1).map((_, i) => {
    const from = funnelCounts[i];
    const to   = funnelCounts[i + 1];
    return from > 0 ? Math.round((to / from) * 100) : 0;
  });

  // Enrichment & outreach rates
  const enriched   = all.filter((l) => l.enrichment_status === "done").length;
  const withOpener = all.filter((l) => l.opener_generated_at).length;
  const enrichmentRate = total > 0 ? Math.round((enriched / total) * 100) : 0;
  const outreachRate   = enriched > 0 ? Math.round((withOpener / enriched) * 100) : 0;

  // Reachable leads (have at least one direct contact channel)
  const reachable = all.filter((l) =>
    l.email || l.phone || l.whatsapp_number ||
    (l.social_links as Record<string, string> | null)?.whatsapp
  ).length;

  // Average score
  const scored = all.filter((l) => l.score !== null && l.score !== undefined);
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((s, l) => s + (l.score as number), 0) / scored.length)
    : 0;

  // Scores by stage
  const avgScoreByStage: Record<string, number> = {};
  for (const stage of FUNNEL) {
    const inStage = all.filter((l) => l.stage === stage && l.score !== null);
    avgScoreByStage[stage] = inStage.length > 0
      ? Math.round(inStage.reduce((s, l) => s + (l.score as number), 0) / inStage.length)
      : 0;
  }

  // Top verticals by count + avg score
  const verticalMap: Record<string, { count: number; scoreSum: number; scored: number }> = {};
  for (const l of all) {
    const v = (l.vertical as string) ?? "other";
    if (!verticalMap[v]) verticalMap[v] = { count: 0, scoreSum: 0, scored: 0 };
    verticalMap[v].count++;
    if (l.score !== null && l.score !== undefined) {
      verticalMap[v].scoreSum += l.score as number;
      verticalMap[v].scored++;
    }
  }
  const topVerticals = Object.entries(verticalMap)
    .map(([v, d]) => ({ vertical: v, count: d.count, avgScore: d.scored > 0 ? Math.round(d.scoreSum / d.scored) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Weekly lead activity (last 7 days)
  const dayMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const l of recentLeads ?? []) {
    const day = (l as Record<string, unknown>).created_at as string;
    const key = day.slice(0, 10);
    if (key in dayMap) dayMap[key]++;
  }
  const weeklyLeads = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  // Outreach channel split (last 7 days)
  const channelSplit: Record<string, number> = { whatsapp: 0, email: 0 };
  for (const o of outreachLog ?? []) {
    const c = (o as Record<string, unknown>).channel as string;
    if (c === "whatsapp" || c === "email") channelSplit[c]++;
  }

  return NextResponse.json({
    total,
    enriched,
    withOpener,
    reachable,
    avgScore,
    enrichmentRate,
    outreachRate,
    pipeline,
    funnel: FUNNEL.map((stage, i) => ({
      stage,
      count: funnelCounts[i],
      pct:   conversionRates[i],
      dropOffToNext: i < dropOff.length ? dropOff[i] : null,
    })),
    avgScoreByStage,
    topVerticals,
    weeklyLeads,
    channelSplit,
  });
}
