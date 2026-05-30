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

// ── Disposable / temp-mail domain blocklist ────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com","10minutemail.net","10minutemail.org",
  "20minutemail.com","30minutemail.com","60minutemail.com",
  "guerrillamail.com","guerrillamail.info","guerrillamail.biz",
  "guerrillamail.de","guerrillamail.net","guerrillamail.org",
  "sharklasers.com","guerrillamailblock.com","grr.la",
  "mailinator.com","mailinator.net","mailinator.org",
  "tempmail.com","tempmail.net","tempmail.org","temp-mail.org",
  "throwaway.email","throwam.com","throwtempmail.com",
  "yopmail.com","yopmail.fr","yopmail.net",
  "trashmail.com","trashmail.at","trashmail.fr","trashmail.io",
  "trashmail.me","trashmail.net","trashmail.org",
  "dispostable.com","discard.email","discardmail.com","discardmail.de",
  "maildrop.cc","mailnull.com","mailnesia.com",
  "spamgourmet.com","spamgourmet.net","spamgourmet.org",
  "spam4.me","spaml.com","spamhole.com","spamkill.info","spamspot.com",
  "spamfree24.org","spammotel.com","spamevader.com","spamavert.com",
  "spamhereplease.com","spamherelots.com",
  "mintemail.com","getairmail.com","fakeinbox.com","mailexpire.com",
  "mytrashmail.com","binkmail.com","safetymail.info",
  "jetable.org","jetable.fr.nf","nomail.xl.cx",
  "tempinbox.com","tempinbox.co.uk",
  "wegwerfemail.de","dodgeit.com","spamex.com",
  "mailnull.com","noemail.pw","owlpic.com",
  "crapmail.org","ezztt.com","filzmail.com",
  "meltmail.com","mt2009.com","mt2014.com",
  "punkass.com","suremail.info","tempalias.com",
  "deadaddress.com","incognitomail.com","tempsky.com",
  "bouncr.com","clrmail.com","disign-concept.eu",
  "gishpuppy.com","humaility.com","thankyou2010.com",
  "supergreatmail.com","trashdevil.com","trashdevil.de",
  "kasmail.com","kaspop.com","klassmaster.com",
  "lol.ovpn.to","mailme.ir","opentrash.com",
  "shiftmail.com","shortmail.net","sofimail.com",
  "suioe.com","tafmail.com","tempe-mail.com",
  "teleworm.us","tempr.email","tm.in.th",
  "trash-mail.at","trashcanmail.com","trashmailer.com",
  "wh4f.org","xoxy.net","yuurok.com","zetmail.com",
]);

// ── Gibberish / keyboard-walk detector ────────────────────────────────────
const KEYBOARD_WALKS = [
  "qwer","wert","erty","rtyu","tyui","yuio","uiop",
  "asdf","sdfg","dfgh","fghj","ghjk","hjkl",
  "zxcv","xcvb","cvbn","vbnm",
  "1234","2345","3456","4567","5678","6789","7890",
  "abcd","bcde","cdef","defg","efgh",
];
const REPEATED_CHARS = /(.)\1{3,}/;

function isGibberish(s: string): boolean {
  const lower = s.toLowerCase().replace(/\s+/g, "");
  if (REPEATED_CHARS.test(lower)) return true;
  return KEYBOARD_WALKS.some((seq) => lower.includes(seq));
}

function validateName(name: string): string | null {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2)              return "Please enter your full name (first and last name).";
  if (words.some((w) => w.length < 2)) return "Each part of your name must be at least 2 characters.";
  if (isGibberish(name))             return "Please enter your real full name.";
  return null;
}

function validateCompanyName(cn: string): string | null {
  if (cn.trim().length < 3)  return "Company name must be at least 3 characters.";
  if (cn.trim().length > 150) return "Company name is too long.";
  if (isGibberish(cn))       return "Please enter a valid company name.";
  return null;
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

  // ── Honeypot: bots fill hidden fields that real users never see ───────────
  // Return fake success so bots don't know they were rejected.
  if (body._hp && String(body._hp).length > 0) {
    return NextResponse.json({ success: true, requiresEmailVerification: true });
  }

  const {
    email, password, name,
    termsAccepted, dpaAccepted,
    accountType,
    companyName, companySize, billingEmail,
    operatingCounty, operatingAddress,
  } = body;

  // ── Required consent checks ────────────────────────────────────────────────
  if (!termsAccepted) {
    return NextResponse.json({ error: "You must accept the Terms of Service to continue." }, { status: 400 });
  }
  if (!dpaAccepted) {
    return NextResponse.json({ error: "You must accept the Kenya Data Protection Act consent to continue." }, { status: 400 });
  }

  // ── Basic field presence ───────────────────────────────────────────────────
  if (!email || !password || !sanitize(name)) {
    return NextResponse.json({ error: "Name, email, and password are all required." }, { status: 400 });
  }

  // ── Email format ───────────────────────────────────────────────────────────
  const cleanEmail = sanitize(email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // ── Disposable / temp email rejection ─────────────────────────────────────
  const emailDomainPart = cleanEmail.split("@")[1] ?? "";
  if (DISPOSABLE_DOMAINS.has(emailDomainPart)) {
    return NextResponse.json({
      error: "Temporary or disposable email addresses are not allowed. Please use your real work or personal email.",
    }, { status: 400 });
  }

  // ── Full name validation ───────────────────────────────────────────────────
  const cleanName = sanitize(name, 100);
  const nameError = validateName(cleanName);
  if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

  const isCorporate = accountType === "corporate";

  // ── Password strength ──────────────────────────────────────────────────────
  const pwError = checkPassword(String(password), isCorporate ? "corporate" : "individual");
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  // ── Corporate-specific validation ──────────────────────────────────────────
  if (isCorporate) {
    const rawCo = sanitize(companyName, 200);
    if (!rawCo) {
      return NextResponse.json({ error: "Company name is required for corporate accounts." }, { status: 400 });
    }
    const coError = validateCompanyName(rawCo);
    if (coError) return NextResponse.json({ error: coError }, { status: 400 });

    const cleanSize = sanitize(companySize, 50);
    if (!cleanSize) {
      return NextResponse.json({ error: "Company size is required for corporate accounts." }, { status: 400 });
    }
  }

  // ── County validation ──────────────────────────────────────────────────────
  const cleanCounty = sanitize(operatingCounty, 50);
  if (isCorporate && !cleanCounty) {
    return NextResponse.json({ error: "Operating county is required for corporate accounts." }, { status: 400 });
  }
  if (cleanCounty && !KENYA_COUNTIES.has(cleanCounty)) {
    return NextResponse.json({ error: "Select a valid Kenya county." }, { status: 400 });
  }

  const cleanAddress = sanitize(operatingAddress, 300);
  if (isCorporate && cleanAddress.length < 8) {
    return NextResponse.json({
      error: "A verifiable physical or postal address is required for corporate accounts.",
    }, { status: 400 });
  }

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
      return NextResponse.json({ error: "Password does not meet requirements." }, { status: 400 });
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
        company_name:  sanitize(companyName, 200),
        company_size:  sanitize(companySize, 50),
        billing_email: sanitize(billingEmail || email, 200).toLowerCase(),
      }),
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // ── Record legal consents (immutable audit trail — Kenya DPA 2019 s.30) ────
  const ip        = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

  const consents: Array<{ consent_type: string; accepted: boolean }> = [
    { consent_type: "terms_of_service",                  accepted: true },
    { consent_type: "kenya_dpa_data_collection",         accepted: Boolean(dpaAccepted) },
    { consent_type: "kenya_dpa_third_party_enrichment",  accepted: Boolean(dpaAccepted) },
  ];

  if (isCorporate) {
    consents.push({ consent_type: "data_processing_agreement", accepted: true });
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
