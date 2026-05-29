import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function sanitize(raw: unknown, maxLen = 200): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").replace(/\0/g, "").trim().slice(0, maxLen);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code        = searchParams.get("code");
  const next        = searchParams.get("next") ?? "/dashboard";
  const inviteOrg   = searchParams.get("invite_org");
  const inviteToken = searchParams.get("invite_token");

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=link_expired", req.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/sign-in?error=link_expired", req.url));
  }

  const user = data.user;
  const db   = createSupabaseServiceClient();

  // ── Corporate invite: add user to org, don't create a new org ────────────
  if (inviteOrg && inviteToken) {
    const { data: invite } = await db
      .from("hunter_org_invites")
      .select("id, org_id, role, status, expires_at")
      .eq("token", inviteToken)
      .eq("org_id", inviteOrg)
      .eq("status", "pending")
      .maybeSingle();

    if (invite && new Date(invite.expires_at) > new Date()) {
      // Accept invite: add to members
      await db.from("hunter_org_members").upsert(
        {
          org_id:       invite.org_id,
          user_id:      user.id,
          role:         invite.role,
          status:       "active",
          display_name: sanitize(user.user_metadata?.full_name ?? user.email, 100),
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "org_id, user_id" }
      );

      // Mark invite accepted
      await db
        .from("hunter_org_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ── Standard flow: ensure org row exists ──────────────────────────────────
  const provider = sanitize(user.app_metadata?.provider ?? "email", 50) || "email";
  const rawName  = user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";
  const name     = sanitize(rawName, 100) || sanitize(user.email, 100) || "User";

  await db.from("hunter_orgs").upsert(
    {
      id:                  user.id,
      name,
      credits_total:       999999,
      credits_used:        0,
      auth_provider:       provider,
      subscription_status: "trialing",
      subscribed_plan:     "trial",
      trial_started_at:    new Date().toISOString(),
      trial_ends_at:       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // ── Stamp email_verified_at on first confirmation ─────────────────────────
  if (user.email_confirmed_at) {
    await db
      .from("hunter_orgs")
      .update({ email_verified_at: user.email_confirmed_at })
      .eq("id", user.id)
      .is("email_verified_at", null);
  }

  return NextResponse.redirect(new URL(safeNext, req.url));
}
