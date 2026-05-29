import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const db   = createSupabaseServiceClient();

  // Only corporate admins can invite
  const { data: org } = await db
    .from("hunter_orgs")
    .select("account_type, seat_limit, seats_used, company_name")
    .eq("id", user.id)
    .single();

  if (org?.account_type !== "corporate") {
    return NextResponse.json({ error: "Invites are only available on corporate accounts." }, { status: 403 });
  }

  const available = (org.seat_limit ?? 5) - (org.seats_used ?? 1);
  if (available <= 0) {
    return NextResponse.json({ error: "No seats available. Upgrade your plan to add more members." }, { status: 403 });
  }

  let body: { emails: string[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const emails: string[] = (body.emails ?? [])
    .map((e: string) => e.trim().toLowerCase())
    .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
    .slice(0, available);

  if (emails.length === 0) {
    return NextResponse.json({ error: "Provide at least one valid email address." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hunter.dullugroup.co.ke";
  const results: Array<{ email: string; status: string }> = [];

  for (const email of emails) {
    // Check not already a member
    const { data: existing } = await db
      .from("hunter_org_members")
      .select("id")
      .eq("org_id", user.id)
      .eq("user_id", email)
      .maybeSingle();

    if (existing) {
      results.push({ email, status: "already_member" });
      continue;
    }

    // Create invite record
    const { data: invite } = await db
      .from("hunter_org_invites")
      .upsert(
        {
          org_id:     user.id,
          email,
          role:       "member",
          status:     "pending",
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "org_id, lower(email)" }
      )
      .select("token")
      .single();

    // Send invite via Supabase Auth (sends email with set-password link)
    const redirectTo = `${siteUrl}/auth/callback?invite_org=${user.id}&invite_token=${invite?.token ?? ""}`;
    const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { invited_to_org: user.id, org_name: org.company_name ?? "your organisation" },
    });

    results.push({
      email,
      status: inviteError ? `error: ${inviteError.message}` : "invited",
    });
  }

  return NextResponse.json({ results });
}
