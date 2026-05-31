import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser, resolveOrgId } from "@/lib/auth";

const PAYSTACK_BASE = "https://api.paystack.co";
const PLAN_AMOUNT   = 200000; // KES 2,000 in kobo (Paystack uses smallest currency unit — KES uses kobo)

function getSecret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY not set");
  return key;
}

async function paystackPost(path: string, body: object) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${getSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message ?? "Paystack error");
  return json.data;
}

export async function POST(req: NextRequest) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Payment system is not configured. Contact support." }, { status: 500 });
  }

  const user  = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const db    = createSupabaseServiceClient();

  let body: { plan: string; idempotency_key: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const { plan, idempotency_key } = body;
  if (plan !== "pro") return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  if (!idempotency_key || idempotency_key.length < 16) {
    return NextResponse.json({ error: "idempotency_key required" }, { status: 400 });
  }

  // Idempotency: return existing intent if key was already used
  const { data: existing } = await db
    .from("hunter_payment_intents")
    .select("id, metadata")
    .eq("idempotency_key", idempotency_key)
    .eq("org_id", orgId)
    .maybeSingle();

  if (existing) {
    const authUrl = (existing.metadata as Record<string, string>)?.authorization_url;
    if (authUrl) return NextResponse.json({ authorization_url: authUrl, idempotent: true });
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://4unter.dullugroup.co.ke"}/billing/verify`;

  const txData = await paystackPost("/transaction/initialize", {
    email:        user.email,
    amount:       PLAN_AMOUNT,
    currency:     "KES",
    reference:    idempotency_key,
    callback_url: callbackUrl,
    metadata: {
      org_id: orgId,
      plan,
      custom_fields: [
        { display_name: "Plan",    variable_name: "plan",    value: "4unter Pro" },
        { display_name: "Org ID",  variable_name: "org_id",  value: orgId },
      ],
    },
  });

  await db.from("hunter_payment_intents").insert({
    org_id:          orgId,
    idempotency_key,
    amount:          PLAN_AMOUNT,
    currency:        "kes",
    plan,
    description:     "4unter Pro",
    status:          "initiated",
    metadata:        { authorization_url: txData.authorization_url, reference: txData.reference },
  });

  return NextResponse.json({
    authorization_url: txData.authorization_url,
    reference:         txData.reference,
    idempotent:        false,
  });
}
