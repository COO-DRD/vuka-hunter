import { NextResponse } from "next/server";

export async function GET() {
  const configured = !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_SOLO &&
    process.env.STRIPE_PRICE_STARTER &&
    process.env.STRIPE_PRICE_GROWTH &&
    process.env.STRIPE_PRICE_ENTERPRISE
  );
  return NextResponse.json({ configured });
}
