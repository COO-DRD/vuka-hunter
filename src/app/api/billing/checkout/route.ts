import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser, resolveOrgId } from "@/lib/auth";

let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
  return _stripe;
}

const PLAN_PRICES: Record<string, { priceId: string; amount: number }> = {
  pro: { priceId: process.env.STRIPE_PRICE_PRO ?? "", amount: 200000 }, // KES 2,000
};

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_PRICE_PRO) {
    console.error("[billing/checkout] STRIPE_PRICE_PRO not configured");
    return NextResponse.json({ error: "Payment system is not configured. Contact support." }, { status: 500 });
  }

  const user  = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const db    = createSupabaseServiceClient();

  let body: { plan: string; idempotency_key: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { plan, idempotency_key } = body;

  if (!plan || !PLAN_PRICES[plan]) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }
  if (!idempotency_key || idempotency_key.length < 16) {
    return NextResponse.json({ error: "idempotency_key required (UUID from client)" }, { status: 400 });
  }

  const planConfig = PLAN_PRICES[plan];

  // ── Idempotency: return existing intent if this key was already used ────────
  const { data: existing } = await db
    .from("hunter_payment_intents")
    .select("id, stripe_payment_intent_id, status, metadata")
    .eq("idempotency_key", idempotency_key)
    .eq("org_id", orgId)
    .maybeSingle();

  if (existing) {
    // Retrieve the live client_secret from Stripe for this intent
    if (existing.stripe_payment_intent_id) {
      const pi = await getStripe().paymentIntents.retrieve(existing.stripe_payment_intent_id);
      return NextResponse.json({
        client_secret:     pi.client_secret,
        payment_intent_id: existing.id,
        idempotent:        true,
      });
    }
  }

  // ── Ensure Stripe customer exists ───────────────────────────────────────────
  const { data: sub } = await db
    .from("hunter_subscriptions")
    .select("stripe_customer_id")
    .eq("org_id", orgId)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id ?? null;

  if (!customerId) {
    const { data: org } = await db
      .from("hunter_orgs")
      .select("name, billing_email")
      .eq("id", orgId)
      .single();

    const customer = await getStripe().customers.create({
      email:    user.email ?? undefined,
      name:     org?.name ?? undefined,
      metadata: { org_id: orgId },
    });
    customerId = customer.id;

    await db.from("hunter_subscriptions").upsert(
      { org_id: orgId, stripe_customer_id: customerId },
      { onConflict: "org_id" }
    );
  }

  // ── Create Stripe PaymentIntent with idempotency key ───────────────────────
  const stripeIntent = await getStripe().paymentIntents.create(
    {
      amount:   planConfig.amount,
      currency: "kes",
      customer: customerId,
      metadata: { org_id: orgId, plan },
      description: `Hunter ${plan} plan`,
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey: idempotency_key }
  );

  // ── Write to hunter_payment_intents ────────────────────────────────────────
  const { data: dbIntent } = await db
    .from("hunter_payment_intents")
    .insert({
      org_id:                   user.id,
      idempotency_key,
      stripe_payment_intent_id: stripeIntent.id,
      stripe_customer_id:       customerId,
      amount:                   planConfig.amount,
      currency:                 "kes",
      plan,
      description:              `Hunter ${plan} plan`,
      status:                   "initiated",
      metadata:                 { plan },
    })
    .select("id")
    .single();

  // ── Log initiation event to ledger ─────────────────────────────────────────
  if (dbIntent) {
    await db.from("hunter_payment_events").insert({
      org_id:            user.id,
      payment_intent_id: dbIntent.id,
      stripe_event_id:   `local_init_${stripeIntent.id}`,
      event_type:        "payment.initiated",
      amount:            planConfig.amount,
      currency:          "kes",
      stripe_payload:    { payment_intent_id: stripeIntent.id, plan },
    });
  }

  return NextResponse.json({
    client_secret:     stripeIntent.client_secret,
    payment_intent_id: dbIntent?.id ?? null,
    idempotent:        false,
  });
}
