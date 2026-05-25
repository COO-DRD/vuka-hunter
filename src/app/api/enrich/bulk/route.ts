import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { limit = 50, minRating = 0 } = await req.json().catch(() => ({}));

  const db = createSupabaseServiceClient();
  let query = db
    .from("hunter_leads")
    .select("id,website")
    .eq("org_id", user.id)
    .eq("enrichment_status", "pending")
    .not("website", "is", null)
    .limit(limit);

  if (minRating > 0) query = query.gte("google_rating", minRating);

  const { data: leads } = await query;
  if (!leads?.length) return NextResponse.json({ ok: true, enriched: 0 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vuka-hunter.vercel.app";
  let enriched = 0;

  for (const lead of leads) {
    try {
      const res = await fetch(`${site}/api/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (res.ok) enriched++;
    } catch { /* continue on individual failure */ }
    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({ ok: true, enriched, total: leads.length });
}
