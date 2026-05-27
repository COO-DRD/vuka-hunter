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

  const { email, password, name, termsAccepted } = body;

  if (!termsAccepted) {
    return NextResponse.json({ error: "You must accept the Terms of Service to create an account." }, { status: 400 });
  }
  if (!email || !password || !sanitize(name)) {
    return NextResponse.json({ error: "Name, email, and password are all required." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const cleanName  = sanitize(name, 100);
  const cleanEmail = sanitize(email, 200).toLowerCase();

  // Basic email format guard (Supabase also validates, this is defence-in-depth)
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

  await db.from("hunter_orgs").upsert(
    {
      id:               data.user.id,
      name:             cleanName,
      plan:             "beta",
      credits_total:    999999,
      credits_used:     0,
      auth_provider:    "email",
      terms_accepted_at: new Date().toISOString(),
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  return NextResponse.json({ success: true });
}
