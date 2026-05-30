import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser, getMemberRole } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

type RouteCtx = { params: Promise<{ userId: string }> };

// PATCH — suspend or reinstate a member
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const { userId: targetUserId } = await params;
  const admin = await requireUser();
  const db    = createSupabaseServiceClient();

  // Requester must be the org admin (org owner)
  const role = await getMemberRole(admin.id, admin.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "Only the organisation admin can manage members." }, { status: 403 });
  }

  // Confirm the org exists and is corporate
  const { data: org } = await db
    .from("hunter_orgs")
    .select("account_type, seat_limit")
    .eq("id", admin.id)
    .single();

  if (org?.account_type !== "corporate") {
    return NextResponse.json({ error: "Member management requires a corporate account." }, { status: 403 });
  }

  let body: { action: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  if (!["suspend", "reinstate"].includes(body.action)) {
    return NextResponse.json({ error: "action must be 'suspend' or 'reinstate'." }, { status: 400 });
  }

  // Cannot modify own record
  if (targetUserId === admin.id) {
    return NextResponse.json({ error: "Cannot modify your own membership." }, { status: 400 });
  }

  // On reinstate: check seat headroom
  if (body.action === "reinstate") {
    const { data: orgFresh } = await db
      .from("hunter_orgs")
      .select("seat_limit, seats_used")
      .eq("id", admin.id)
      .single();
    if (orgFresh && orgFresh.seats_used >= orgFresh.seat_limit) {
      return NextResponse.json({ error: "No seats available. Upgrade your plan to reinstate this member." }, { status: 403 });
    }
  }

  const newStatus = body.action === "suspend" ? "suspended" : "active";

  const { error } = await db
    .from("hunter_org_members")
    .update({ status: newStatus })
    .eq("org_id", admin.id)
    .eq("user_id", targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: newStatus });
}

// DELETE — permanently remove a member from the org
export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  const { userId: targetUserId } = await params;
  const admin = await requireUser();
  const db    = createSupabaseServiceClient();

  const role = await getMemberRole(admin.id, admin.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "Only the organisation admin can remove members." }, { status: 403 });
  }

  const { data: org } = await db
    .from("hunter_orgs")
    .select("account_type")
    .eq("id", admin.id)
    .single();

  if (org?.account_type !== "corporate") {
    return NextResponse.json({ error: "Member management requires a corporate account." }, { status: 403 });
  }

  if (targetUserId === admin.id) {
    return NextResponse.json({ error: "Cannot remove yourself from the organisation." }, { status: 400 });
  }

  const { error } = await db
    .from("hunter_org_members")
    .delete()
    .eq("org_id", admin.id)
    .eq("user_id", targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Expire any pending invites the admin sent this user
  await db
    .from("hunter_org_invites")
    .update({ status: "expired" })
    .eq("org_id", admin.id)
    .eq("status", "pending")
    .ilike("email", `%@%`);

  return NextResponse.json({ ok: true });
}
