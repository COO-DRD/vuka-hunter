import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendUpgradeConfirmationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  const hash = createHmac("sha512", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try { event = JSON.parse(body); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const db = createSupabaseServiceClient();

  // Idempotency
  const reference = (event.data?.reference as string) ?? "";
  const { data: already } = await db
    .from("hunter_payment_events")
    .select("id")
    .eq("stripe_event_id", `paystack_wh_${reference}_${event.event}`)
    .maybeSingle();
  if (already) return NextResponse.json({ ok: true, idempotent: true });

  const orgId = (event.data?.metadata as Record<string, string>)?.org_id;

  if (event.event === "charge.success" && orgId) {
    const now      = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await db.from("hunter_orgs").update({
      subscribed_plan:     "pro",
      subscription_status: "active",
      trial_ends_at:       null,
    }).eq("id", orgId);

    await db.from("hunter_subscriptions").upsert({
      org_id:               orgId,
      plan:                 "pro",
      status:               "active",
      current_period_start: now.toISOString(),
      current_period_end:   periodEnd.toISOString(),
      paystack_reference:   reference,
    }, { onConflict: "org_id" });

    const email = (event.data?.customer as Record<string, string>)?.email;
    const { data: org } = await db.from("hunter_orgs").select("name").eq("id", orgId).single();
    if (email) await sendUpgradeConfirmationEmail(email, org?.name).catch(() => {});
  }

  if (event.event === "subscription.disable" && orgId) {
    await db.from("hunter_orgs").update({ subscription_status: "cancelled" }).eq("id", orgId);
    await db.from("hunter_subscriptions").update({ status: "cancelled" }).eq("org_id", orgId);
  }

  // Recurring payment failed — mark past_due, do not immediately cancel
  if ((event.event === "invoice.payment_failed" || event.event === "charge.failed") && orgId) {
    await db.from("hunter_orgs").update({ subscription_status: "past_due" }).eq("id", orgId);
    await db.from("hunter_subscriptions").update({ status: "past_due" }).eq("org_id", orgId);
  }

  // Subscription not renewed (user turned off auto-renew)
  if (event.event === "subscription.not_renew" && orgId) {
    await db.from("hunter_subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("org_id", orgId);
  }

  await db.from("hunter_payment_events").insert({
    org_id:          orgId ?? "unknown",
    stripe_event_id: `paystack_wh_${reference}_${event.event}`,
    event_type:      event.event,
    amount:          (event.data?.amount as number) ?? 0,
    currency:        "kes",
    stripe_payload:  event.data,
  });

  return NextResponse.json({ ok: true });
}
