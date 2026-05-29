import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { MODES } from "@/lib/enrichmentModes";

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mode } = await req.json();
  if (!mode || !(mode in MODES))
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from("hunter_orgs")
    .update({ enrichment_mode: mode })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, mode });
}
