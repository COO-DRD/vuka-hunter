"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PROTOCOL, PROTOCOL_CITIES } from "@/lib/protocol";
import {
  IconUpload, IconFileText, IconCircleCheck, IconBolt, IconRefresh,
} from "@tabler/icons-react";
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
    <div className="container-xl" style={{ maxWidth: 680 }}>
      <div className="page-header d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">Import CSV</h2>
            <div className="text-muted mt-1 small">Upload any 4unter-compatible CSV to bulk-import leads</div>
          </div>
        </div>
      </div>

      {/* Upload card */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">Upload CSV</h3>
        </div>
        <div className="card-body">
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`mb-4 d-flex flex-column align-items-center justify-content-center rounded border-2 border-dashed py-5 cursor-pointer`}
            style={{
              borderStyle: "dashed",
              borderColor: file ? "var(--tblr-success)" : "var(--border)",
              background: file ? "rgba(var(--tblr-success-rgb, 47, 179, 135), 0.04)" : "var(--bg-elevated)",
              transition: "border-color 0.15s, background 0.15s",
              cursor: "pointer",
            }}
          >
            {file ? (
              <>
                <IconFileText size={28} stroke={1.5} className="text-success mb-2" />
                <div className="fw-medium text-success small">{file.name}</div>
                <div className="text-muted small mt-1">{(file.size / 1024).toFixed(1)} KB</div>
              </>
            ) : (
              <>
                <IconUpload size={28} stroke={1.5} className="text-muted mb-2" />
                <div className="text-muted small">Click to select a CSV file</div>
                <div className="text-muted mt-1" style={{ fontSize: "0.72rem" }}>
                  name, phone, email, website, address, google_rating…
                </div>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="d-none"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-6">
              <label className="form-label text-muted small mb-1">Vertical (optional)</label>
              <Select value={vertical} onChange={(e) => setVertical(e.target.value)}>
                <option value="">Auto-detect from CSV</option>
                {Object.values(PROTOCOL).map((v) => (
                  <option key={v.key} value={v.key}>[{v.tier}] {v.label}</option>
                ))}
              </Select>
            </div>
            <div className="col-6">
              <label className="form-label text-muted small mb-1">City (optional)</label>
              <Select value={city} onChange={(e) => setCity(e.target.value)}>
                {PROTOCOL_CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
          </div>

          <Button onClick={handleImport} loading={importing} disabled={!file} className="w-100">
            <IconUpload size={16} stroke={1.5} className="me-2" />
            Import Leads
          </Button>
        </div>
      </div>

      {/* Import result */}
      {result && (
        <div className="card mb-4" style={{ borderColor: "var(--tblr-success)" }}>
          <div className="card-body">
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="avatar bg-success-lt text-success">
                <IconCircleCheck size={20} stroke={1.5} />
              </span>
              <div>
                <div className="fw-semibold">
                  {result.imported} new leads imported
                  <span className="fw-normal text-muted ms-1">({result.total} rows processed)</span>
                </div>
                <div className="text-muted small">
                  {result.filtered ? `${result.filtered} filtered by quality protocol · ` : ""}
                  Duplicates skipped automatically
                </div>
              </div>
            </div>
            <div className="text-muted small mb-3">Next: Enrich → Score → Outreach</div>
            <div className="d-flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={bulkEnrich} loading={enriching}>
                <IconRefresh size={14} stroke={1.5} className="me-1" />
                Enrich all (★4+)
              </Button>
              <Button variant="outline" size="sm" onClick={bulkScore} loading={scoring}>
                <IconBolt size={14} stroke={1.5} className="me-1" />
                Score enriched
              </Button>
              <Link href="/leads">
                <Button variant="ghost" size="sm">View leads →</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {!result && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Bulk Actions</h3>
          </div>
          <div className="card-body">
            <div className="text-muted small mb-3">Run on existing leads in your database</div>
            <div className="d-flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={bulkEnrich} loading={enriching}>
                <IconRefresh size={14} stroke={1.5} className="me-1" />
                Enrich 100 leads
              </Button>
              <Button variant="outline" size="sm" onClick={bulkScore} loading={scoring}>
                <IconBolt size={14} stroke={1.5} className="me-1" />
                Score 30 leads
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
