import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { limit = 30 } = await req.json().catch(() => ({}));

  const db = createSupabaseServiceClient();
  const { data: leads } = await db
    .from("hunter_leads")
    .select("id")
    .eq("org_id", user.id)
    .eq("enrichment_status", "done")
    .is("score", null)
    .limit(limit);

  if (!leads?.length) return NextResponse.json({ ok: true, scored: 0 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vuka-hunter.vercel.app";
  let scored = 0;

  for (const lead of leads) {
    try {
      const res = await fetch(`${site}/api/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (res.ok) scored++;
    } catch { /* continue */ }
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({ ok: true, scored, total: leads.length });
}
