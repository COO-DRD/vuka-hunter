"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { VERTICALS, STAGES } from "@/lib/utils";
import { MODE_OPTIONS } from "@/lib/enrichmentModes";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconSearch, IconStar, IconWorld, IconPhone, IconChevronRight,
  IconRefresh, IconBolt, IconAdjustments, IconX, IconExternalLink,
  IconCircleCheck,
} from "@tabler/icons-react";

interface Lead {
  id: string; name: string; vertical: string; city: string;
  phone: string; email: string; website: string;
  google_rating: number; google_review_count: number;
  score: number | null; stage: string;
  enrichment_status: string; created_at: string;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted">—</span>;
  const cls = score >= 70 ? "bg-success-lt text-success" : score >= 40 ? "bg-warning-lt text-warning" : "bg-secondary-lt text-secondary";
  return <span className={`badge ${cls}`}>{score}</span>;
}

function StageBadge({ stage }: { stage: string }) {
  const label = STAGES.find((s) => s.value === stage)?.label ?? stage;
  const cls: Record<string, string> = {
    new: "bg-secondary-lt text-secondary", contacted: "bg-info-lt text-info",
    replied: "bg-warning-lt text-warning", qualified: "bg-purple-lt text-purple",
    won: "bg-success-lt text-success", lost: "bg-danger-lt text-danger",
  };
  return <span className={`badge ${cls[stage] ?? cls.new}`}>{label}</span>;
}

export default function LeadsPage() {
  const [leads,          setLeads]         = useState<Lead[]>([]);
  const [loading,        setLoading]       = useState(true);
  const [selected,       setSelected]      = useState<Set<string>>(new Set());
  const [search,         setSearch]        = useState("");
  const [debouncedSearch,setDebouncedSearch] = useState("");
  const [filterV,        setFilterV]       = useState("");
  const [filterStage,    setFilterStage]   = useState("");
  const [filterScore,    setFilterScore]   = useState("");
  const [enriching,      setEnriching]     = useState<string | null>(null);
  const [enrichMode,     setEnrichMode]    = useState("general");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filterV)         params.set("vertical", filterV);
    if (filterStage)     params.set("stage", filterStage);
    if (filterScore)     params.set("min_score", filterScore);
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, [debouncedSearch, filterV, filterStage, filterScore]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function enrichLead(id: string) {
    setEnriching(id);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, mode: enrichMode }),
      });
      if (!res.ok) throw new Error();
      toast.success("Enriched — open lead to score");
      fetchLeads();
    } catch { toast.error("Enrichment failed"); }
    finally   { setEnriching(null); }
  }

  const allSelected = leads.length > 0 && selected.size === leads.length;
  function toggleAll() { setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id))); }
  function toggleOne(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  const hasFilters = !!(filterV || filterStage || filterScore || search);

  return (
    <div className="container-xl">
      {/* Page header */}
      <div className="page-header d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title d-flex align-items-center gap-2">
              Leads
              <span className="badge bg-secondary-lt text-secondary">{leads.length}</span>
            </h2>
          </div>
          <div className="col-auto d-flex gap-2">
            {/* Enrich mode */}
            <div className="input-group input-group-sm">
              <span className="input-group-text">
                <IconBolt size={14} stroke={1.5} className="text-warning" />
              </span>
              <select className="form-select form-select-sm" value={enrichMode} onChange={(e) => setEnrichMode(e.target.value)}>
                {MODE_OPTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <button onClick={fetchLeads} className="btn btn-sm btn-ghost-secondary" title="Refresh">
              <IconRefresh size={15} stroke={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {/* Filter toolbar */}
        <div className="card-header d-flex flex-wrap gap-2 align-items-center">
          <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
            <span className="input-group-text"><IconSearch size={14} /></span>
            <input
              type="text" className="form-control" placeholder="Search leads…"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <IconAdjustments size={15} className="text-muted ms-1" />
          <select className="form-select form-select-sm" style={{ width: "auto" }} value={filterV} onChange={(e) => setFilterV(e.target.value)}>
            <option value="">All verticals</option>
            {VERTICALS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
          <select className="form-select form-select-sm" style={{ width: "auto" }} value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
            <option value="">All stages</option>
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="form-select form-select-sm" style={{ width: "auto" }} value={filterScore} onChange={(e) => setFilterScore(e.target.value)}>
            <option value="">All scores</option>
            <option value="70">Hot 70+</option>
            <option value="40">Warm 40+</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setFilterV(""); setFilterStage(""); setFilterScore(""); setSearch(""); }}
              className="btn btn-ghost-secondary btn-sm gap-1">
              <IconX size={13} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-vcenter table-hover card-table">
            <thead>
              <tr>
                <th className="w-1">
                  <input type="checkbox" className="form-check-input m-0" checked={allSelected} onChange={toggleAll} />
                </th>
                <th>Company</th>
                <th>City</th>
                <th>Contact</th>
                <th>Rating</th>
                <th>Score</th>
                <th>Stage</th>
                <th>Actions</th>
                <th className="w-1" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center text-muted py-5">Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty py-5">
                      <p className="empty-title">No leads match your filters</p>
                      <div className="empty-action">
                        <Link href="/discover" className="btn btn-primary btn-sm">Discover leads →</Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className={selected.has(lead.id) ? "table-active" : ""} onClick={() => toggleOne(lead.id)} style={{ cursor: "pointer" }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="form-check-input m-0"
                      checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} />
                  </td>
                  <td>
                    <div className="fw-medium text-truncate" style={{ maxWidth: 180 }}>{lead.name}</div>
                    <div className="text-muted small text-capitalize">{lead.vertical}</div>
                  </td>
                  <td><span className="text-muted small">{lead.city || "—"}</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-1">
                      {lead.phone && <IconPhone size={14} className="text-muted" title={lead.phone} />}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <IconExternalLink size={14} className="text-muted" />
                        </a>
                      )}
                      {lead.email && (
                        <span className="text-muted small text-truncate" style={{ maxWidth: 120 }}>{lead.email}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {lead.google_rating ? (
                      <div className="d-flex align-items-center gap-1">
                        <IconStar size={12} className="text-warning" />
                        <span className="small">{lead.google_rating}</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td><ScoreBadge score={lead.score} /></td>
                  <td><StageBadge stage={lead.stage} /></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="d-flex gap-1">
                      {lead.enrichment_status !== "done" && (
                        <button onClick={() => enrichLead(lead.id)} disabled={enriching === lead.id}
                          className="btn btn-ghost-info btn-xs">
                          {enriching === lead.id ? "…" : "Enrich"}
                        </button>
                      )}
                      {lead.score === null && lead.enrichment_status === "done" && (
                        <Link href={`/leads/${lead.id}`} className="btn btn-ghost-warning btn-xs gap-1">
                          <IconBolt size={11} /> Score
                        </Link>
                      )}
                      {lead.enrichment_status === "done" && lead.score !== null && (
                        <IconCircleCheck size={15} className="text-success" />
                      )}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link href={`/leads/${lead.id}`} className="btn btn-ghost-secondary btn-xs">
                      <IconChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4 z-3">
          <div className="card shadow-lg px-4 py-2 d-flex flex-row align-items-center gap-3">
            <span className="text-muted small">{selected.size} selected</span>
            <div className="vr" />
            <button onClick={() => setSelected(new Set())} className="btn btn-ghost-secondary btn-sm">
              <IconX size={14} /> Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
