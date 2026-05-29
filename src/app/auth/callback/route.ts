import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** Strip HTML tags and null bytes. Hard-truncate to maxLen. */
function sanitize(raw: unknown, maxLen = 200): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLen);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/dashboard";

  // Reject obviously bad `next` values (open-redirect guard)
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
  const db = createSupabaseServiceClient();

  // Ensure hunter_orgs row exists for this user.
  // For OAuth users this runs on first sign-in; for email users the signup
  // API already creates it, so ignoreDuplicates=true is safe.
  const provider = sanitize(user.app_metadata?.provider ?? "email", 50) || "email";
  const rawName  = user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";
  const name     = sanitize(rawName, 100) || sanitize(user.email, 100) || "User";

  const { error: upsertErr } = await db.from("hunter_orgs").upsert(
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

  if (upsertErr) {
    console.error("[auth/callback] hunter_orgs upsert failed:", upsertErr.message);
  }

  return NextResponse.redirect(new URL(safeNext, req.url));
}
