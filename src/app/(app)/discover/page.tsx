"use client";
import { useState, useRef, useEffect } from "react";
import { PROTOCOL, PROTOCOL_CITIES } from "@/lib/protocol";
import { toast } from "sonner";
import Link from "next/link";
import {
  IconSearch, IconCircleCheck, IconCircleX, IconClock,
  IconLoader2, IconShieldCheck, IconStar, IconAdjustments,
  IconRefresh, IconWorld, IconPhone,
} from "@tabler/icons-react";

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

  const [showThresholds, setShowThresholds] = useState(false);
  const [minRating,      setMinRating]      = useState(String(selectedVp?.minRating ?? 0));
  const [minReviews,     setMinReviews]     = useState(String(selectedVp?.minReviews ?? 0));
  const [requireWebsite, setRequireWebsite] = useState(false);
  const [requirePhone,   setRequirePhone]   = useState(false);
  const [nameInclude,    setNameInclude]    = useState("");
  const [nameExclude,    setNameExclude]    = useState("");

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
  const anyOverride    = ratingChanged || reviewsChanged || requireWebsite || requirePhone || !!nameInclude || !!nameExclude;

  async function startScrape() {
    setSubmitting(true);
    setJob(null);
    try {
      const body: Record<string, unknown> = { vertical, city, count: parseInt(count), source };
      if (ratingChanged)   body.minRatingOverride  = parseFloat(minRating);
      if (reviewsChanged)  body.minReviewsOverride = parseInt(minReviews);
      if (requireWebsite)  body.requireWebsite      = true;
      if (requirePhone)    body.requirePhone        = true;
      if (nameInclude)     body.nameInclude         = nameInclude;
      if (nameExclude)     body.nameExclude         = nameExclude;
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
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
    <div className="container-xl">
      <div className="page-header d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">Discover Leads</h2>
            <div className="text-muted mt-1 small">
              Multi-source prospecting — run Google Places, Foursquare, and OSM separately to catch businesses not listed on all three. Each run stacks on top of the last.
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">New Scrape Job</h3>
            </div>
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label">Vertical</label>
                  <select className="form-select" value={vertical} onChange={(e) => setVertical(e.target.value)}>
                    {PROTOCOL_VERTICALS.map((v) => (
                      <option key={v.key} value={v.key}>[{v.tier}] {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">City</label>
                  <select className="form-select" value={city} onChange={(e) => setCity(e.target.value)}>
                    {PROTOCOL_CITIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Max leads</label>
                  <select className="form-select" value={count} onChange={(e) => setCount(e.target.value)}>
                    {["50", "100", "200", "500"].map((n) => (
                      <option key={n} value={n}>{n} leads</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Data source</label>
                  <select className="form-select" value={source} onChange={(e) => setSource(e.target.value)}>
                    <optgroup label="Live sources">
                      <option value="google_places">Google Places — richest data</option>
                      <option value="foursquare">Foursquare — different dataset</option>
                      <option value="osm">OpenStreetMap — free, no quota</option>
                    </optgroup>
                    <optgroup label="Coming soon">
                      <option value="facebook" disabled>Facebook Places (coming soon)</option>
                      <option value="linkedin" disabled>LinkedIn Companies (coming soon)</option>
                      <option value="kenbrs"   disabled>Kenya Business Registry (coming soon)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Protocol card */}
              {selectedVp && (
                <div className="card mb-3 bg-light border">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <IconShieldCheck size={15} stroke={1.5} className="text-warning" />
                      <span className="fw-medium small">Protocol — {selectedVp.label}</span>
                      <span className={`badge ms-1 ${selectedVp.tier === "A" ? "bg-warning-lt text-warning" : "bg-yellow-lt text-yellow"}`}>
                        Tier {selectedVp.tier}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowThresholds((v) => !v)}
                        className={`btn btn-sm ms-auto gap-1 ${showThresholds ? "btn-secondary" : "btn-ghost-secondary"} ${anyOverride ? "border-warning" : ""}`}
                      >
                        <IconAdjustments size={13} stroke={1.5} />
                        Adjust
                        {anyOverride && <span className="badge bg-warning badge-sm ms-1" />}
                      </button>
                    </div>
                    <div className="d-flex gap-3 small text-muted">
                      <span className="d-flex align-items-center gap-1">
                        <IconStar size={12} className="text-warning" />
                        Min rating:
                        <span className={`ms-1 ${ratingChanged ? "text-decoration-line-through text-warning opacity-50" : "text-body"}`}>
                          {selectedVp.minRating}
                        </span>
                        {ratingChanged && <span className="text-warning ms-1">{minRating}</span>}
                      </span>
                      <span>
                        Min reviews:
                        <span className={`ms-1 ${reviewsChanged ? "text-decoration-line-through text-warning opacity-50" : "text-body"}`}>
                          {selectedVp.minReviews}
                        </span>
                        {reviewsChanged && <span className="text-warning ms-1">{minReviews}</span>}
                      </span>
                    </div>

                    {showThresholds && (
                      <div className="border-top mt-2 pt-2">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small fw-medium">Filters for this job only</span>
                          {anyOverride && (
                            <button type="button" className="btn btn-ghost-secondary btn-sm gap-1" onClick={() => {
                              setMinRating(String(defaultRating));
                              setMinReviews(String(defaultReviews));
                              setRequireWebsite(false);
                              setRequirePhone(false);
                              setNameInclude("");
                              setNameExclude("");
                            }}>
                              <IconRefresh size={12} /> Reset all
                            </button>
                          )}
                        </div>
                        <div className="row g-2 mb-2">
                          <div className="col-6">
                            <label className="form-label form-label-sm">Min rating (0–5)</label>
                            <input type="number" min="0" max="5" step="0.1" className="form-control form-control-sm"
                              value={minRating} onChange={(e) => setMinRating(e.target.value)} />
                          </div>
                          <div className="col-6">
                            <label className="form-label form-label-sm">Min reviews (0–500)</label>
                            <input type="number" min="0" max="500" step="1" className="form-control form-control-sm"
                              value={minReviews} onChange={(e) => setMinReviews(e.target.value)} />
                          </div>
                        </div>
                        <div className="d-flex gap-2 mb-2 flex-wrap">
                          <button type="button" onClick={() => setRequireWebsite((v) => !v)}
                            className={`btn btn-sm gap-1 ${requireWebsite ? "btn-warning" : "btn-ghost-secondary"}`}>
                            <IconWorld size={13} /> Website required
                          </button>
                          <button type="button" onClick={() => setRequirePhone((v) => !v)}
                            className={`btn btn-sm gap-1 ${requirePhone ? "btn-warning" : "btn-ghost-secondary"}`}>
                            <IconPhone size={13} /> Phone required
                          </button>
                        </div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label form-label-sm">Name contains</label>
                            <input type="text" className="form-control form-control-sm" placeholder="e.g. dental"
                              value={nameInclude} onChange={(e) => setNameInclude(e.target.value)} maxLength={60} />
                          </div>
                          <div className="col-6">
                            <label className="form-label form-label-sm">Name excludes</label>
                            <input type="text" className="form-control form-control-sm" placeholder="e.g. ngo"
                              value={nameExclude} onChange={(e) => setNameExclude(e.target.value)} maxLength={60} />
                          </div>
                        </div>
                        <p className="text-muted small mt-2 mb-0">Filters only affect this job — protocol defaults unchanged.</p>
                      </div>
                    )}
                    <p className="text-muted small mb-0 mt-2">{selectedVp.notes}</p>
                  </div>
                </div>
              )}

              <button onClick={startScrape} disabled={submitting} className="btn btn-primary w-100 gap-2">
                {submitting
                  ? <><IconLoader2 size={16} className="animate-spin" /> Queuing job…</>
                  : <><IconSearch size={16} stroke={1.5} /> Start Scraping</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Job status */}
        <div className="col-12 col-lg-5">
          {job ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title d-flex align-items-center gap-2">
                  {(job.status === "running" || job.status === "queued")
                    ? <IconLoader2 size={16} className="text-primary animate-spin" />
                    : job.status === "done"
                    ? <IconCircleCheck size={16} className="text-success" />
                    : <IconCircleX size={16} className="text-danger" />
                  }
                  <span className="text-capitalize">{job.status}</span>
                </h3>
                <div className="card-options text-muted small">{job.progress} / {job.total}</div>
              </div>
              <div className="card-body">
                <div className="progress mb-3" style={{ height: 8 }}>
                  <div
                    className={`progress-bar ${job.status === "done" ? "bg-success" : job.status === "error" ? "bg-danger" : "bg-primary"}`}
                    style={{ width: `${job.status === "done" ? 100 : pct}%`, transition: "width 0.5s" }}
                  />
                </div>

                {job.status === "done" && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small">
                      <span className="text-success fw-semibold">{job.leadsFound}</span> leads passed protocol
                    </span>
                    <Link href="/leads" className="btn btn-sm btn-ghost-primary">View leads →</Link>
                  </div>
                )}
                {job.status === "error" && (
                  <p className="text-danger small mb-0">{job.error}</p>
                )}
                {job.status === "queued" && (
                  <div className="d-flex align-items-center gap-2 text-muted small">
                    <IconClock size={14} /> Queued — starting shortly…
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card bg-light">
              <div className="card-body text-center py-5 text-muted small">
                Run a scrape job to see status here.
              </div>
            </div>
          )}
          <p className="text-muted small mt-3">
            Leads below the protocol threshold are silently discarded — only qualified businesses enter your pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}
