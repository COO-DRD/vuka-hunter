import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  let dbOk = false;
  let dbMs = 0;
  try {
    const db = createSupabaseServiceClient();
    const t0 = Date.now();
    const { error } = await db.from("hunter_orgs").select("id").limit(1).maybeSingle();
    dbMs = Date.now() - t0;
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      db:        { ok: dbOk, latency_ms: dbMs },
      uptime_ms: Date.now() - start,
      ts:        new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 }
  );
}
