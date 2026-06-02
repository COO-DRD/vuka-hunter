import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface Limiters {
  ip:    Ratelimit;
  auth:  Ratelimit;
  ai:    Ratelimit;
  aiOrg: Ratelimit;
}

function buildLimiters(): Limiters | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  return {
    ip:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  "1 m"), prefix: "rl:ip"    }),
    auth:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(15,  "1 m"), prefix: "rl:auth"  }),
    ai:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20,  "1 m"), prefix: "rl:ai"    }),
    aiOrg: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(500, "1 h"), prefix: "rl:aiorg" }),
  };
}

export const limiters = buildLimiters();

// ── AI hourly cap via Redis INCR (atomic, no race condition) ─────────────────
// Returns null if Redis not configured → caller falls back to DB count.
export async function redisIncrAICap(
  orgId: string,
  cap: number,
): Promise<{ allowed: boolean; used: number; cap: number } | null> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  const now   = new Date();
  const key   = `ai:cap:${orgId}:${now.toISOString().slice(0, 13)}`; // "2026-06-02T14"

  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 3600);

  return { allowed: count <= cap, used: count, cap };
}
