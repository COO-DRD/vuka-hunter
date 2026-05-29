import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shield, Users, Zap, Target, MessageSquare, AlertTriangle, CalendarDays, TrendingUp } from "lucide-react";

const ADMIN_EMAILS = new Set(["ian.dullu@akamom.org", "dr.dullu@gmail.com"]);

// ── data fetching ──────────────────────────────────────────────────────────

async function getAnalytics() {
  const db = createSupabaseServiceClient();
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 86400000).toISOString();

  const [
    { count: totalOrgs },
    { count: activeOrgs },
    { data: eventCounts },
    { data: dailyEvents },
    { data: topUsers },
    { count: totalLeads },
    { count: scoredLeads },
    { data: recentErrors },
    { data: workshopRegs },
    { count: workshopCount },
  ] = await Promise.all([
    db.from("hunter_orgs").select("*", { count: "exact", head: true }),
    db.from("hunter_events").select("org_id", { count: "exact", head: true })
      .gte("created_at", d30),
    Promise.resolve({ data: null }),
    db.from("hunter_events").select("event_type,created_at").gte("created_at", d14),
    db.from("hunter_events").select("org_id").gte("created_at", d30),
    db.from("hunter_leads").select("*", { count: "exact", head: true }),
    db.from("hunter_leads").select("*", { count: "exact", head: true }).not("score", "is", null),
    db.from("hunter_error_log").select("route,message,created_at,org_id").order("created_at", { ascending: false }).limit(10),
    db.from("hunter_workshop_registrations").select("name,email,company,role,created_at").order("created_at", { ascending: false }).limit(20),
    db.from("hunter_workshop_registrations").select("*", { count: "exact", head: true }),
  ]);

  // Aggregate event counts by type
  const byType: Record<string, number> = { scrape: 0, enrich: 0, score: 0, opener: 0 };
  if (dailyEvents) {
    for (const e of dailyEvents) byType[e.event_type as string] = (byType[e.event_type as string] ?? 0) + 1;
  }

  // Build 14-day sparkline: day → count
  const byDay: Record<string, number> = {};
  if (dailyEvents) {
    for (const e of dailyEvents) {
      const day = e.created_at.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
  }
  const sparkDays: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    sparkDays.push({ date: key, count: byDay[key] ?? 0 });
  }

  // Top users by event count (last 30d)
  const orgCounts: Record<string, number> = {};
  if (topUsers) for (const e of topUsers) orgCounts[e.org_id as string] = (orgCounts[e.org_id as string] ?? 0) + 1;
  const topOrgIds = Object.entries(orgCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Fetch org names for top users
  let orgNames: Record<string, string> = {};
  if (topOrgIds.length > 0) {
    const { data: orgs } = await db.from("hunter_orgs").select("id,name").in("id", topOrgIds.map(([id]) => id));
    if (orgs) for (const o of orgs) orgNames[o.id] = o.name ?? o.id.slice(0, 8);
  }

  return {
    totalOrgs: totalOrgs ?? 0,
    activeOrgs: activeOrgs ?? 0,
    byType,
    sparkDays,
    topOrgIds: topOrgIds.map(([id, count]) => ({ id, name: orgNames[id] ?? id.slice(0, 8), count })),
    totalLeads: totalLeads ?? 0,
    scoredLeads: scoredLeads ?? 0,
    recentErrors: recentErrors ?? [],
    workshopRegs: workshopRegs ?? [],
    workshopCount: workshopCount ?? 0,
  };
}

// ── components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = "text-zinc-400" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-2xl font-black tabular-nums text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

function Sparkline({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(...days.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {days.map(({ date, count }) => (
        <div key={date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className="w-full rounded-sm bg-red-500/60 group-hover:bg-red-400 transition-colors min-h-[2px]"
            style={{ height: `${Math.max((count / max) * 100, 4)}%` }}
          />
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] bg-zinc-800 text-zinc-300 px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
            {date.slice(5)} · {count}
          </span>
        </div>
      ))}
    </div>
  );
}

function EventBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-14 shrink-0 font-mono capitalize">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-zinc-400 w-8 text-right">{count}</span>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const user = await requireUser();
  if (!ADMIN_EMAILS.has(user.email ?? "")) redirect("/dashboard");

  const a = await getAnalytics();
  const totalEvents14d = a.sparkDays.reduce((s, d) => s + d.count, 0);
  const maxEventType = Math.max(...Object.values(a.byType));
  const maxTopUser = a.topOrgIds[0]?.count ?? 1;

  return (
    <div className="p-6 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/20 border border-red-600/30">
          <Shield className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Analytics</h1>
          <p className="text-xs text-zinc-500">Last 30 days unless noted</p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users}         label="Total orgs"       value={a.totalOrgs}    sub="all time"              color="text-blue-400" />
        <StatCard icon={TrendingUp}    label="Active orgs"      value={a.activeOrgs}   sub="had an event in 30d"  color="text-green-400" />
        <StatCard icon={Target}        label="Total leads"      value={a.totalLeads}   sub={`${a.scoredLeads} scored`} color="text-purple-400" />
        <StatCard icon={CalendarDays}  label="Workshop signups" value={a.workshopCount} sub="all time"             color="text-orange-400" />
      </div>

      {/* Activity sparkline + event breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400">Events · last 14 days</p>
            <span className="text-xs font-mono text-zinc-600">{totalEvents14d} total</span>
          </div>
          <Sparkline days={a.sparkDays} />
          <div className="flex justify-between text-[10px] text-zinc-700 font-mono pt-1">
            <span>{a.sparkDays[0]?.date.slice(5)}</span>
            <span>{a.sparkDays[13]?.date.slice(5)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-400">By event type · last 14d</p>
          <div className="space-y-2.5 pt-1">
            <EventBar label="scrape"  count={a.byType.scrape}  max={maxEventType} color="bg-green-500" />
            <EventBar label="enrich"  count={a.byType.enrich}  max={maxEventType} color="bg-blue-500" />
            <EventBar label="score"   count={a.byType.score}   max={maxEventType} color="bg-purple-500" />
            <EventBar label="opener"  count={a.byType.opener}  max={maxEventType} color="bg-orange-500" />
          </div>
        </div>
      </div>

      {/* Top users */}
      {a.topOrgIds.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-400">Most active users · last 30d</p>
          <div className="space-y-2">
            {a.topOrgIds.map(({ id, name, count }) => (
              <div key={id} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-36 truncate shrink-0">{name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full rounded-full bg-red-500/70" style={{ width: `${(count / maxTopUser) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-zinc-500 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workshop registrations */}
      {a.workshopRegs.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-orange-400" />
              Workshop registrations
            </p>
            <span className="text-xs font-mono text-zinc-600">{a.workshopCount} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  {["Name","Email","Company","Role","Signed up"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-zinc-600 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.workshopRegs.map((r: {name:string;email:string;company:string|null;role:string|null;created_at:string}, i: number) => (
                  <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/30">
                    <td className="px-4 py-2.5 text-zinc-300 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{r.email}</td>
                    <td className="px-4 py-2.5 text-zinc-500">{r.company ?? "—"}</td>
                    <td className="px-4 py-2.5 text-zinc-500">{r.role ?? "—"}</td>
                    <td className="px-4 py-2.5 text-zinc-600 font-mono">{r.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent errors */}
      {a.recentErrors.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
            <p className="text-xs font-semibold text-zinc-400">Recent errors</p>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {a.recentErrors.map((e: {route:string;message:string;created_at:string}, i: number) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <span className="text-[10px] font-mono text-zinc-600 shrink-0 mt-0.5">{e.created_at.slice(0, 16).replace("T", " ")}</span>
                <span className="text-xs font-mono text-red-400 shrink-0">{e.route}</span>
                <span className="text-xs text-zinc-500 truncate">{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {a.recentErrors.length === 0 && (
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/30 px-4 py-3 flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-green-500" />
          <p className="text-xs text-zinc-600">No errors in the log. Clean slate.</p>
        </div>
      )}
    </div>
  );
}
