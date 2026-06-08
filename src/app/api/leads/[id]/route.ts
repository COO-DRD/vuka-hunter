import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getOrgId();

  const body = await req.json();
  const allowed = ["stage", "notes", "next_follow_up_at", "last_contacted_at"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k];
  }

  const db = createSupabaseServiceClient();
  const { error } = await db.from("hunter_leads").update(update).eq("id", id).eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
