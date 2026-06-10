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

export async function checkOrgAccess(_orgId: string): Promise<OrgAccess> {
  return { allowed: true, plan: "active", status: "active", isTrialing: false, trialEndsAt: null, accountType: "individual", trialLeadLimit: 999999 };
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

  // Webhook may not have fired yet — create the org row now.
  // name is NOT NULL with no default; use clerkUserId as placeholder
  // (onboarding will overwrite it with the real business name).
  const orgId = crypto.randomUUID();
  await db.from("hunter_orgs").insert({
    id:               orgId,
    clerk_id:         clerkUserId,
    name:             clerkUserId,
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
