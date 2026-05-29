import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function friendlyError(msg: string): string {
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("duplicate"))
    return "An account with this email already exists.";
  if (msg.includes("Password should be") || msg.includes("password"))
    return "Password must be at least 8 characters.";
  if (msg.includes("Invalid email") || msg.includes("valid email"))
    return "Enter a valid email address.";
  return msg || "Something went wrong. Try again.";
}

/** Strip HTML/null bytes and truncate. */
function sanitize(raw: unknown, maxLen = 200): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").replace(/\0/g, "").trim().slice(0, maxLen);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    email, password, name, termsAccepted,
    accountType,
    companyName, companySize, companyReg, billingEmail,
  } = body;

  if (!termsAccepted) {
    return NextResponse.json({ error: "You must accept the Terms of Service to create an account." }, { status: 400 });
  }
  if (!email || !password || !sanitize(name)) {
    return NextResponse.json({ error: "Name, email, and password are all required." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const isCorporate = accountType === "corporate";
  if (isCorporate && !sanitize(companyName)) {
    return NextResponse.json({ error: "Company name is required for corporate accounts." }, { status: 400 });
  }

  const cleanName  = sanitize(name, 100);
  const cleanEmail = sanitize(email, 200).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  const { data, error } = await db.auth.admin.createUser({
    email:          cleanEmail,
    password:       password as string,
    email_confirm:  true,
  });

  if (error) {
    return NextResponse.json({ error: friendlyError(error.message) }, { status: 409 });
  }

  const now = new Date();
  const trialDays = isCorporate ? 14 : 7;
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  await db.from("hunter_orgs").upsert(
    {
      id:                data.user.id,
      name:              cleanName,
      plan:              "beta",
      credits_total:     999999,
      credits_used:      0,
      auth_provider:     "email",
      terms_accepted_at: now.toISOString(),
      account_type:      isCorporate ? "corporate" : "individual",
      trial_started_at:  now.toISOString(),
      trial_ends_at:     trialEnds.toISOString(),
      subscription_status: "trialing",
      subscribed_plan:   "trial",
      ...(isCorporate && {
        company_name:    sanitize(companyName, 200),
        company_size:    sanitize(companySize, 50),
        company_reg_no:  sanitize(companyReg, 100),
        billing_email:   sanitize(billingEmail || email, 200).toLowerCase(),
      }),
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  return NextResponse.json({ success: true });
}
