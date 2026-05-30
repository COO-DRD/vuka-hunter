import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

function sanitize(raw: unknown, maxLen = 200): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").replace(/\0/g, "").trim().slice(0, maxLen);
}

function isValidKraPin(pin: string): boolean {
  return /^[A-Z]\d{9}[A-Z]$/.test(pin.toUpperCase());
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  const db   = createSupabaseServiceClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const updates: Record<string, string | null> = {};

  if ("kraPin" in body) {
    const raw = sanitize(body.kraPin, 20).toUpperCase();
    if (raw && !isValidKraPin(raw)) {
      return NextResponse.json({ error: "KRA PIN format is invalid. Expected: A000000000Z" }, { status: 400 });
    }
    updates.kra_pin = raw || null;
  }

  if ("companyRegNo" in body) {
    updates.company_reg_no = sanitize(body.companyRegNo, 100) || null;
  }

  if ("billingEmail" in body) {
    const email = sanitize(body.billingEmail, 200).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid billing email address." }, { status: 400 });
    }
    updates.billing_email = email || null;
  }

  if ("operatingCounty" in body) {
    updates.operating_county = sanitize(body.operatingCounty, 50) || null;
  }

  if ("operatingAddress" in body) {
    updates.operating_address = sanitize(body.operatingAddress, 300) || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { error } = await db
    .from("hunter_orgs")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
