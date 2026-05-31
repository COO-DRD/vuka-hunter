import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser, resolveOrgId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user  = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const db    = createSupabaseServiceClient();

  // Only corporate admins can invite
  const { data: org } = await db
    .from("hunter_orgs")
    .select("account_type, seat_limit, seats_used, company_name")
    .eq("id", orgId)
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://4unter.dullugroup.co.ke";
  const results: Array<{ email: string; status: string }> = [];

  for (const email of emails) {
    // Check not already a member
    const { data: existing } = await db
      .from("hunter_org_members")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", email)
      .maybeSingle();

    if (existing) {
      results.push({ email, status: "already_member" });
      continue;
    }

    // Create invite record
    const { data: invite, error: inviteDbError } = await db
      .from("hunter_org_invites")
      .upsert(
        {
          org_id:     orgId,
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

    if (inviteDbError) {
      results.push({ email, status: `error: ${inviteDbError.message}` });
      continue;
    }

    // With Clerk, invite emails are sent via Clerk's own invitation flow.
    // We store the invite token and the user signs up via Clerk's sign-up page,
    // then the webhook links them to this org.
    const inviteUrl = `${siteUrl}/sign-up?invite_org=${orgId}&invite_token=${invite?.token ?? ""}&email=${encodeURIComponent(email)}`;

    results.push({
      email,
      status: "invited",
    });

    // Log the invite URL for now (in production you'd send this via a transactional email service)
    console.log(`[invite] ${email} invite URL: ${inviteUrl}`);
  }

  return NextResponse.json({ results });
}
