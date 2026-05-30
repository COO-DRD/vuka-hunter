"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VERTICALS, STAGES, scoreColor } from "@/lib/utils";
import { MODE_OPTIONS } from "@/lib/enrichmentModes";
import {
  Search, Star, Globe, Phone, ChevronRight,
  RefreshCw, Filter, Zap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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

const STAGE_COLORS: Record<string, "default"|"blue"|"yellow"|"purple"|"green"|"red"> = {
  new: "default", contacted: "blue", replied: "yellow",
  qualified: "purple", won: "green", lost: "red",
};

export default function LeadsPage() {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterV, setFilterV]     = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterScore, setFilterScore] = useState("");
  const [enriching, setEnriching]       = useState<string | null>(null);
  const [enrichMode, setEnrichMode]     = useState("general");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search — avoid firing on every keystroke
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, mode: enrichMode }),
      });
      if (!res.ok) throw new Error("Enrichment failed");
      toast.success("Enriched — open lead to score with AI");
      fetchLeads();
    } catch { toast.error("Enrichment failed"); }
    finally { setEnriching(null); }
  }

  // Score uses SSE — only works in the lead detail page. Direct from list, just navigate.
  function scoreLead(id: string) {
    window.location.href = `/leads/${id}`;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Leads</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{leads.length} leads</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchLeads}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filterV} onChange={(e) => setFilterV(e.target.value)} className="w-44 h-8 text-xs">
          <option value="">All verticals</option>
          {VERTICALS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </Select>
        <Select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="w-36 h-8 text-xs">
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select value={filterScore} onChange={(e) => setFilterScore(e.target.value)} className="w-36 h-8 text-xs">
          <option value="">Any score</option>
          <option value="70">Hot (70+)</option>
          <option value="40">Warm (40+)</option>
        </Select>
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-2.5 h-8">
          <Zap className="h-3 w-3 text-amber-400 shrink-0" />
          <Select
            value={enrichMode}
            onChange={(e) => setEnrichMode(e.target.value)}
            className="h-6 text-xs border-0 bg-transparent p-0 pr-6 focus:ring-0"
            title="Enrichment intelligence mode — applies when you click Enrich on a lead"
          >
            {MODE_OPTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Business</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Contact</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Rating</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Score</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Stage</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Actions</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500 text-sm">Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center">
                <Filter className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No leads found</p>
                <Link href="/discover" className="text-xs text-amber-400 hover:underline">Discover some →</Link>
              </td></tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-200 truncate max-w-48">{lead.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{lead.vertical} · {lead.city}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {lead.phone && <span title={lead.phone}><Phone className="h-3.5 w-3.5 text-zinc-500" /></span>}
                      {lead.email && <span className="text-xs text-zinc-300 truncate max-w-32">{lead.email}</span>}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <Globe className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {lead.google_rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-zinc-300">{lead.google_rating}</span>
                        <span className="text-xs text-zinc-600">({lead.google_review_count})</span>
                      </div>
                    ) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.score !== null ? (
                      <span className={`text-sm font-bold ${scoreColor(lead.score)}`}>{lead.score}</span>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STAGE_COLORS[lead.stage] ?? "default"}>
                      {STAGES.find((s) => s.value === lead.stage)?.label ?? lead.stage}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {lead.enrichment_status !== "done" && (
                        <button
                          onClick={() => enrichLead(lead.id)}
                          disabled={enriching === lead.id}
                          className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                          title="Enrich"
                        >
                          {enriching === lead.id ? "…" : "Enrich"}
                        </button>
                      )}
                      {lead.score === null && lead.enrichment_status === "done" && (
                        <Link
                          href={`/leads/${lead.id}`}
                          className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                          title="Open to score with AI"
                        >
                          <Zap className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="text-zinc-500 hover:text-zinc-300">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
