import { createSupabaseServerClient, createSupabaseServiceClient } from "./supabase/server";
import { redirect } from "next/navigation";

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
