import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendUpgradeConfirmationEmail } from "@/lib/email";

const PAYSTACK_BASE = "https://api.paystack.co";

async function verifyTransaction(reference: string) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message ?? "Paystack verify failed");
  return json.data;
}

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");
  if (!reference) {
    return NextResponse.redirect(new URL("/upgrade?error=missing_reference", req.url));
  }

  let tx;
  try {
    tx = await verifyTransaction(reference);
  } catch {
    return NextResponse.redirect(new URL("/upgrade?error=verify_failed", req.url));
  }

  if (tx.status !== "success") {
    return NextResponse.redirect(new URL(`/upgrade?error=payment_${tx.status}`, req.url));
  }

  const orgId = tx.metadata?.org_id;
  if (!orgId) return NextResponse.redirect(new URL("/upgrade?error=no_org", req.url));

  const db = createSupabaseServiceClient();

  // Mark payment intent as captured
  await db
    .from("hunter_payment_intents")
    .update({ status: "captured" })
    .eq("idempotency_key", reference)
    .eq("org_id", orgId);

  // Activate Pro plan
  const now      = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await db.from("hunter_orgs").update({
    subscribed_plan:       "pro",
    subscription_status:   "active",
    trial_ends_at:         null,
  }).eq("id", orgId);

  await db.from("hunter_subscriptions").upsert({
    org_id:          orgId,
    plan:            "pro",
    status:          "active",
    current_period_start: now.toISOString(),
    current_period_end:   periodEnd.toISOString(),
    paystack_reference:   reference,
  }, { onConflict: "org_id" });

  await db.from("hunter_payment_events").insert({
    org_id:          orgId,
    stripe_event_id: `paystack_${reference}`,
    event_type:      "payment.captured",
    amount:          tx.amount,
    currency:        "kes",
    stripe_payload:  tx,
  });

  // Send confirmation email (best effort)
  const { data: org } = await db.from("hunter_orgs").select("name").eq("id", orgId).single();
  const email = tx.customer?.email;
  if (email) {
    await sendUpgradeConfirmationEmail(email, org?.name).catch(() => {});
  }

  return NextResponse.redirect(new URL("/dashboard?upgraded=1", req.url));
}
