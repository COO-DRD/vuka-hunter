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
  const inviteToken = sanitize(searchParams.get("invite_token"), 200);
  const inviteOrg   = sanitize(searchParams.get("invite_org"),   200);

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

  // ── Corporate invite: accept via atomic seat-guarded function ─────────────
  if (inviteOrg && inviteToken) {
    const displayName = sanitize(user.user_metadata?.full_name ?? user.email, 100);
    const { data: result } = await db.rpc("fn_accept_invite_safe", {
      p_token:        inviteToken,
      p_user_id:      user.id,
      p_display_name: displayName,
    });

    switch (result) {
      case "ok":
        return NextResponse.redirect(new URL("/dashboard", req.url));
      case "full":
        return NextResponse.redirect(new URL("/sign-in?error=org_seats_full", req.url));
      case "expired":
        return NextResponse.redirect(new URL("/sign-in?error=invite_expired", req.url));
      default:
        // invalid_token or unknown: fall through to standard flow (creates own org)
        console.warn("[auth/callback] invite result:", result, "token:", inviteToken.slice(0, 8));
        return NextResponse.redirect(new URL("/sign-in?error=invite_invalid", req.url));
    }
  }

  // ── Standard flow: create or refresh the org row ─────────────────────────
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

  if (user.email_confirmed_at) {
    await db
      .from("hunter_orgs")
      .update({ email_verified_at: user.email_confirmed_at })
      .eq("id", user.id)
      .is("email_verified_at", null);
  }

  // ── Domain auto-join: check if new user's email domain matches a corporate org ─
  const emailDomain = user.email?.split("@")[1]?.toLowerCase();
  if (emailDomain) {
    const { data: joinedOrgId } = await db.rpc("fn_domain_auto_join", {
      p_user_id:     user.id,
      p_email_domain: emailDomain,
    });
    if (joinedOrgId) {
      console.log(`[auth/callback] auto-joined user ${user.id} to org ${joinedOrgId} via domain ${emailDomain}`);
    }
  }

  return NextResponse.redirect(new URL(safeNext, req.url));
}
