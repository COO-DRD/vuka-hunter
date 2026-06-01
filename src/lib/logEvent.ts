import { createSupabaseServiceClient } from "@/lib/supabase/server";

export function logEvent(orgId: string, eventType: "scrape" | "enrich" | "score" | "opener" | "sequence") {
  const db = createSupabaseServiceClient();
  void Promise.resolve(
    db.from("hunter_events").insert({ org_id: orgId, event_type: eventType })
  ).catch(() => {});
}

export function logError(
  route: string,
  message: string,
  orgId?: string,
  context?: Record<string, unknown>,
) {
  const db = createSupabaseServiceClient();
  void Promise.resolve(
    db.from("hunter_error_log").insert({ route, message, org_id: orgId ?? null, context: context ?? null })
  ).catch(() => {});
}
