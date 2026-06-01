import { createSupabaseServiceClient } from "./supabase/server";

// Per-plan hourly AI action caps (score + opener + sequence + enrich combined).
// Beta users get a high cap since they're running production workloads.
// Agency skips the DB check entirely.
const HOURLY_CAPS: Record<string, number> = {
  trial:   20,
  starter: 150,
  beta:    500,
  pro:     500,
  agency:  Infinity,
};

const AI_EVENT_TYPES = ["score", "opener", "sequence", "enrich"] as const;

export async function checkAIHourlyCap(
  orgId: string,
  plan: string,
): Promise<{ allowed: boolean; used: number; cap: number }> {
  const cap = HOURLY_CAPS[plan] ?? 20;
  if (!isFinite(cap)) return { allowed: true, used: 0, cap };

  const db      = createSupabaseServiceClient();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

  const { count } = await db
    .from("hunter_events")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .in("event_type", AI_EVENT_TYPES)
    .gte("created_at", hourAgo);

  const used = count ?? 0;
  return { allowed: used < cap, used, cap };
}
