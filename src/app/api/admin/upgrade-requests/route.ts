import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = new Set(["ian.dullu@akamom.org", "dr.dullu@gmail.com"]);

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!ADMIN_EMAILS.has(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { id?: string; action?: "approve" | "reject" };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const { id, action } = body;
  if (!id || !action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "id and action required." }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  const { error } = await db
    .from("hunter_upgrade_requests")
    .update({
      status:      action === "approve" ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.email ?? user.id,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
