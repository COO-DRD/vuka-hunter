import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const TEMPLATE_DAY3 = process.env.WHATSAPP_TEMPLATE_DAY3 ?? "hunter_day3";
const TEMPLATE_DAY7 = process.env.WHATSAPP_TEMPLATE_DAY7 ?? "hunter_day7";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db  = createSupabaseServiceClient();
  const now = Date.now();
  const day3Cutoff = new Date(now - 3 * 86400000).toISOString();
  const day7Cutoff = new Date(now - 7 * 86400000).toISOString();

  const [{ data: day3Orgs }, { data: day7Orgs }] = await Promise.all([
    db.from("hunter_orgs")
      .select("id, whatsapp_number, sender_name, name")
      .not("whatsapp_number", "is", null)
      .lte("whatsapp_onboarded_at", day3Cutoff)
      .is("whatsapp_day3_sent_at", null),
    db.from("hunter_orgs")
      .select("id, whatsapp_number, sender_name, name")
      .not("whatsapp_number", "is", null)
      .lte("whatsapp_onboarded_at", day7Cutoff)
      .is("whatsapp_day7_sent_at", null),
  ]);

  async function fire(org: { id: string; whatsapp_number: string | null; sender_name: string | null; name: string }, template: string, sentField: string) {
    if (!org.whatsapp_number) return false;
    const firstName = ((org.sender_name || org.name) ?? "there").split(" ")[0];
    await sendWhatsAppTemplate(org.whatsapp_number, template, [
      { type: "body", parameters: [{ type: "text", text: firstName }] },
    ]);
    await db.from("hunter_orgs").update({ [sentField]: new Date().toISOString() }).eq("id", org.id);
    return true;
  }

  let day3sent = 0;
  for (const org of day3Orgs ?? []) {
    try { if (await fire(org, TEMPLATE_DAY3, "whatsapp_day3_sent_at")) day3sent++; }
    catch (err) { console.error("[whatsapp-seq] day3 failed for", org.id, err); }
  }

  let day7sent = 0;
  for (const org of day7Orgs ?? []) {
    try { if (await fire(org, TEMPLATE_DAY7, "whatsapp_day7_sent_at")) day7sent++; }
    catch (err) { console.error("[whatsapp-seq] day7 failed for", org.id, err); }
  }

  return NextResponse.json({ day3sent, day7sent });
}
