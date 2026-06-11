"use client";

import { useEffect, useState } from "react";
import {
  IconTrendingUp, IconUsers, IconMail, IconBolt,
  IconMessageCircle, IconChartBar,
} from "@tabler/icons-react";

interface AnalyticsData {
  total: number;
  enriched: number;
  withOpener: number;
  reachable: number;
  avgScore: number;
  enrichmentRate: number;
  outreachRate: number;
  funnel: Array<{ stage: string; count: number; pct: number; dropOffToNext: number | null }>;
  avgScoreByStage: Record<string, number>;
  topVerticals: Array<{ vertical: string; count: number; avgScore: number }>;
  weeklyLeads: Array<{ date: string; count: number }>;
  channelSplit: Record<string, number>;
}

const STAGE_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", replied: "Replied", qualified: "Qualified", won: "Won",
};

const STAGE_COLORS: Record<string, string> = {
  new: "bg-secondary", contacted: "bg-info", replied: "bg-purple",
  qualified: "bg-warning", won: "bg-success",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container-xl">
        <div className="page-header d-print-none">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Analytics</h2>
              <div className="text-muted mt-1 small">Pipeline intelligence — Time · Money · Efficiency</div>
            </div>
          </div>
        </div>
        <div className="row g-3 mb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="col-6 col-lg">
              <div className="card card-sm">
                <div className="card-body">
                  <div className="placeholder-glow">
                    <div className="placeholder col-6 mb-2" />
                    <div className="placeholder col-4" style={{ height: 28 }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-xl">
        <div className="empty py-5">
          <p className="empty-title text-muted">Failed to load analytics.</p>
        </div>
      </div>
    );
  }

  const maxWeekly = Math.max(...data.weeklyLeads.map((d) => d.count), 1);
  const maxVertical = Math.max(...data.topVerticals.map((v) => v.count), 1);

  const kpis = [
    { label: "Total Leads",    value: data.total,                icon: IconUsers,          color: "blue"   },
    { label: "Enriched",       value: `${data.enrichmentRate}%`, icon: IconBolt,           color: "orange" },
    { label: "Avg Score",      value: data.avgScore,             icon: IconTrendingUp,     color: "purple" },
    { label: "Outreach Ready", value: `${data.outreachRate}%`,   icon: IconMail,           color: "yellow" },
    { label: "Reachable",      value: data.reachable,            icon: IconMessageCircle,  color: "green"  },
  ];

  return (
    <div className="container-xl">
      {/* Page header */}
      <div className="page-header d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">Analytics</h2>
            <div className="text-muted mt-1 small">Pipeline intelligence — Time · Money · Efficiency</div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="row g-3 mb-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="col-6 col-lg">
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

      <div className="row g-4 mb-4">
        {/* Pipeline funnel */}
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title d-flex align-items-center gap-2">
                <IconChartBar size={16} stroke={1.5} className="text-muted" />
                Pipeline Funnel
              </h3>
            </div>
            <div className="card-body">
              {data.funnel.map(({ stage, count, pct, dropOffToNext }) => (
                <div key={stage} className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small">{STAGE_LABELS[stage] ?? stage}</span>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-medium small">{count.toLocaleString()}</span>
                      <span className="text-muted small">({pct}%)</span>
                      {dropOffToNext !== null && dropOffToNext > 0 && (
                        <span className="text-muted" style={{ fontSize: "0.7rem" }}>→ {dropOffToNext}%</span>
                      )}
                    </div>
                  </div>
                  <div className="progress progress-sm">
                    <div
                      className={`progress-bar ${STAGE_COLORS[stage] ?? "bg-secondary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {data.avgScoreByStage[stage] > 0 && (
                    <div className="text-muted mt-1" style={{ fontSize: "0.7rem" }}>
                      avg score {data.avgScoreByStage[stage]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly activity */}
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">Leads Added — Last 7 Days</h3>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-end justify-content-between gap-1" style={{ height: 120 }}>
                {data.weeklyLeads.map(({ date, count }) => {
                  const pct = (count / maxWeekly) * 100;
                  const label = new Date(date + "T12:00:00Z").toLocaleDateString("en-KE", { weekday: "short" });
                  return (
                    <div key={date} className="d-flex flex-column align-items-center gap-1 flex-fill">
                      <span className="text-muted" style={{ fontSize: "0.65rem" }}>{count > 0 ? count : ""}</span>
                      <div className="w-100 rounded-top overflow-hidden" style={{ height: 80, display: "flex", alignItems: "flex-end", background: "var(--bg-elevated)" }}>
                        <div
                          style={{
                            width: "100%",
                            height: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                            background: "var(--tblr-primary)",
                            borderRadius: "2px 2px 0 0",
                            transition: "height 0.3s ease",
                          }}
                        />
                      </div>
                      <span className="text-muted" style={{ fontSize: "0.65rem" }}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="d-flex align-items-center gap-4 mt-3 pt-3 border-top small text-muted">
                <span>
                  WhatsApp outreach:{" "}
                  <strong className="text-body">{data.channelSplit.whatsapp ?? 0}</strong>
                </span>
                <span>
                  Email outreach:{" "}
                  <strong className="text-body">{data.channelSplit.email ?? 0}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top verticals */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Top Verticals</h3>
        </div>
        <div className="card-body">
          {data.topVerticals.map(({ vertical, count, avgScore }) => {
            const pct = Math.round((count / maxVertical) * 100);
            return (
              <div key={vertical} className="d-flex align-items-center gap-3 mb-3">
                <span className="text-muted small text-capitalize text-truncate" style={{ width: 120 }}>
                  {vertical.replace(/_/g, " ")}
                </span>
                <div className="flex-fill progress progress-sm">
                  <div className="progress-bar bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-muted small" style={{ width: 32, textAlign: "right" }}>{count}</span>
                {avgScore > 0 && (
                  <span
                    className={`small fw-medium`}
                    style={{
                      width: 48,
                      textAlign: "right",
                      color: avgScore >= 70 ? "var(--tblr-success)" : avgScore >= 40 ? "var(--tblr-warning)" : "var(--tblr-danger)",
                    }}
                  >
                    {avgScore}pts
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
