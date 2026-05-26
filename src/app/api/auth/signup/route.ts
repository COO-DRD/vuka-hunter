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

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || !password || !name?.trim()) {
    return NextResponse.json({ error: "Name, email, and password are all required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  // generateLink creates the user server-side (no client rate limit) and
  // triggers Supabase to send the confirmation email through the configured mailer.
  const { data, error } = await db.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    return NextResponse.json({ error: friendlyError(error.message) }, { status: 409 });
  }

  // Create the org row immediately — user is unconfirmed but the row is ready.
  await db.from("hunter_orgs").upsert(
    { id: data.user.id, name: name.trim(), plan: "beta", credits_total: 999999, credits_used: 0 },
    { onConflict: "id", ignoreDuplicates: true }
  );

  return NextResponse.json({ success: true });
}
