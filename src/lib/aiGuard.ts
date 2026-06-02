import { createSupabaseServiceClient } from "./supabase/server";
import { redisIncrAICap } from "./ratelimit";

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

  // Atomic Redis INCR — no race condition across concurrent requests
  const redisResult = await redisIncrAICap(orgId, cap);
  if (redisResult) return redisResult;

  // Fallback: DB count (non-atomic, but kept for when Redis is not configured)
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
