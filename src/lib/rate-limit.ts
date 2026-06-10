import { createSupabaseServiceClient } from "./supabase/server";

export const ANON_HOURLY_LIMIT = 5;

export async function checkScrapeLimit(orgId: string): Promise<{
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
}> {
  const db = createSupabaseServiceClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await db
    .from("hunter_scrape_jobs")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("created_at", since);

  const used = count ?? 0;
  return {
    allowed: used < ANON_HOURLY_LIMIT,
    used,
    remaining: Math.max(0, ANON_HOURLY_LIMIT - used),
    limit: ANON_HOURLY_LIMIT,
  };
}
