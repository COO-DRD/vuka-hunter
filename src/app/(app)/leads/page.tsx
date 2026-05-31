"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { VERTICALS, STAGES, scoreColor } from "@/lib/utils";
import { MODE_OPTIONS } from "@/lib/enrichmentModes";
import {
  Search, Star, Globe, Phone, ChevronRight,
  RefreshCw, Zap, SlidersHorizontal, X, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  vertical: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  google_rating: number;
  google_review_count: number;
  score: number | null;
  stage: string;
  enrichment_status: string;
  created_at: string;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span style={{ color: "var(--text-3)" }} className="text-xs">—</span>;
  const color = score >= 70 ? "#3fb950" : score >= 40 ? "#d29922" : "#8b949e";
  const bg    = score >= 70 ? "rgba(63,185,80,0.1)" : score >= 40 ? "rgba(210,153,34,0.1)" : "rgba(139,148,158,0.1)";
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-6 rounded text-xs font-bold tabular-nums"
      style={{ color, background: bg }}
    >
      {score}
    </span>
  );
}

function StagePill({ stage }: { stage: string }) {
  const label = STAGES.find((s) => s.value === stage)?.label ?? stage;
  const styles: Record<string, { color: string; bg: string }> = {
    new:       { color: "#8b949e", bg: "rgba(139,148,158,0.1)" },
    contacted: { color: "#58a6ff", bg: "rgba(88,166,255,0.1)"  },
    replied:   { color: "#d29922", bg: "rgba(210,153,34,0.1)"  },
    qualified: { color: "#bc8cff", bg: "rgba(188,140,255,0.1)" },
    won:       { color: "#3fb950", bg: "rgba(63,185,80,0.1)"   },
    lost:      { color: "#f85149", bg: "rgba(248,81,73,0.1)"   },
  };
  const s = styles[stage] ?? styles.new;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
      style={{ color: s.color, background: s.bg }}
    >
      {label}
    </span>
  );
}

function FilterChip({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const active = !!value;
  const display = active ? options.find((o) => o.value === value)?.label : label;
  return (
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all pr-6",
          "focus:outline-none"
        )}
        style={{
          background:  active ? "rgba(245,158,11,0.08)" : "var(--bg-elevated)",
          border:      `1px solid ${active ? "rgba(245,158,11,0.35)" : "var(--border)"}`,
          color:       active ? "#F59E0B" : "var(--text-2)",
        }}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {active && (
        <button
          onClick={(e) => { e.preventDefault(); onChange(""); }}
          className="absolute right-2 top-1/2 -translate-y-1/2"
          style={{ color: "#F59E0B" }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
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
    const res  = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, [debouncedSearch, filterV, filterStage, filterScore]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function enrichLead(id: string) {
    setEnriching(id);
    try {
      const res = await fetch("/api/enrich", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ leadId: id, mode: enrichMode }),
      });
      if (!res.ok) throw new Error();
      toast.success("Enriched — open lead to score");
      fetchLeads();
    } catch { toast.error("Enrichment failed"); }
    finally   { setEnriching(null); }
  }

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full">

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Leads</h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{ background: "var(--bg-elevated)", color: "var(--text-2)" }}
          >
            {leads.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Enrich mode selector */}
          <div
            className="flex items-center gap-1.5 rounded-md border px-2.5 h-8"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
          >
            <Zap className="h-3 w-3 shrink-0" style={{ color: "var(--brand)" }} />
            <select
              value={enrichMode}
              onChange={(e) => setEnrichMode(e.target.value)}
              className="text-xs border-0 bg-transparent focus:outline-none"
              style={{ color: "var(--text-2)" }}
            >
              {MODE_OPTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <button
            onClick={fetchLeads}
            className="flex items-center justify-center h-8 w-8 rounded-md border transition-colors hover:bg-stone-100"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-2 px-5 py-2.5 shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-52 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full rounded-full border pl-8 pr-3 py-1 text-xs transition-all focus:outline-none"
            style={{
              background:   "var(--bg-elevated)",
              borderColor:  "var(--border)",
              color:        "var(--text-1)",
            }}
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
          <FilterChip
            label="Vertical"
            value={filterV}
            options={VERTICALS}
            onChange={setFilterV}
          />
          <FilterChip
            label="Stage"
            value={filterStage}
            options={STAGES}
            onChange={setFilterStage}
          />
          <FilterChip
            label="Score"
            value={filterScore}
            options={[
              { value: "70", label: "Hot 70+" },
              { value: "40", label: "Warm 40+" },
            ]}
            onChange={setFilterScore}
          />
          {(filterV || filterStage || filterScore || search) && (
            <button
              onClick={() => { setFilterV(""); setFilterStage(""); setFilterScore(""); setSearch(""); }}
              className="text-xs rounded-full px-2.5 py-1 transition-colors hover:bg-white/5"
              style={{ color: "var(--text-3)" }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10" style={{ background: "var(--bg-surface)" }}>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded"
                  style={{ accentColor: "var(--brand)" }}
                />
              </th>
              {["Company", "City", "Contact", "Rating", "Score", "Stage", "Actions", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap"
                  style={{ color: "var(--text-3)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-14 text-center text-sm" style={{ color: "var(--text-3)" }}>
                  Loading…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-14 text-center">
                  <p className="text-sm mb-2" style={{ color: "var(--text-2)" }}>No leads match your filters</p>
                  <Link href="/discover" className="text-xs" style={{ color: "var(--brand)" }}>
                    Discover leads →
                  </Link>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={cn(
                    "transition-colors cursor-pointer",
                    selected.has(lead.id) ? "bg-amber-500/8" : "hover:bg-stone-50"
                  )}
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onClick={() => toggleOne(lead.id)}
                >
                  <td className="w-10 px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                      className="rounded"
                      style={{ accentColor: "var(--brand)" }}
                    />
                  </td>

                  {/* Company */}
                  <td className="px-3 py-2.5 max-w-52">
                    <p className="font-medium text-xs truncate" style={{ color: "var(--text-1)" }}>{lead.name}</p>
                    <p className="text-[11px] mt-0.5 truncate capitalize" style={{ color: "var(--text-3)" }}>{lead.vertical}</p>
                  </td>

                  {/* City */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs" style={{ color: "var(--text-2)" }}>{lead.city || "—"}</span>
                  </td>

                  {/* Contact */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {lead.phone && (
                        <span title={lead.phone}>
                          <Phone className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
                        </span>
                      )}
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={lead.website}
                        >
                          <ExternalLink className="h-3.5 w-3.5 transition-colors hover:text-amber-400" style={{ color: "var(--text-3)" }} />
                        </a>
                      )}
                      {lead.email && (
                        <span className="text-[11px] truncate max-w-28" style={{ color: "var(--text-2)" }}>{lead.email}</span>
                      )}
                    </div>
                  </td>

                  {/* Rating */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {lead.google_rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs" style={{ color: "var(--text-2)" }}>{lead.google_rating}</span>
                      </div>
                    ) : <span style={{ color: "var(--text-3)" }}>—</span>}
                  </td>

                  {/* Score */}
                  <td className="px-3 py-2.5">
                    <ScorePill score={lead.score} />
                  </td>

                  {/* Stage */}
                  <td className="px-3 py-2.5">
                    <StagePill stage={lead.stage} />
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {lead.enrichment_status !== "done" && (
                        <button
                          onClick={() => enrichLead(lead.id)}
                          disabled={enriching === lead.id}
                          className="text-[11px] px-2 py-1 rounded transition-colors disabled:opacity-40"
                          style={{
                            color:      "#58a6ff",
                            background: "rgba(88,166,255,0.08)",
                          }}
                          title="Enrich this lead"
                        >
                          {enriching === lead.id ? "…" : "Enrich"}
                        </button>
                      )}
                      {lead.score === null && lead.enrichment_status === "done" && (
                        <Link
                          href={`/leads/${lead.id}`}
                          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors"
                          style={{ color: "var(--brand)", background: "var(--brand-dim)" }}
                          title="Score with AI"
                        >
                          <Zap className="h-3 w-3" />
                          Score
                        </Link>
                      )}
                    </div>
                  </td>

                  {/* Open */}
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="transition-colors hover:text-amber-400"
                      style={{ color: "var(--text-3)" }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar — shows when rows selected */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl z-50 text-sm font-medium"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        >
          <span style={{ color: "var(--text-2)" }}>{selected.size} selected</span>
          <div className="w-px h-4" style={{ background: "var(--border)" }} />
          <button onClick={() => setSelected(new Set())} className="text-xs" style={{ color: "var(--text-3)" }}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
