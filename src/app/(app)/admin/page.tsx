import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  IconShieldCheck, IconUsers, IconTarget,
  IconMessageCircle, IconAlertTriangle,
  IconCalendar, IconTrendingUp, IconReceipt,
} from "@tabler/icons-react";
import { UpgradeRequestActions } from "./UpgradeRequestActions";

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
    db.from("hunter_events").select("org_id", { count: "exact", head: true }).gte("created_at", d30),
    Promise.resolve({ data: null }),
    db.from("hunter_events").select("event_type,created_at").gte("created_at", d14),
    db.from("hunter_events").select("org_id").gte("created_at", d30),
    db.from("hunter_leads").select("*", { count: "exact", head: true }),
    db.from("hunter_leads").select("*", { count: "exact", head: true }).not("score", "is", null),
    db.from("hunter_error_log").select("route,message,created_at,org_id").order("created_at", { ascending: false }).limit(10),
    db.from("hunter_workshop_registrations").select("name,email,company,role,created_at").order("created_at", { ascending: false }).limit(20),
    db.from("hunter_workshop_registrations").select("*", { count: "exact", head: true }),
  ]);

  const { data: upgradeRequests } = await db
    .from("hunter_upgrade_requests")
    .select("id,org_id,plan,email,phone,note,status,ref_number,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const byType: Record<string, number> = { scrape: 0, enrich: 0, score: 0, opener: 0 };
  if (dailyEvents) {
    for (const e of dailyEvents) byType[e.event_type as string] = (byType[e.event_type as string] ?? 0) + 1;
  }

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

  const orgCounts: Record<string, number> = {};
  if (topUsers) for (const e of topUsers) orgCounts[e.org_id as string] = (orgCounts[e.org_id as string] ?? 0) + 1;
  const topOrgIds = Object.entries(orgCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

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
    upgradeRequests: upgradeRequests ?? [],
  };
}

// ── sub-components ─────────────────────────────────────────────────────────

function Sparkline({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(...days.map((d) => d.count), 1);
  return (
    <div className="d-flex align-items-end gap-1" style={{ height: 40 }}>
      {days.map(({ date, count }) => (
        <div key={date} className="flex-fill d-flex align-items-end" style={{ height: "100%" }}>
          <div
            style={{
              width: "100%",
              height: `${Math.max((count / max) * 100, count > 0 ? 4 : 0)}%`,
              background: "var(--tblr-primary)",
              opacity: 0.7,
              borderRadius: "2px 2px 0 0",
              transition: "opacity 0.15s",
            }}
            title={`${date.slice(5)}: ${count}`}
          />
        </div>
      ))}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const user = await requireUser();
  if (!ADMIN_EMAILS.has(user.email ?? "")) redirect("/dashboard");

  const a = await getAnalytics();
  const totalEvents14d = a.sparkDays.reduce((s, d) => s + d.count, 0);
  const maxEventType   = Math.max(...Object.values(a.byType));
  const maxTopUser     = a.topOrgIds[0]?.count ?? 1;

  const statCards = [
    { icon: IconUsers,      label: "Total orgs",       value: a.totalOrgs,    sub: "all time",              color: "blue"   },
    { icon: IconTrendingUp, label: "Active orgs",       value: a.activeOrgs,   sub: "had event in 30d",     color: "green"  },
    { icon: IconTarget,     label: "Total leads",       value: a.totalLeads,   sub: `${a.scoredLeads} scored`, color: "purple" },
    { icon: IconCalendar,   label: "Workshop signups",  value: a.workshopCount, sub: "all time",             color: "orange" },
  ];

  return (
    <div className="container-xl">
      <div className="page-header d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col-auto">
            <span className="avatar bg-danger-lt text-danger">
              <IconShieldCheck size={18} stroke={1.5} />
            </span>
          </div>
          <div className="col">
            <h2 className="page-title">Admin</h2>
            <div className="text-muted mt-1 small">Last 30 days unless noted</div>
          </div>
        </div>
      </div>

      {/* Overview stats */}
      <div className="row g-3 mb-4">
        {statCards.map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="col-6 col-lg-3">
            <div className="card card-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="text-muted small">{label}</div>
                  <span className={`avatar avatar-sm bg-${color}-lt text-${color}`}>
                    <Icon size={14} stroke={1.5} />
                  </span>
                </div>
                <div className="h1 mb-0">{value.toLocaleString()}</div>
                {sub && <div className="text-muted" style={{ fontSize: "0.72rem" }}>{sub}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sparkline + event breakdown */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">Events · last 14 days</h3>
              <div className="card-options">
                <span className="text-muted small font-monospace">{totalEvents14d} total</span>
              </div>
            </div>
            <div className="card-body">
              <Sparkline days={a.sparkDays} />
              <div className="d-flex justify-content-between mt-2" style={{ fontSize: "0.68rem" }}>
                <span className="text-muted font-monospace">{a.sparkDays[0]?.date.slice(5)}</span>
                <span className="text-muted font-monospace">{a.sparkDays[13]?.date.slice(5)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">By event type · last 14d</h3>
            </div>
            <div className="card-body">
              {[
                { label: "scrape",  count: a.byType.scrape,  color: "bg-success" },
                { label: "enrich",  count: a.byType.enrich,  color: "bg-info"    },
                { label: "score",   count: a.byType.score,   color: "bg-purple"  },
                { label: "opener",  count: a.byType.opener,  color: "bg-warning" },
              ].map(({ label, count, color }) => {
                const pct = maxEventType > 0 ? (count / maxEventType) * 100 : 0;
                return (
                  <div key={label} className="d-flex align-items-center gap-3 mb-2">
                    <span className="text-muted small font-monospace text-capitalize" style={{ width: 56 }}>{label}</span>
                    <div className="flex-fill progress progress-sm">
                      <div className={`progress-bar ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-muted small font-monospace" style={{ width: 28, textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top users */}
      {a.topOrgIds.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title">Most active users · last 30d</h3>
          </div>
          <div className="card-body">
            {a.topOrgIds.map(({ id, name, count }) => {
              const pct = (count / maxTopUser) * 100;
              return (
                <div key={id} className="d-flex align-items-center gap-3 mb-2">
                  <span className="text-muted small text-truncate" style={{ width: 140 }}>{name}</span>
                  <div className="flex-fill progress progress-sm">
                    <div className="progress-bar bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-muted small font-monospace" style={{ width: 28, textAlign: "right" }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade requests */}
      {a.upgradeRequests.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title d-flex align-items-center gap-2">
              <IconReceipt size={16} stroke={1.5} className="text-primary" />
              Upgrade requests
            </h3>
            <div className="card-options">
              <span className="text-muted small">
                {a.upgradeRequests.filter((r: {status:string}) => r.status === "pending").length} pending
              </span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-vcenter table-sm card-table">
              <thead>
                <tr>
                  {["Ref","Plan","Email","Phone","Note","Requested",""].map((h) => (
                    <th key={h} className="text-muted small">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.upgradeRequests.map((r: {id:string;plan:string;email:string;phone:string|null;note:string|null;status:string;ref_number:string;created_at:string}) => (
                  <tr key={r.id}>
                    <td className="font-monospace text-primary fw-semibold small">{r.ref_number}</td>
                    <td className="text-capitalize small">{r.plan}</td>
                    <td className="text-muted small" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{r.email}</td>
                    <td className="text-muted small">{r.phone ?? "—"}</td>
                    <td className="text-muted small" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={r.note ?? ""}>{r.note ?? "—"}</td>
                    <td className="text-muted font-monospace small">{r.created_at.slice(0, 16).replace("T", " ")}</td>
                    <td><UpgradeRequestActions id={r.id} initialStatus={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workshop registrations */}
      {a.workshopRegs.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title d-flex align-items-center gap-2">
              <IconCalendar size={16} stroke={1.5} className="text-orange" />
              Workshop registrations
            </h3>
            <div className="card-options">
              <span className="text-muted small">{a.workshopCount} total</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-vcenter table-sm card-table">
              <thead>
                <tr>
                  {["Name","Email","Company","Role","Signed up"].map((h) => (
                    <th key={h} className="text-muted small">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.workshopRegs.map((r: {name:string;email:string;company:string|null;role:string|null;created_at:string}, i: number) => (
                  <tr key={i}>
                    <td className="fw-medium small">{r.name}</td>
                    <td className="text-muted small">{r.email}</td>
                    <td className="text-muted small">{r.company ?? "—"}</td>
                    <td className="text-muted small">{r.role ?? "—"}</td>
                    <td className="text-muted font-monospace small">{r.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent errors */}
      {a.recentErrors.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title d-flex align-items-center gap-2">
              <IconAlertTriangle size={16} stroke={1.5} className="text-warning" />
              Recent errors
            </h3>
          </div>
          <div className="list-group list-group-flush">
            {a.recentErrors.map((e: {route:string;message:string;created_at:string}, i: number) => (
              <div key={i} className="list-group-item d-flex align-items-start gap-3">
                <span className="text-muted font-monospace shrink-0" style={{ fontSize: "0.68rem", marginTop: 2 }}>
                  {e.created_at.slice(0, 16).replace("T", " ")}
                </span>
                <span className="text-danger font-monospace small shrink-0">{e.route}</span>
                <span className="text-muted small text-truncate">{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <IconMessageCircle size={16} stroke={1.5} />
          <span className="small">No errors in the log. Clean slate.</span>
        </div>
      )}
    </div>
  );
}
