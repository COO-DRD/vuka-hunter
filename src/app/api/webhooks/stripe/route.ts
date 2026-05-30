import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
  return _stripe;
}

// Map Stripe event types → our internal event_type enum
const STRIPE_EVENT_MAP: Record<string, string> = {
  "payment_intent.created":              "payment.initiated",
  "payment_intent.processing":           "payment.authorized",
  "payment_intent.succeeded":            "payment.captured",
  "payment_intent.payment_failed":       "payment.failed",
  "payment_intent.canceled":             "payment.voided",
  "charge.refund.updated":               "payment.refund_processed",
  "charge.refunded":                     "payment.refund_processed",
  "charge.dispute.created":              "payment.dispute_created",
  "charge.dispute.closed":               "payment.dispute_won",  // refined below
  "customer.subscription.created":       "subscription.created",
  "customer.subscription.updated":       "subscription.updated",
  "customer.subscription.deleted":       "subscription.cancelled",
  "customer.subscription.trial_will_end":"subscription.trial_ended",
  "invoice.payment_succeeded":           "subscription.renewed",
  "invoice.payment_failed":              "subscription.past_due",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  // ── Idempotency: skip already-processed events ─────────────────────────────
  const { data: existing } = await db
    .from("hunter_payment_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // ── Resolve org_id from the event object ───────────────────────────────────
  const obj = event.data.object as unknown as Record<string, unknown>;
  const stripeCustomerId = (
    (obj.customer as string | null) ??
    (obj.customer_id as string | null) ??
    null
  );

  let orgId: string | null = null;
  if (stripeCustomerId) {
    const { data: sub } = await db
      .from("hunter_subscriptions")
      .select("org_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();
    orgId = sub?.org_id ?? null;
  }

  // Also try resolving via payment_intent metadata if org_id was stored there
  if (!orgId && obj.metadata && typeof obj.metadata === "object") {
    orgId = (obj.metadata as Record<string, string>).org_id ?? null;
  }

  if (!orgId) {
    // Stripe is still sending us events (e.g. for test mode, or pre-org setup)
    // Log it but don't error — returning 200 prevents Stripe from retrying endlessly
    console.warn("[stripe/webhook] could not resolve org_id for event:", event.id, event.type);
    return NextResponse.json({ received: true, status: "org_not_found" });
  }

  // ── Map to internal event type ─────────────────────────────────────────────
  let internalType = STRIPE_EVENT_MAP[event.type];

  // Refine dispute.closed: check outcome
  if (event.type === "charge.dispute.closed") {
    const dispute = obj as unknown as Stripe.Dispute;
    internalType = dispute.status === "won" ? "payment.dispute_won" : "payment.dispute_lost";
  }

  if (!internalType) {
    // Unrecognised event — log and acknowledge
    console.log("[stripe/webhook] unmapped event type:", event.type);
    return NextResponse.json({ received: true, status: "unmapped" });
  }

  // ── Resolve payment_intent_id in our DB ────────────────────────────────────
  const stripePaymentIntentId =
    (obj.id as string | null)?.startsWith("pi_")
      ? (obj.id as string)
      : (obj.payment_intent as string | null) ?? null;

  let dbPaymentIntentId: string | null = null;
  if (stripePaymentIntentId) {
    const { data: pi } = await db
      .from("hunter_payment_intents")
      .select("id")
      .eq("stripe_payment_intent_id", stripePaymentIntentId)
      .maybeSingle();
    dbPaymentIntentId = pi?.id ?? null;
  }

  const amount   = typeof obj.amount === "number" ? obj.amount :
                   typeof obj.amount_received === "number" ? obj.amount_received : null;
  const currency = typeof obj.currency === "string" ? obj.currency : null;

  // ── 1. Write to immutable ledger ───────────────────────────────────────────
  await db.from("hunter_payment_events").insert({
    org_id:            orgId,
    payment_intent_id: dbPaymentIntentId,
    stripe_event_id:   event.id,
    event_type:        internalType,
    amount,
    currency,
    stripe_payload:    event.data.object,
  });

  // ── 2. Run payment state machine ───────────────────────────────────────────
  if (dbPaymentIntentId && internalType.startsWith("payment.")) {
    const { data: result } = await db.rpc("fn_payment_state_transition", {
      p_payment_intent_id: dbPaymentIntentId,
      p_event_type:        internalType,
    });
    if (result && !String(result).startsWith("no_op")) {
      console.log(`[stripe/webhook] state transition: ${result} for pi ${dbPaymentIntentId}`);
    }

    // On capture of a corporate plan: upgrade org to corporate and set seat limit
    if (internalType === "payment.captured" && orgId) {
      const { data: pi } = await db
        .from("hunter_payment_intents")
        .select("plan, metadata")
        .eq("id", dbPaymentIntentId)
        .maybeSingle();

      if (pi?.plan && pi.plan !== "trial") {
        const seatLimit = ({ starter: 5, growth: 15, enterprise: 30 } as Record<string, number>)[pi.plan] ?? 5;
        await db.from("hunter_orgs").update({
          account_type:        "corporate",
          subscribed_plan:     pi.plan,
          subscription_status: "active",
          seat_limit:          seatLimit,
        }).eq("id", orgId);

        // Ensure admin is registered in org_members
        await db.from("hunter_org_members").upsert(
          { org_id: orgId, user_id: orgId, role: "admin", status: "active" },
          { onConflict: "org_id, user_id" }
        );
        console.log(`[stripe/webhook] upgraded org ${orgId} to corporate ${pi.plan} (${seatLimit} seats)`);
      }
    }
  }

  // ── 3. Update subscription state ───────────────────────────────────────────
  if (internalType.startsWith("subscription.") || internalType === "subscription.past_due") {
    await handleSubscriptionEvent(db, orgId, event, internalType);
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionEvent(
  db: ReturnType<typeof createSupabaseServiceClient>,
  orgId: string,
  event: Stripe.Event,
  internalType: string
) {
  const obj = event.data.object as unknown as Record<string, unknown>;

  // Invoice events: get subscription details from the invoice
  if (event.type.startsWith("invoice.")) {
    const subId = obj.subscription as string | null;
    if (!subId) return;
    const stripeSub = await getStripe().subscriptions.retrieve(subId);
    await syncSubscription(db, orgId, stripeSub);
    return;
  }

  // Subscription events: object IS the subscription
  if (event.type.startsWith("customer.subscription.")) {
    const stripeSub = obj as unknown as Stripe.Subscription;
    await syncSubscription(db, orgId, stripeSub);
    return;
  }
}

async function syncSubscription(
  db: ReturnType<typeof createSupabaseServiceClient>,
  orgId: string,
  sub: Stripe.Subscription
) {
  const item      = sub.items.data[0];
  const priceId   = item?.price?.id ?? null;
  const plan      = priceIdToPlan(priceId);
  const seatLimit = planToSeats(plan);

  // In API 2026-04-22.dahlia current_period_* moved to the item level
  const periodStart = item?.current_period_start ?? null;
  const periodEnd   = item?.current_period_end   ?? null;

  const statusMap: Record<string, string> = {
    trialing:  "trialing",
    active:    "active",
    past_due:  "past_due",
    canceled:  "cancelled",
    unpaid:    "unpaid",
    paused:    "paused",
    incomplete: "past_due",
    incomplete_expired: "cancelled",
  };

  await db.from("hunter_subscriptions").upsert({
    org_id:                  orgId,
    stripe_customer_id:      sub.customer as string,
    stripe_subscription_id:  sub.id,
    plan,
    status:                  statusMap[sub.status] ?? "active",
    seat_limit:              seatLimit,
    current_period_start:    periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end:      periodEnd   ? new Date(periodEnd   * 1000).toISOString() : null,
    trial_end:               sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancel_at_period_end:    sub.cancel_at_period_end,
    cancelled_at:            sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  }, { onConflict: "org_id" });

  // Mirror onto hunter_orgs for fast reads (single source is hunter_subscriptions)
  await db.from("hunter_orgs").update({
    subscribed_plan:     plan,
    subscription_status: statusMap[sub.status] ?? "active",
    seat_limit:          seatLimit,
  }).eq("id", orgId);
}

function priceIdToPlan(priceId: string | null): string {
  if (!priceId) return "trial";
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER    ?? "__"]: "starter",
    [process.env.STRIPE_PRICE_GROWTH     ?? "__"]: "growth",
    [process.env.STRIPE_PRICE_ENTERPRISE ?? "__"]: "enterprise",
  };
  return map[priceId] ?? "starter";
}

function planToSeats(plan: string): number {
  return { trial: 1, starter: 5, growth: 15, enterprise: 30 }[plan] ?? 1;
}
