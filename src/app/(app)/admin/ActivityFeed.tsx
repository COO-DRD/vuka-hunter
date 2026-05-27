"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Wrench, AlertTriangle, Activity, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserStat {
  orgId: string;
  email: string;
  signedUpAt: string;
  scrapes: number;
  enrichments: number;
  scores: number;
  openers: number;
  creditsUsed: number;
}
interface Job {
  id: string;
  org_id: string;
  vertical: string;
  city: string;
  status: string;
  progress: number | null;
  total: number | null;
  started_at: string | null;
  created_at: string;
  error?: string | null;
}
interface Event {
  id: number;
  org_id: string;
  email: string;
  event_type: string;
  created_at: string;
}
interface ErrorEntry {
  id: number;
  org_id: string | null;
  email: string;
  route: string;
  message: string;
  context: Record<string, unknown> | null;
  created_at: string;
}
interface ActivityData {
  userStats: UserStat[];
  activeJobs: Job[];
  stuckJobs: Job[];
  recentEvents: Event[];
  recentErrors: ErrorEntry[];
}

function relTime(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

const EVENT_COLOR: Record<string, string> = {
  scrape:  "text-blue-400",
  enrich:  "text-green-400",
  score:   "text-purple-400",
  opener:  "text-yellow-400",
};

export function ActivityFeed() {
  const [data, setData]       = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [healing, setHealing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity");
      if (!res.ok) return;
      setData(await res.json());
      setLastRefresh(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 9_000);
    return () => clearInterval(id);
  }, [fetchData]);

  async function healStuck() {
    setHealing(true);
    try {
      await fetch("/api/admin/heal", { method: "POST" });
      await fetchData();
    } finally { setHealing(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-sm py-12 justify-center">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!data) return <p className="text-red-400 text-sm">Failed to load activity data.</p>;

  return (
    <div className="space-y-8">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {lastRefresh ? `Refreshed ${relTime(lastRefresh.toISOString())} · auto every 9s` : ""}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchData} className="gap-1.5 text-xs h-7">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          {data.stuckJobs.length > 0 && (
            <Button
              size="sm"
              onClick={healStuck}
              loading={healing}
              className="gap-1.5 text-xs h-7 bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              <Wrench className="h-3 w-3" />
              Heal {data.stuckJobs.length} stuck job{data.stuckJobs.length > 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </div>

      {/* ── User usage table ── */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
          <Users className="h-4 w-4 text-blue-400" /> Users
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left px-3 py-2 font-medium">Email</th>
                <th className="text-left px-3 py-2 font-medium">Joined</th>
                <th className="text-right px-3 py-2 font-medium">Scrapes</th>
                <th className="text-right px-3 py-2 font-medium">Enriched</th>
                <th className="text-right px-3 py-2 font-medium">Scored</th>
                <th className="text-right px-3 py-2 font-medium">Openers</th>
                <th className="text-right px-3 py-2 font-medium">Credits</th>
              </tr>
            </thead>
            <tbody>
              {data.userStats.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-zinc-600">No users yet</td></tr>
              )}
              {data.userStats.map((u) => (
                <tr key={u.orgId} className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
                  <td className="px-3 py-2 text-zinc-300 font-mono truncate max-w-[200px]">{u.email}</td>
                  <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{relTime(u.signedUpAt)}</td>
                  <td className="px-3 py-2 text-right text-blue-400">{u.scrapes}</td>
                  <td className="px-3 py-2 text-right text-green-400">{u.enrichments}</td>
                  <td className="px-3 py-2 text-right text-purple-400">{u.scores}</td>
                  <td className="px-3 py-2 text-right text-yellow-400">{u.openers}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{u.creditsUsed.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Active / Stuck jobs ── */}
      {(data.activeJobs.length > 0 || data.stuckJobs.length > 0) && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
            <Zap className="h-4 w-4 text-yellow-400" /> Active Jobs
          </h2>
          <div className="space-y-2">
            {[...data.stuckJobs.map(j => ({ ...j, _stuck: true })), ...data.activeJobs.map(j => ({ ...j, _stuck: false }))].map((job) => (
              <div
                key={job.id}
                className={`rounded-lg border px-4 py-3 text-xs flex items-center gap-4 ${
                  job._stuck ? "border-yellow-600/50 bg-yellow-950/20" : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                {job._stuck && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
                <span className={`font-medium ${job._stuck ? "text-yellow-300" : "text-zinc-200"}`}>
                  {job.vertical} / {job.city}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  job.status === "running" ? "bg-blue-900/50 text-blue-300" : "bg-zinc-800 text-zinc-400"
                }`}>{job.status}</span>
                {job.progress != null && job.total != null && (
                  <span className="text-zinc-500">{job.progress}/{job.total}</span>
                )}
                <span className="text-zinc-600 ml-auto">
                  {relTime(job.started_at ?? job.created_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Live event feed ── */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
          <Activity className="h-4 w-4 text-green-400" /> Live Events
        </h2>
        {data.recentEvents.length === 0 ? (
          <p className="text-xs text-zinc-600 py-2">No events recorded yet.</p>
        ) : (
          <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-800/60">
            {data.recentEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className={`w-14 font-medium ${EVENT_COLOR[ev.event_type] ?? "text-zinc-400"}`}>
                  {ev.event_type}
                </span>
                <span className="text-zinc-500 font-mono truncate flex-1">{ev.email}</span>
                <span className="text-zinc-600 shrink-0">{relTime(ev.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Error log ── */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
          <AlertTriangle className="h-4 w-4 text-red-400" /> Error Log
        </h2>
        {data.recentErrors.length === 0 ? (
          <p className="text-xs text-zinc-600 py-2">No errors recorded.</p>
        ) : (
          <div className="space-y-2">
            {data.recentErrors.map((err) => (
              <div key={err.id} className="rounded-lg border border-red-900/40 bg-red-950/10 px-4 py-3 text-xs">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-red-400 font-medium">{err.route}</span>
                  <span className="text-zinc-600 font-mono">{err.email}</span>
                  <span className="text-zinc-600 ml-auto">{relTime(err.created_at)}</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">{err.message}</p>
                {err.context && (
                  <pre className="mt-1 text-[10px] text-zinc-600 overflow-x-auto">
                    {JSON.stringify(err.context, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
