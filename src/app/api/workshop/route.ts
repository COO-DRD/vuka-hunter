import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

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

  const db = createSupabaseServiceClient();
  const { error } = await db.from("hunter_workshop_registrations").insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || null,
    company: company?.trim() || null,
    role: role?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already registered with this email" }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
