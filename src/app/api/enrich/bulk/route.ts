import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { isSafeUrl, enrichWebsite } from "@/lib/enrichLead";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { limit = 50, minRating = 0 } = await req.json().catch(() => ({}));

  const db = createSupabaseServiceClient();
  let query = db
    .from("hunter_leads")
    .select("id,website,email")
    .eq("org_id", user.id)
    .eq("enrichment_status", "pending")
    .not("website", "is", null)
    .limit(limit);

  if (minRating > 0) query = query.gte("google_rating", minRating);

  const { data: leads } = await query;
  if (!leads?.length) return NextResponse.json({ ok: true, enriched: 0 });

  let enriched = 0;

  for (const lead of leads) {
    if (!lead.website || !isSafeUrl(lead.website)) {
      await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", lead.id);
      continue;
    }
    try {
      const result = await enrichWebsite(lead.website);
      await db.from("hunter_leads").update({
        enrichment_status: "done",
        enriched_at: new Date().toISOString(),
        emails_found: result.emails,
        email: result.emails[0] ?? lead.email ?? null,
        tech_stack: result.techStack,
        has_booking_system: result.hasBookingSystem,
        has_live_chat: result.hasLiveChat,
        social_links: result.socialLinks,
      }).eq("id", lead.id);
      enriched++;
    } catch (err) {
      console.error("[enrich/bulk] lead", lead.id, err);
      await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", lead.id);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({ ok: true, enriched, total: leads.length });
}
