import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser, resolveOrgId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i;

export async function PATCH(req: NextRequest) {
  const user  = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const db    = createSupabaseServiceClient();

  const { data: org } = await db
    .from("hunter_orgs")
    .select("account_type")
    .eq("id", orgId)
    .single();

  if (org?.account_type !== "corporate") {
    return NextResponse.json({ error: "Domain auto-join requires a corporate account." }, { status: 403 });
  }

  let body: { orgDomain?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const raw = typeof body.orgDomain === "string" ? body.orgDomain.trim().toLowerCase() : "";

  if (raw && !DOMAIN_RE.test(raw)) {
    return NextResponse.json({ error: "Invalid domain format. Expected: company.co.ke" }, { status: 400 });
  }

  // Prevent admins from claiming a domain already owned by another org
  if (raw) {
    const { data: existing } = await db
      .from("hunter_orgs")
      .select("id")
      .ilike("org_domain", raw)
      .neq("id", orgId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "That domain is already registered to another organisation." }, { status: 409 });
    }
  }

  const { error } = await db
    .from("hunter_orgs")
    .update({
      org_domain:          raw || null,
      org_domain_verified: !!raw,
    })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, orgDomain: raw || null });
}
