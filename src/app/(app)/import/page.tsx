"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROTOCOL, PROTOCOL_CITIES } from "@/lib/protocol";
import { Upload, FileText, CheckCircle, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ImportPage() {
  const [file, setFile]         = useState<File | null>(null);
  const [vertical, setVertical] = useState("");
  const [city, setCity]         = useState("Nairobi");
  const [importing, setImporting]   = useState(false);
  const [enriching, setEnriching]   = useState(false);
  const [scoring, setScoring]       = useState(false);
  const [result, setResult]         = useState<{ imported: number; total: number; filtered?: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("vertical", vertical);
    fd.append("city", city);

    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      toast.success(`${data.imported} leads imported`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function bulkEnrich() {
    setEnriching(true);
    try {
      const res = await fetch("/api/enrich/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100, minRating: 4 }),
      });
      const data = await res.json();
      toast.success(`Enriched ${data.enriched} / ${data.total} leads`);
    } catch { toast.error("Enrichment failed"); }
    finally { setEnriching(false); }
  }

  async function bulkScore() {
    setScoring(true);
    try {
      const res = await fetch("/api/score/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 30 }),
      });
      const data = await res.json();
      toast.success(`Scored ${data.scored} / ${data.total} leads`);
    } catch { toast.error("Scoring failed"); }
    finally { setScoring(false); }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Import CSV</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Upload any Hunter-compatible CSV to import leads</p>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Upload CSV</CardTitle></CardHeader>
        <CardContent>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`mb-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 cursor-pointer transition-colors ${
              file ? "border-green-600 bg-green-950/20" : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            {file ? (
              <>
                <FileText className="h-8 w-8 text-green-400 mb-2" />
                <p className="text-sm font-medium text-green-300">{file.name}</p>
                <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-400">Click to select a CSV file</p>
                <p className="text-xs text-zinc-600 mt-1">name, phone, email, website, address, google_rating…</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Vertical (optional)</label>
              <Select value={vertical} onChange={(e) => setVertical(e.target.value)}>
                <option value="">Auto-detect from CSV</option>
                {Object.values(PROTOCOL).map((v) => <option key={v.key} value={v.key}>[{v.tier}] {v.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">City (optional)</label>
              <Select value={city} onChange={(e) => setCity(e.target.value)}>
                {PROTOCOL_CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
          </div>

          <Button onClick={handleImport} loading={importing} disabled={!file} className="w-full">
            <Upload className="h-4 w-4" /> Import Leads
          </Button>
        </CardContent>
      </Card>

      {/* Result + next steps */}
      {result && (
        <Card className="mb-4 border-green-800">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  {result.imported} new leads imported
                  <span className="text-zinc-500 font-normal ml-1">({result.total} rows processed)</span>
                </p>
                <p className="text-xs text-zinc-500">
                  {result.filtered ? `${result.filtered} filtered by quality protocol · ` : ""}
                  Duplicates skipped automatically
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mb-3 font-medium">Next: Enrich → Score → Outreach</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={bulkEnrich} loading={enriching}>
                <RefreshCw className="h-3.5 w-3.5" /> Enrich all (★4+)
              </Button>
              <Button variant="outline" size="sm" onClick={bulkScore} loading={scoring}>
                <Zap className="h-3.5 w-3.5" /> Score enriched
              </Button>
              <Link href="/leads">
                <Button variant="ghost" size="sm">View leads →</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk actions (standalone) */}
      {!result && (
        <Card>
          <CardHeader><CardTitle>Bulk Actions</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 mb-3">Run on existing leads in your database</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={bulkEnrich} loading={enriching}>
                <RefreshCw className="h-3.5 w-3.5" /> Enrich 100 leads
              </Button>
              <Button variant="outline" size="sm" onClick={bulkScore} loading={scoring}>
                <Zap className="h-3.5 w-3.5" /> Score 30 leads
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
