import { auth } from "@clerk/nextjs/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function sanitize(raw: unknown, maxLen = 200): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").replace(/\0/g, "").trim().slice(0, maxLen);
}

// Handles post-sign-in invite acceptance.
// Clerk manages its own OAuth flow — this route only processes hunter_org_invites.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const next        = searchParams.get("next") ?? "/dashboard";
  const inviteToken = sanitize(searchParams.get("invite_token"), 200);
  const inviteOrg   = sanitize(searchParams.get("invite_org"),   200);

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!inviteOrg || !inviteToken) {
    return NextResponse.redirect(new URL(safeNext, req.url));
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const db = createSupabaseServiceClient();

  // Fetch the invitee's display name from their Clerk profile via the org member record,
  // falling back to the invite email stored in the invite row.
  const { data: invite } = await db
    .from("hunter_org_invites")
    .select("invited_email")
    .eq("token", inviteToken)
    .maybeSingle();

  const displayName = sanitize(invite?.invited_email ?? "", 100) || "Team member";

  const { data: result } = await db.rpc("fn_accept_invite_safe", {
    p_token:        inviteToken,
    p_user_id:      userId,
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
      console.warn("[auth/callback] invite result:", result, "token:", inviteToken.slice(0, 8));
      return NextResponse.redirect(new URL("/sign-in?error=invite_invalid", req.url));
  }
}
