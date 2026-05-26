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

  // Admin API — bypasses client-side rate limits, auto-confirms email.
  // No confirmation email sent; user can sign in immediately.
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: friendlyError(error.message) }, { status: 409 });
  }

  await db.from("hunter_orgs").upsert(
    { id: data.user.id, name: name.trim(), plan: "beta", credits_total: 999999, credits_used: 0 },
    { onConflict: "id", ignoreDuplicates: true }
  );

  return NextResponse.json({ success: true });
}
