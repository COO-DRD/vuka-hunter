import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { PROTOCOL, PROTOCOL_CITIES, applyProtocol } from "@/lib/protocol";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vertical, city, count = 100, source = "google_places" } = await req.json();
  if (!vertical || !city) return NextResponse.json({ error: "vertical and city required" }, { status: 400 });

  const vp = PROTOCOL[vertical];
  if (!vp) return NextResponse.json({ error: `"${vertical}" is not an approved vertical` }, { status: 400 });

  const approvedCity = PROTOCOL_CITIES.find((c) => c.value === city);
  if (!approvedCity) return NextResponse.json({ error: `"${city}" is not an approved city` }, { status: 400 });

  const db = createSupabaseServiceClient();

  // Ensure org row exists (hunter_orgs is Hunter SaaS — separate from VUKA tables)
  await db.from("hunter_orgs").upsert({ id: user.id, name: "My Workspace" }, { onConflict: "id", ignoreDuplicates: true });

  const { data: job, error } = await db.from("hunter_scrape_jobs").insert({
    org_id: user.id, vertical, city, count, source, status: "queued",
  }).select("id").single();

  if (error || !job) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

  runScrapeJob(job.id, user.id, vertical, city, count, source, vp.placeQuery);

  return NextResponse.json({ jobId: job.id });
}

async function runScrapeJob(
  jobId: string, orgId: string, vertical: string, city: string,
  count: number, source: string, placeQuery: string
) {
  const db = createSupabaseServiceClient();
  const tmpCsv = path.join(os.tmpdir(), `hunter_scrape_${jobId}.csv`);

  await db.from("hunter_scrape_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", jobId);

  try {
    const scriptDir = path.join(process.cwd(), "scripts");
    const scriptPath = path.join(scriptDir, source === "osm" ? "scrape_osm.py" : "scrape_places.py");

    // Use protocol's precise placeQuery (e.g. "private dental clinic") not the raw vertical key
    const args = source === "osm"
      ? [scriptPath, placeQuery, city, "--out", tmpCsv, "--vertical", vertical]
      : [scriptPath, placeQuery, city, "--count", String(count), "--out", tmpCsv, "--vertical", vertical];

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("python3", args, {
        env: { ...process.env, GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY ?? "" },
      });

      let progressCount = 0;
      proc.stdout.on("data", async (chunk: Buffer) => {
        const m = chunk.toString().match(/(\d+) total/);
        if (m) {
          progressCount = parseInt(m[1]);
          await db.from("hunter_scrape_jobs").update({ progress: progressCount, total: count }).eq("id", jobId);
        }
      });

      proc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Exit code ${code}`)));
      proc.on("error", reject);
    });

    const leadsImported = await importCsv(tmpCsv, orgId, jobId, vertical, city);

    await db.from("hunter_scrape_jobs").update({
      status: "done", progress: leadsImported, total: leadsImported,
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);

  } catch (err) {
    await db.from("hunter_scrape_jobs").update({
      status: "error", error: String(err), finished_at: new Date().toISOString(),
    }).eq("id", jobId);
  } finally {
    if (fs.existsSync(tmpCsv)) fs.unlinkSync(tmpCsv);
  }
}

async function importCsv(csvPath: string, orgId: string, jobId: string, vertical: string, city: string): Promise<number> {
  const db = createSupabaseServiceClient();
  if (!fs.existsSync(csvPath)) return 0;

  const lines = fs.readFileSync(csvPath, "utf-8").split("\n").filter(Boolean);
  if (lines.length < 2) return 0;

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? "").replace(/^"|"$/g, ""); });
    return obj;
  });

  const rawLeads = rows.filter((r) => r.name).map((r) => ({
    org_id: orgId, scrape_job_id: jobId, name: r.name, vertical, city,
    phone: r.phone || null, email: r.email || null,
    website: r.website || null, address: r.address || null,
    google_rating: r.google_rating ? parseFloat(r.google_rating) : null,
    google_review_count: r.google_review_count ? parseInt(r.google_review_count) : null,
    google_maps_url: r.google_maps_url || null,
    imported_by: "scraper",
  }));

  const { accepted, rejected } = applyProtocol(rawLeads);
  if (rejected.length) {
    console.log(`[Hunter] Protocol filtered ${rejected.length} leads from job ${jobId}:`,
      rejected.slice(0, 5).map((r) => `${r.lead.name}: ${r.reason}`));
  }

  if (!accepted.length) return 0;

  let imported = 0;
  for (let i = 0; i < accepted.length; i += 100) {
    const { data } = await db.from("hunter_leads")
      .upsert(accepted.slice(i, i + 100), { onConflict: "org_id,name", ignoreDuplicates: true })
      .select("id");
    imported += data?.length ?? 0;
  }
  return imported;
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
