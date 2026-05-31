import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendTrialReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Called daily by Vercel Cron. Sends reminder emails to users whose trial
// ends in exactly 2 days (day 5 of a 7-day trial).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createSupabaseServiceClient();

  // Find orgs whose trial ends in 1–3 days (window to avoid missing anyone)
  const in1Day = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
  const in3Day = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: orgs } = await db
    .from("hunter_orgs")
    .select("id, email, name, trial_ends_at")
    .eq("subscription_status", "trialing")
    .gte("trial_ends_at", in1Day)
    .lte("trial_ends_at", in3Day);

  if (!orgs?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const org of orgs) {
    if (!org.email) continue;
    const daysLeft = Math.max(1, Math.ceil(
      (new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000
    ));
    try {
      await sendTrialReminderEmail(org.email, daysLeft, org.name);
      sent++;
    } catch (err) {
      console.error("[trial-reminders] email failed for", org.id, err);
    }
  }

  return NextResponse.json({ sent, total: orgs.length });
}
