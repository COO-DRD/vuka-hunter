import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendWorkshopConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, email, phone, company, role } = body as Record<string, string>;
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 422 });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 422 });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName  = name.trim();

  const db = createSupabaseServiceClient();
  const { error } = await db.from("hunter_workshop_registrations").insert({
    name:    cleanName,
    email:   cleanEmail,
    phone:   phone?.trim() || null,
    company: company?.trim() || null,
    role:    role?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already registered with this email" }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }

  // Grant 30-day Pro trial to any existing account with this email
  const { data: org } = await db
    .from("hunter_orgs")
    .select("id, subscription_status, trial_ends_at")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (org) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    await db.from("hunter_orgs").update({
      subscribed_plan:     "pro",
      subscription_status: "trialing",
      trial_ends_at:       trialEnd.toISOString(),
    }).eq("id", org.id);
  }

  // Send confirmation email (best effort — don't fail registration if email fails)
  await sendWorkshopConfirmationEmail(cleanEmail, cleanName).catch(() => {});

  return NextResponse.json({ ok: true });
}
