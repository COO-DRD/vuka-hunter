import { createSupabaseServerClient, createSupabaseServiceClient } from "./supabase/server";
import { redirect } from "next/navigation";

// ── Trial / access guard ───────────────────────────────────────────────────

export interface OrgAccess {
  allowed:        boolean;
  reason?:        "trial_expired" | "payment_failed" | "cancelled" | "suspended";
  daysLeft?:      number;
  plan:           string;
  status:         string;
  isTrialing:     boolean;
  trialEndsAt:    Date | null;
  accountType:    string;
  /** Max leads allowed during trial (irrelevant for paid plans). */
  trialLeadLimit: number;
}

export async function checkOrgAccess(orgId: string): Promise<OrgAccess> {
  const db = createSupabaseServiceClient();
  const { data: org } = await db
    .from("hunter_orgs")
    .select("subscribed_plan, subscription_status, trial_ends_at, account_type")
    .eq("id", orgId)
    .single();

  if (!org) {
    return { allowed: false, reason: "suspended", plan: "unknown", status: "unknown", isTrialing: false, trialEndsAt: null, accountType: "individual", trialLeadLimit: 100 };
  }

  const status        = org.subscription_status ?? "trialing";
  const plan          = org.subscribed_plan     ?? "trial";
  const accountType   = org.account_type        ?? "individual";
  const trialEndsAt   = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const isTrialing    = status === "trialing";
  const trialLeadLimit = accountType === "corporate" ? 300 : 100;

  // Active paid subscription — unrestricted
  if (status === "active" && plan !== "trial") {
    return { allowed: true, plan, status, isTrialing: false, trialEndsAt, accountType, trialLeadLimit };
  }

  // Trial — check expiry
  if (isTrialing) {
    if (!trialEndsAt) {
      return { allowed: true, plan, status, isTrialing, trialEndsAt, accountType, trialLeadLimit, daysLeft: 999 };
    }
    if (new Date() > trialEndsAt) {
      return { allowed: false, reason: "trial_expired", plan, status, isTrialing, trialEndsAt, accountType, trialLeadLimit };
    }
    const daysLeft = Math.max(1, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000));
    return { allowed: true, plan, status, isTrialing, trialEndsAt, accountType, trialLeadLimit, daysLeft };
  }

  // Past due / unpaid
  if (status === "past_due" || status === "unpaid") {
    return { allowed: false, reason: "payment_failed", plan, status, isTrialing: false, trialEndsAt, accountType, trialLeadLimit };
  }

  // Cancelled or explicitly ended
  if (status === "cancelled") {
    return { allowed: false, reason: "cancelled", plan, status, isTrialing: false, trialEndsAt, accountType, trialLeadLimit };
  }

  // Fallback: allow (covers paused, unknown states)
  return { allowed: true, plan, status, isTrialing: false, trialEndsAt, accountType, trialLeadLimit };
}

/** Standard 402 payload returned by gated API routes. */
export const ACCESS_DENIED: Record<NonNullable<OrgAccess["reason"]>, string> = {
  trial_expired:  "Your free trial has ended. Upgrade to continue using Hunter.",
  payment_failed: "Your subscription payment failed. Update your payment method to restore access.",
  cancelled:      "Your subscription has been cancelled. Reactivate to continue.",
  suspended:      "Your account has been suspended. Contact support.",
};

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Returns the corporate org_id for invited members, user.id for solo accounts.
// All API routes that read/write org data must use this instead of user.id directly.
export async function resolveOrgId(userId: string): Promise<string> {
  const db = createSupabaseServiceClient();
  const { data } = await db.rpc("fn_resolve_org_id", { p_user_id: userId });
  return (data as string | null) ?? userId;
}

// Returns the member's role within their resolved org, or null if not a member.
// 'admin' is returned when userId === orgId (the org owner).
export async function getMemberRole(
  userId: string,
  orgId: string
): Promise<"admin" | "member" | null> {
  if (userId === orgId) return "admin";
  const db = createSupabaseServiceClient();
  const { data } = await db
    .from("hunter_org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return (data?.role as "admin" | "member" | null) ?? null;
}
