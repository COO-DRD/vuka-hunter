/**
 * stripe-setup.ts
 *
 * One-shot Stripe configuration for 4unter.
 * Creates 3 products + monthly recurring prices in KES, then registers the
 * production webhook endpoint and prints all env vars to paste into Vercel.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/stripe-setup.ts
 *
 * Safe to re-run — looks for existing products/prices by metadata tag before
 * creating new ones, so you won't end up with duplicates.
 */

import Stripe from "stripe";

const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hunter.dullugroup.co.ke";
const SECRET_KEY  = process.env.STRIPE_SECRET_KEY;

if (!SECRET_KEY) {
  console.error("\nERROR: STRIPE_SECRET_KEY is not set.\n");
  console.error("Run as:\n  STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/stripe-setup.ts\n");
  process.exit(1);
}

const stripe = new Stripe(SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

const PLANS = [
  { id: "starter",    name: "4unter Starter",    amount: 500000,  seats: 5  },
  { id: "growth",     name: "4unter Growth",      amount: 1200000, seats: 15 },
  { id: "enterprise", name: "4unter Enterprise",  amount: 2500000, seats: 30 },
] as const;

// Stripe webhook events the app handles
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "payment_intent.created",
  "payment_intent.processing",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
  "charge.refund.updated",
  "charge.dispute.created",
  "charge.dispute.closed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
];

async function findOrCreateProduct(plan: typeof PLANS[number]): Promise<string> {
  // Search for existing product tagged with our plan ID
  const existing = await stripe.products.search({
    query: `metadata["hunter_plan"]:"${plan.id}"`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    const p = existing.data[0];
    console.log(`  ✓ Product already exists: ${p.name} (${p.id})`);
    return p.id;
  }

  const product = await stripe.products.create({
    name:     plan.name,
    metadata: { hunter_plan: plan.id },
  });
  console.log(`  + Created product: ${product.name} (${product.id})`);
  return product.id;
}

async function findOrCreatePrice(productId: string, plan: typeof PLANS[number]): Promise<string> {
  // Search for an active recurring KES price attached to this product
  const existing = await stripe.prices.search({
    query: `product:"${productId}" currency:"kes" active:"true"`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    const pr = existing.data[0];
    console.log(`  ✓ Price already exists: ${pr.id} (KES ${pr.unit_amount! / 100}/mo)`);
    return pr.id;
  }

  const price = await stripe.prices.create({
    product:     productId,
    unit_amount: plan.amount,
    currency:    "kes",
    recurring:   { interval: "month" },
    metadata:    { hunter_plan: plan.id, seats: String(plan.seats) },
  });
  console.log(`  + Created price: ${price.id} (KES ${price.unit_amount! / 100}/mo)`);
  return price.id;
}

async function findOrCreateWebhook(): Promise<{ signingSecret: string; url: string }> {
  const webhookUrl = `${SITE_URL}/api/webhooks/stripe`;

  const existing = await stripe.webhookEndpoints.list({ limit: 20 });
  const match = existing.data.find((w) => w.url === webhookUrl);

  if (match) {
    console.log(`  ✓ Webhook already registered: ${webhookUrl}`);
    console.log(`  ⚠  Signing secret was set at creation time and cannot be re-read.`);
    console.log(`     If you lost it, delete this webhook in the dashboard and re-run this script.`);
    return { signingSecret: "ALREADY_EXISTS_CHECK_DASHBOARD", url: webhookUrl };
  }

  const wh = await stripe.webhookEndpoints.create({
    url:            webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    description:    "4unter production webhook",
  });
  console.log(`  + Registered webhook: ${webhookUrl}`);
  return { signingSecret: wh.secret!, url: webhookUrl };
}

async function main() {
  const isLive = SECRET_KEY!.startsWith("sk_live_");
  console.log(`\n4unter Stripe Setup`);
  console.log(`Mode: ${isLive ? "LIVE" : "TEST"}`);
  console.log(`URL:  ${SITE_URL}\n`);

  if (!isLive) {
    console.log("⚠  Using TEST key — products and prices will be created in test mode.");
    console.log("   Re-run with your live key (sk_live_...) before going live.\n");
  }

  const priceIds: Record<string, string> = {};

  for (const plan of PLANS) {
    console.log(`\n[${plan.id}]`);
    const productId = await findOrCreateProduct(plan);
    priceIds[plan.id] = await findOrCreatePrice(productId, plan);
  }

  console.log(`\n[webhook]`);
  const { signingSecret } = await findOrCreateWebhook();

  // ── Print env vars ─────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("PASTE THESE INTO VERCEL → Project Settings → Environment Variables");
  console.log("═".repeat(60));
  console.log(`\nSTRIPE_SECRET_KEY=${SECRET_KEY}`);

  if (signingSecret !== "ALREADY_EXISTS_CHECK_DASHBOARD") {
    console.log(`STRIPE_WEBHOOK_SECRET=${signingSecret}`);
  } else {
    console.log(`STRIPE_WEBHOOK_SECRET=<get from Stripe dashboard → Webhooks → Signing secret>`);
  }

  console.log(`STRIPE_PRICE_STARTER=${priceIds.starter}`);
  console.log(`STRIPE_PRICE_GROWTH=${priceIds.growth}`);
  console.log(`STRIPE_PRICE_ENTERPRISE=${priceIds.enterprise}`);

  if (!isLive) {
    const pk = SECRET_KEY!.replace("sk_test_", "pk_test_");
    console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_<your_test_publishable_key>`);
  } else {
    console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_<your_live_publishable_key>`);
  }

  console.log("\n" + "═".repeat(60));
  console.log("Also add to .env.local for local testing:");
  console.log("  stripe listen --forward-to localhost:3001/api/webhooks/stripe");
  console.log("  (this gives you a separate local webhook secret for .env.local)");
  console.log("═".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("\nSetup failed:", err.message);
  if (err.message.includes("currency")) {
    console.error("\nHint: KES (Kenyan Shilling) must be enabled for your Stripe account.");
    console.error("Go to: Dashboard → Settings → Business settings → Currencies → Add KES");
  }
  if (err.message.includes("No such")) {
    console.error("\nHint: Make sure your Stripe account supports the resource you're trying to create.");
  }
  process.exit(1);
});
