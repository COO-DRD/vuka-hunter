"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROTOCOL, PROTOCOL_CITIES } from "@/lib/protocol";
import { Search, CheckCircle, XCircle, Clock, Loader2, ShieldCheck, Star, SlidersHorizontal, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface JobStatus {
  id: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  total: number;
  error?: string;
  leadsFound?: number;
}

const PROTOCOL_VERTICALS = Object.values(PROTOCOL);

export default function DiscoverPage() {
  const [vertical, setVertical] = useState(PROTOCOL_VERTICALS[0].key);
  const [city, setCity]         = useState(PROTOCOL_CITIES[0].value);
  const [count, setCount]       = useState("100");
  const [source, setSource]     = useState("google_places");
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob]           = useState<JobStatus | null>(null);
  const pollRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedVp = PROTOCOL[vertical];

  // Per-job threshold overrides — reset to vertical defaults when vertical changes
  const [showThresholds, setShowThresholds] = useState(false);
  const [minRating, setMinRating]   = useState(String(selectedVp?.minRating ?? 0));
  const [minReviews, setMinReviews] = useState(String(selectedVp?.minReviews ?? 0));

  useEffect(() => {
    const vp = PROTOCOL[vertical];
    if (vp) {
      setMinRating(String(vp.minRating));
      setMinReviews(String(vp.minReviews));
    }
  }, [vertical]);

  const defaultRating  = selectedVp?.minRating ?? 0;
  const defaultReviews = selectedVp?.minReviews ?? 0;
  const ratingChanged  = parseFloat(minRating)  !== defaultRating;
  const reviewsChanged = parseInt(minReviews)   !== defaultReviews;

  async function startScrape() {
    setSubmitting(true);
    setJob(null);
    try {
      const body: Record<string, unknown> = { vertical, city, count: parseInt(count), source };
      if (ratingChanged)  body.minRatingOverride  = parseFloat(minRating);
      if (reviewsChanged) body.minReviewsOverride = parseInt(minReviews);
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 402) {
        window.location.href = "/upgrade";
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to start job");

      const newJob: JobStatus = { id: data.jobId, status: "queued", progress: 0, total: parseInt(count) };
      setJob(newJob);
      toast.success("Scrape job started");

      pollRef.current = setInterval(async () => {
        const s = await fetch(`/api/scrape/${data.jobId}/status`).then((r) => r.json());
        setJob(s);
        if (s.status === "done" || s.status === "error") {
          clearInterval(pollRef.current!);
          if (s.status === "done") toast.success(`${s.leadsFound} leads imported`);
          else toast.error(`Scrape failed: ${s.error}`);
        }
      }, 2000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  const pct = job ? Math.round((job.progress / Math.max(job.total, 1)) * 100) : 0;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Discover Leads</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Multi-source prospecting — run Google Places, Foursquare, and OSM separately to catch businesses that aren&apos;t listed on all three. Each run stacks on top of the last.
        </p>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>New Scrape Job</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Vertical</label>
              <Select value={vertical} onChange={(e) => setVertical(e.target.value)}>
                {PROTOCOL_VERTICALS.map((v) => (
                  <option key={v.key} value={v.key}>
                    [{v.tier}] {v.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">City</label>
              <Select value={city} onChange={(e) => setCity(e.target.value)}>
                {PROTOCOL_CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Max leads</label>
              <Select value={count} onChange={(e) => setCount(e.target.value)}>
                {["50", "100", "200", "500"].map((n) => (
                  <option key={n} value={n}>{n} leads</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Data source</label>
              <Select value={source} onChange={(e) => setSource(e.target.value)}>
                <optgroup label="Live sources">
                  <option value="google_places">Google Places — richest data, broader coverage</option>
                  <option value="foursquare">Foursquare Places — different dataset, catches non-Google listings</option>
                  <option value="osm">OpenStreetMap — free, community-maintained, no quota</option>
                </optgroup>
                <optgroup label="Coming soon">
                  <option value="facebook" disabled>Facebook Places — SMBs with no website (coming soon)</option>
                  <option value="linkedin" disabled>LinkedIn Companies — corporate & B2B leads (coming soon)</option>
                  <option value="kenbrs" disabled>Kenya Business Registry — registered companies (coming soon)</option>
                </optgroup>
              </Select>
            </div>
          </div>

          {/* Protocol panel — collapsible, with per-job threshold adjustment */}
          {selectedVp && (
            <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900/60 text-xs overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-2 px-3 py-2.5 text-zinc-300 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Protocol — {selectedVp.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  selectedVp.tier === "A" ? "bg-amber-900 text-amber-300" : "bg-yellow-900 text-yellow-300"
                }`}>
                  Tier {selectedVp.tier}
                </span>
                <button
                  type="button"
                  onClick={() => setShowThresholds((v) => !v)}
                  className={`ml-auto flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    showThresholds ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  } ${(ratingChanged || reviewsChanged) ? "ring-1 ring-amber-500/50" : ""}`}
                  title="Adjust quality thresholds for this job"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Adjust</span>
                  {(ratingChanged || reviewsChanged) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              </div>

              {/* Default threshold summary */}
              <div className="flex items-center gap-4 px-3 pb-2.5 text-zinc-400">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400" />
                  Min rating:
                  <span className={`ml-1 ${ratingChanged ? "text-amber-300 line-through opacity-50" : "text-zinc-200"}`}>
                    {selectedVp.minRating}
                  </span>
                  {ratingChanged && <span className="text-amber-300 ml-1">{minRating}</span>}
                </span>
                <span>
                  Min reviews:
                  <span className={`ml-1 ${reviewsChanged ? "text-amber-300 line-through opacity-50" : "text-zinc-200"}`}>
                    {selectedVp.minReviews}
                  </span>
                  {reviewsChanged && <span className="text-amber-300 ml-1">{minReviews}</span>}
                </span>
              </div>

              {/* Expandable adjustment section */}
              {showThresholds && (
                <div className="border-t border-zinc-700 bg-zinc-950/40 px-3 py-3 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-400 font-medium">Thresholds for this job only</span>
                    {(ratingChanged || reviewsChanged) && (
                      <button
                        type="button"
                        onClick={() => { setMinRating(String(defaultRating)); setMinReviews(String(defaultReviews)); }}
                        className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-500 mb-1.5">
                        Min rating <span className="text-zinc-600">(0 – 5)</span>
                      </label>
                      <Input
                        type="number"
                        min="0" max="5" step="0.1"
                        value={minRating}
                        onChange={(e) => setMinRating(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1.5">
                        Min reviews <span className="text-zinc-600">(0 – 500)</span>
                      </label>
                      <Input
                        type="number"
                        min="0" max="500" step="1"
                        value={minReviews}
                        onChange={(e) => setMinReviews(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-zinc-600 leading-snug">
                    Lower thresholds let in more leads; higher thresholds keep only the highest-quality businesses.
                    Global defaults are preserved — this only affects the job you&apos;re about to run.
                  </p>
                </div>
              )}

              <p className="px-3 pb-2.5 text-zinc-600">{selectedVp.notes}</p>
            </div>
          )}

          <Button onClick={startScrape} loading={submitting} className="w-full">
            <Search className="h-4 w-4" />
            Start Scraping
          </Button>
        </CardContent>
      </Card>

      {/* Job progress */}
      {job && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              {job.status === "running" || job.status === "queued" ? (
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
              ) : job.status === "done" ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-zinc-200 capitalize">{job.status}</span>
                  <span className="text-xs text-zinc-400">{job.progress} / {job.total}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      job.status === "done" ? "bg-green-500" :
                      job.status === "error" ? "bg-red-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${job.status === "done" ? 100 : pct}%` }}
                  />
                </div>
              </div>
            </div>

            {job.status === "done" && (
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <span className="text-sm text-zinc-400">
                  <span className="text-green-400 font-semibold">{job.leadsFound}</span> leads passed protocol
                </span>
                <Link href="/leads" className="text-sm text-amber-400 hover:text-amber-300 font-medium">
                  View leads →
                </Link>
              </div>
            )}

            {job.status === "error" && (
              <p className="text-xs text-red-400 pt-2 border-t border-zinc-800">{job.error}</p>
            )}

            {job.status === "queued" && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2">
                <Clock className="h-3 w-3" /> Queued — starting shortly…
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-zinc-600 mt-4">
        Leads below the protocol threshold are silently discarded — only qualified businesses enter your pipeline.
      </p>
    </div>
  );
}
