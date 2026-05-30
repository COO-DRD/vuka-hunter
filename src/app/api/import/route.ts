import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser, resolveOrgId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { applyProtocol } from "@/lib/protocol";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await resolveOrgId(user.id);

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const vertical = (formData.get("vertical") as string) ?? "";
  const city     = (formData.get("city") as string) ?? "";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });

  const text = await file.text();
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  if (!headers.includes("name")) {
    return NextResponse.json({
      error: `CSV missing required "name" column. Found columns: ${headers.join(", ")}. Expected: name, phone, email, website, address, google_rating, google_review_count, google_maps_url`,
    }, { status: 400 });
  }

  const db = createSupabaseServiceClient();
  await db.from("hunter_orgs").upsert({ id: orgId, name: "My Workspace" }, { onConflict: "id", ignoreDuplicates: true });

  const leads = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? "").replace(/^"|"$/g, ""); });
    return {
      org_id:     orgId,
      created_by: user.id,
      name: obj.name ?? "",
      vertical: obj.vertical || vertical || null,
      city: obj.city || city || null,
      phone: obj.phone || null, email: obj.email || null,
      website: obj.website || null, address: obj.address || null,
      google_rating: obj.google_rating ? parseFloat(obj.google_rating) : null,
      google_review_count: obj.google_review_count ? parseInt(obj.google_review_count) : null,
      google_maps_url: obj.google_maps_url || null,
      imported_by: "csv_upload",
    };
  }).filter((l) => l.name);

  if (!leads.length) return NextResponse.json({ error: "No valid rows" }, { status: 400 });

  const { accepted, rejected } = applyProtocol(leads);
  if (rejected.length) {
    console.log(`[Hunter] CSV import filtered ${rejected.length} leads not meeting protocol`);
  }

  if (!accepted.length) {
    return NextResponse.json({
      ok: false, imported: 0, total: leads.length,
      filtered: rejected.length,
      error: "All rows were filtered out by the quality protocol (rating/review minimums not met)",
    }, { status: 422 });
  }

  let imported = 0;
  for (let i = 0; i < accepted.length; i += 100) {
    const { data } = await db.from("hunter_leads")
      .upsert(accepted.slice(i, i + 100), { onConflict: "org_id,name", ignoreDuplicates: true })
      .select("id");
    imported += data?.length ?? 0;
  }

  return NextResponse.json({ ok: true, imported, total: leads.length, filtered: rejected.length });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "", inQuotes = false;
  for (const c of line) {
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) { result.push(cur); cur = ""; }
    else cur += c;
  }
  result.push(cur);
  return result;
}
