import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "./supabase/server";

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

  if (status === "active" && plan !== "trial") {
    return { allowed: true, plan, status, isTrialing: false, trialEndsAt, accountType, trialLeadLimit };
  }

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

  if (status === "past_due" || status === "unpaid") {
    return { allowed: false, reason: "payment_failed", plan, status, isTrialing: false, trialEndsAt, accountType, trialLeadLimit };
  }

  if (status === "cancelled") {
    return { allowed: false, reason: "cancelled", plan, status, isTrialing: false, trialEndsAt, accountType, trialLeadLimit };
  }

  return { allowed: true, plan, status, isTrialing: false, trialEndsAt, accountType, trialLeadLimit };
}

export const ACCESS_DENIED: Record<NonNullable<OrgAccess["reason"]>, string> = {
  trial_expired:  "Your free trial has ended. Upgrade to continue using 4unter.",
  payment_failed: "Your subscription payment failed. Update your payment method to restore access.",
  cancelled:      "Your subscription has been cancelled. Reactivate to continue.",
  suspended:      "Your account has been suspended. Contact support.",
};

// ── Auth helpers (Clerk) ───────────────────────────────────────────────────

export async function requireUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  return {
    id:    userId,
    email: clerkUser?.emailAddresses[0]?.emailAddress ?? "",
  };
}

export async function getUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const clerkUser = await currentUser();
  return {
    id:    userId,
    email: clerkUser?.emailAddresses[0]?.emailAddress ?? "",
  };
}

// Returns the internal org UUID for a Clerk user ID.
// For org owners: looks up hunter_orgs.clerk_id.
// For team members: looks up hunter_org_members.user_id.
// Falls back to creating an org if the webhook hasn't fired yet.
export async function resolveOrgId(clerkUserId: string): Promise<string> {
  const db = createSupabaseServiceClient();

  const { data: org } = await db
    .from("hunter_orgs")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();
  if (org) return org.id;

  const { data: member } = await db
    .from("hunter_org_members")
    .select("org_id")
    .eq("user_id", clerkUserId)
    .eq("status", "active")
    .maybeSingle();
  if (member) return member.org_id;

  // Webhook may not have fired yet — create the org row now
  const orgId = crypto.randomUUID();
  await db.from("hunter_orgs").insert({
    id:               orgId,
    clerk_id:         clerkUserId,
    trial_started_at: new Date().toISOString(),
    trial_ends_at:    new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  return orgId;
}

export async function getMemberRole(
  clerkUserId: string,
  orgId: string
): Promise<"admin" | "member" | null> {
  const db = createSupabaseServiceClient();

  // Owner check: is this user the org's clerk_id?
  const { data: org } = await db
    .from("hunter_orgs")
    .select("id")
    .eq("id", orgId)
    .eq("clerk_id", clerkUserId)
    .maybeSingle();
  if (org) return "admin";

  const { data } = await db
    .from("hunter_org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", clerkUserId)
    .eq("status", "active")
    .maybeSingle();
  return (data?.role as "admin" | "member" | null) ?? null;
}
