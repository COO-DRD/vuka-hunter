import { requireUser, resolveOrgId } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { STAGES } from "@/lib/utils";
import {
  IconUsers, IconTrendingUp, IconStar, IconMail,
  IconBolt, IconArrowRight, IconSearch, IconSparkles,
  IconMessageCircle, IconGitBranch, IconChevronRight, IconCircleCheck,
} from "@tabler/icons-react";

async function getStats(orgId: string) {
  const db = createSupabaseServiceClient();
  const [
    { count: total },
    { count: hot },
    { count: enriched },
    { count: scored },
    { count: unenriched },
    { count: needsScore },
    { data: recent },
    { data: stageRows },
  ] = await Promise.all([
    db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId),
    db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId).gte("google_rating", 4.5).gte("google_review_count", 30),
    db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("enrichment_status", "done"),
    db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId).not("score", "is", null),
    db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId).neq("enrichment_status", "done"),
    db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("enrichment_status", "done").is("score", null),
    db.from("hunter_leads").select("id,name,score,stage,vertical,city,google_rating,enrichment_status").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
    db.from("hunter_leads").select("stage").eq("org_id", orgId),
  ]);

  const stageCounts: Record<string, number> = {};
  stageRows?.forEach(({ stage }) => { stageCounts[stage] = (stageCounts[stage] ?? 0) + 1; });
  return { total, hot, enriched, scored, unenriched, needsScore, recent: recent ?? [], stageCounts };
}

function getNextAction(total: number, unenriched: number, needsScore: number, scored: number) {
  if (total === 0)       return null;
  if (unenriched > 0)    return { label: `Enrich ${unenriched} lead${unenriched > 1 ? "s" : ""}`, desc: "Find contact details, website intelligence, and tech stack.", href: "/leads", color: "blue", icon: IconMail };
  if (needsScore > 0)    return { label: `Score ${needsScore} lead${needsScore > 1 ? "s" : ""} with AI`, desc: "AI ranks each lead by revenue signal.", href: "/leads", color: "purple", icon: IconSparkles };
  if (scored > 0)        return { label: "Write outreach copy for your top leads", desc: "AI-generated WhatsApp + email openers personalised per lead.", href: "/leads", color: "yellow", icon: IconMessageCircle };
  return { label: "Move leads through your pipeline", desc: "Track which leads are contacted, replied, and won.", href: "/pipeline", color: "orange", icon: IconGitBranch };
}

const PIPELINE_STEPS = [
  { step: 1, label: "Discover",  desc: "Surface businesses from 36+ verticals", href: "/discover",  icon: IconSearch,       time: "~2 min" },
  { step: 2, label: "Enrich",    desc: "Crawl websites for contacts & tech stack", href: "/leads",   icon: IconMail,         time: "~1 min/lead" },
  { step: 3, label: "Score",     desc: "AI ranks every lead before you dial",      href: "/leads",   icon: IconSparkles,     time: "~10 sec/lead" },
  { step: 4, label: "Outreach",  desc: "Generate personalised WhatsApp + email",   href: "/leads",   icon: IconMessageCircle, time: "~5 sec/lead" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const { total, hot, enriched, scored, unenriched, needsScore, recent, stageCounts } = await getStats(orgId);

  const totalN = total ?? 0;
  const nextAction = getNextAction(totalN, unenriched ?? 0, needsScore ?? 0, scored ?? 0);

  const stats = [
    { label: "Total Leads",  value: totalN,        icon: IconUsers,       color: "blue"   },
    { label: "Hot ★4.5+",   value: hot ?? 0,      icon: IconStar,        color: "yellow" },
    { label: "Enriched",     value: enriched ?? 0, icon: IconMail,        color: "orange" },
    { label: "AI Scored",    value: scored ?? 0,   icon: IconTrendingUp,  color: "purple" },
  ];

  return (
    <div className="container-xl">
      {/* Page header */}
      <div className="page-header d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">Dashboard</h2>
            <div className="text-muted mt-1">Pipeline status — what needs your attention</div>
          </div>
        </div>
      </div>

      {/* Zero-state activation */}
      {totalN === 0 && (
        <div className="card mb-4" style={{ borderColor: "var(--tblr-primary)", borderWidth: 1 }}>
          <div className="card-body">
            <div className="d-flex align-items-center gap-3 mb-4">
              <span className="avatar bg-yellow-lt text-yellow">
                <IconBolt size={20} stroke={1.5} />
              </span>
              <div>
                <div className="fw-semibold">Get your first leads in 2 minutes</div>
                <div className="text-muted small">Follow these 4 steps — each runs in the background.</div>
              </div>
            </div>
            <div className="row g-3 mb-4">
              {PIPELINE_STEPS.map((s) => (
                <div key={s.step} className="col-12 col-sm-6 col-lg-3">
                  <Link href={s.href} className="card card-sm h-100 text-decoration-none border-hover" style={{ transition: "border-color 0.15s" }}>
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="badge bg-yellow-lt text-yellow">Step {s.step}</span>
                        <IconChevronRight size={14} className="text-muted" />
                      </div>
                      <s.icon size={20} stroke={1.5} className="text-yellow mb-2" />
                      <div className="fw-semibold text-body small">{s.label}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>{s.desc}</div>
                      <div className="text-muted mt-1" style={{ fontSize: "0.7rem" }}>{s.time}</div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
            <Link href="/discover" className="btn btn-primary">
              <IconSearch size={16} stroke={1.5} className="me-2" />
              Start with Discover
            </Link>
          </div>
        </div>
      )}

      {/* Next action prompt */}
      {nextAction && (
        <Link href={nextAction.href} className={`alert alert-${nextAction.color} d-flex align-items-center gap-3 mb-4 text-decoration-none`}>
          <nextAction.icon size={18} stroke={1.5} />
          <div className="flex-fill">
            <div className="fw-semibold">{nextAction.label}</div>
            <div className="small">{nextAction.desc}</div>
          </div>
          <IconArrowRight size={16} />
        </Link>
      )}

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="col-6 col-lg-3">
            <div className="card card-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="text-muted small">{label}</div>
                  <span className={`avatar avatar-sm bg-${color}-lt text-${color}`}>
                    <Icon size={16} stroke={1.5} />
                  </span>
                </div>
                <div className="h1 mb-0">{value.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline + Recent leads */}
      <div className="row g-4">
        {/* Pipeline */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">Pipeline</h3>
            </div>
            <div className="card-body">
              {STAGES.map((s) => {
                const count = stageCounts[s.value] ?? 0;
                const pct = totalN ? Math.round((count / totalN) * 100) : 0;
                return (
                  <div key={s.value} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">{s.label}</span>
                      <span className="fw-medium small">{count}</span>
                    </div>
                    <div className="progress progress-sm">
                      <div className="progress-bar bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {totalN > 0 && (
                <Link href="/pipeline" className="btn btn-ghost-secondary btn-sm mt-2 gap-1">
                  Manage pipeline <IconArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Recent leads */}
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">Recent Leads</h3>
              {recent.length > 0 && (
                <div className="card-options">
                  <Link href="/leads" className="btn btn-ghost-secondary btn-sm gap-1">
                    View all <IconArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
            <div className="card-body p-0">
              {recent.length === 0 ? (
                <div className="empty py-5">
                  <div className="empty-icon">
                    <IconUsers size={32} stroke={1} className="text-muted" />
                  </div>
                  <p className="empty-title">No leads yet</p>
                  <p className="empty-subtitle text-muted">Run a scrape to populate your workspace with real businesses.</p>
                  <div className="empty-action">
                    <Link href="/discover" className="btn btn-primary">
                      <IconSearch size={16} stroke={1.5} className="me-2" />
                      Go to Discover
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recent.map((lead: Record<string, unknown>) => {
                    const score = lead.score as number | null;
                    const isEnriched = lead.enrichment_status === "done";
                    return (
                      <Link key={lead.id as string} href={`/leads/${lead.id}`}
                        className="list-group-item list-group-item-action d-flex align-items-center gap-3 text-decoration-none">
                        <span className="avatar avatar-sm rounded text-white fw-bold"
                          style={{ background: "var(--tblr-primary)", fontSize: "0.7rem" }}>
                          {(lead.name as string).charAt(0).toUpperCase()}
                        </span>
                        <div className="flex-fill overflow-hidden">
                          <div className="fw-medium text-truncate">{lead.name as string}</div>
                          <div className="text-muted small text-capitalize text-truncate">
                            {lead.vertical as string} · {lead.city as string}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {isEnriched && <IconCircleCheck size={16} stroke={1.5} className="text-primary" />}
                          {score !== null && (
                            <span className={`badge ${score >= 70 ? "bg-success-lt text-success" : score >= 40 ? "bg-warning-lt text-warning" : "bg-secondary-lt text-secondary"}`}>
                              {score}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline steps (shown when 1–4 leads) */}
      {totalN > 0 && totalN < 5 && (
        <div className="card mt-4">
          <div className="card-header">
            <h3 className="card-title text-uppercase text-muted" style={{ fontSize: "0.7rem", letterSpacing: "0.08em" }}>Pipeline steps</h3>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {PIPELINE_STEPS.map((s) => (
                <div key={s.step} className="col-6 col-lg-3">
                  <Link href={s.href} className="d-flex align-items-center gap-2 p-2 rounded border text-decoration-none text-body hover-shadow" style={{ transition: "box-shadow 0.15s" }}>
                    <s.icon size={16} stroke={1.5} className="text-muted flex-shrink-0" />
                    <div>
                      <div className="small fw-medium">{s.label}</div>
                      <div style={{ fontSize: "0.7rem" }} className="text-muted">{s.time}</div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
