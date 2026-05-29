import { createClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function sanitize(raw: unknown, maxLen = 200): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").replace(/\0/g, "").trim().slice(0, maxLen);
}

function checkPassword(pw: string, type: "individual" | "corporate"): string | null {
  if (type === "corporate") {
    if (pw.length < 12)             return "Corporate accounts require at least 12 characters.";
    if (!/[A-Z]/.test(pw))          return "Must include at least one uppercase letter.";
    if (!/[a-z]/.test(pw))          return "Must include at least one lowercase letter.";
    if (!/[0-9]/.test(pw))          return "Must include at least one number.";
    if (!/[^A-Za-z0-9]/.test(pw))   return "Must include at least one special character (e.g. !@#$%).";
  } else {
    if (pw.length < 8)              return "Password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(pw))       return "Must include at least one letter.";
    if (!/[0-9]/.test(pw))          return "Must include at least one number.";
  }
  return null;
}

function isValidKraPin(pin: string): boolean {
  return /^[A-Z]\d{9}[A-Z]$/.test(pin.toUpperCase());
}

const KENYA_COUNTIES = new Set([
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa",
  "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
  "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
  "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a",
  "Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu",
  "Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana",
  "Uasin Gishu","Vihiga","Wajir","West Pokot",
]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const {
    email, password, name,
    termsAccepted, dpaAccepted,
    accountType,
    companyName, companySize, companyReg, billingEmail, kraPin,
    operatingCounty, operatingAddress,
  } = body;

  // ── Required consent checks ────────────────────────────────────────────────
  if (!termsAccepted) {
    return NextResponse.json({ error: "You must accept the Terms of Service to continue." }, { status: 400 });
  }
  if (!dpaAccepted) {
    return NextResponse.json({ error: "You must accept the Kenya Data Protection Act consent to continue." }, { status: 400 });
  }

  // ── Basic field validation ─────────────────────────────────────────────────
  if (!email || !password || !sanitize(name)) {
    return NextResponse.json({ error: "Name, email, and password are all required." }, { status: 400 });
  }

  const cleanEmail = sanitize(email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const isCorporate = accountType === "corporate";

  // ── Password strength ──────────────────────────────────────────────────────
  const pwError = checkPassword(String(password), isCorporate ? "corporate" : "individual");
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  // ── Corporate-specific validation ──────────────────────────────────────────
  if (isCorporate) {
    if (!sanitize(companyName)) {
      return NextResponse.json({ error: "Company name is required for corporate accounts." }, { status: 400 });
    }
    if (kraPin && !isValidKraPin(String(kraPin))) {
      return NextResponse.json({ error: "KRA PIN format is invalid. Expected format: A000000000Z" }, { status: 400 });
    }
  }

  // ── County validation ──────────────────────────────────────────────────────
  const cleanCounty = sanitize(operatingCounty, 50);
  if (cleanCounty && !KENYA_COUNTIES.has(cleanCounty)) {
    return NextResponse.json({ error: "Select a valid Kenya county." }, { status: 400 });
  }

  const cleanName    = sanitize(name, 100);
  const cleanAddress = sanitize(operatingAddress, 300);
  const cleanKraPin  = isCorporate && kraPin ? String(kraPin).toUpperCase().trim() : undefined;

  // ── Sign up via anon client — triggers real confirmation email ─────────────
  // Using anon key (not service role) so Supabase sends the verification email.
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: authData, error: authError } = await anonClient.auth.signUp({
    email:    cleanEmail,
    password: String(password),
    options:  { data: { full_name: cleanName } },
  });

  if (authError) {
    const msg = authError.message;
    if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (msg.includes("Password")) {
      return NextResponse.json({ error: "Password does not meet Supabase requirements." }, { status: 400 });
    }
    return NextResponse.json({ error: msg || "Sign-up failed. Try again." }, { status: 400 });
  }

  // Supabase returns a user with empty identities when the email already exists
  // (prevents email enumeration — it fakes success). Catch it here.
  if (!authData.user || authData.user.identities?.length === 0) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const userId = authData.user.id;
  const db     = createSupabaseServiceClient();

  const now       = new Date();
  const trialDays = isCorporate ? 14 : 7;
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  // ── Create org row (pre-verification; gated in app layout) ─────────────────
  await db.from("hunter_orgs").upsert(
    {
      id:                  userId,
      name:                cleanName,
      credits_total:       999999,
      credits_used:        0,
      auth_provider:       "email",
      terms_accepted_at:   now.toISOString(),
      account_type:        isCorporate ? "corporate" : "individual",
      trial_started_at:    now.toISOString(),
      trial_ends_at:       trialEnds.toISOString(),
      subscription_status: "trialing",
      subscribed_plan:     "trial",
      operating_county:    cleanCounty || null,
      operating_address:   cleanAddress || null,
      ...(isCorporate && {
        company_name:   sanitize(companyName, 200),
        company_size:   sanitize(companySize, 50),
        company_reg_no: sanitize(companyReg, 100),
        billing_email:  sanitize(billingEmail || email, 200).toLowerCase(),
        kra_pin:        cleanKraPin ?? null,
      }),
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // ── Record legal consents (immutable audit trail — Kenya DPA 2019 s.30) ────
  const ip        = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

  const consents: Array<{ consent_type: string; accepted: boolean }> = [
    { consent_type: "terms_of_service",              accepted: true },
    { consent_type: "kenya_dpa_data_collection",     accepted: Boolean(dpaAccepted) },
    { consent_type: "kenya_dpa_third_party_enrichment", accepted: Boolean(dpaAccepted) },
  ];

  if (isCorporate) {
    consents.push(
      { consent_type: "data_processing_agreement",      accepted: true },
      { consent_type: "kra_compliance_acknowledgment",   accepted: Boolean(body.kraComplianceAccepted) }
    );
  }

  await db.from("hunter_legal_consents").insert(
    consents.map((c) => ({
      ...c,
      org_id:     userId,
      version:    "1.0",
      ip_address: ip,
      user_agent: userAgent,
    }))
  );

  return NextResponse.json({ success: true, requiresEmailVerification: true });
}
