"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Mail, Zap, MessageSquare, BarChart2 } from "lucide-react";

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

const STAGE_COLOURS: Record<string, string> = {
  new: "bg-zinc-500", contacted: "bg-blue-500", replied: "bg-purple-500", qualified: "bg-amber-500", won: "bg-green-500",
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
      <div className="p-6">
        <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-zinc-500">Failed to load analytics.</div>;

  const maxWeekly = Math.max(...data.weeklyLeads.map((d) => d.count), 1);
  const maxVertical = Math.max(...data.topVerticals.map((v) => v.count), 1);

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Pipeline intelligence — Time · Money · Efficiency</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Leads",     value: data.total,           icon: Users,       colour: "text-blue-400"   },
          { label: "Enriched",        value: `${data.enrichmentRate}%`, icon: Zap,    colour: "text-green-400"  },
          { label: "Avg Score",       value: data.avgScore,        icon: TrendingUp,  colour: "text-purple-400" },
          { label: "Outreach Ready",  value: `${data.outreachRate}%`,  icon: Mail,    colour: "text-amber-400"  },
          { label: "Reachable",       value: data.reachable,       icon: MessageSquare, colour: "text-red-400"  },
        ].map(({ label, value, icon: Icon, colour }) => (
          <Card key={label}><CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-500">{label}</span>
              <Icon className={`h-4 w-4 ${colour}`} />
            </div>
            <div className="text-2xl font-bold text-zinc-100">{value}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversion funnel */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-zinc-400" /> Pipeline Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.funnel.map(({ stage, count, pct, dropOffToNext }) => (
              <div key={stage}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-400 font-medium">{STAGE_LABELS[stage] ?? stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">{count.toLocaleString()}</span>
                    <span className="text-zinc-600">({pct}%)</span>
                    {dropOffToNext !== null && dropOffToNext > 0 && (
                      <span className="text-zinc-700 text-[10px]">→ {dropOffToNext}%</span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${STAGE_COLOURS[stage] ?? "bg-zinc-500"} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {data.avgScoreByStage[stage] > 0 && (
                  <p className="text-[10px] text-zinc-600 mt-0.5">avg score {data.avgScoreByStage[stage]}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weekly activity */}
        <Card>
          <CardHeader><CardTitle>Leads Added — Last 7 Days</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-1 h-32">
              {data.weeklyLeads.map(({ date, count }) => {
                const pct = (count / maxWeekly) * 100;
                const label = new Date(date + "T12:00:00Z").toLocaleDateString("en-KE", { weekday: "short" });
                return (
                  <div key={date} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[10px] text-zinc-600">{count > 0 ? count : ""}</span>
                    <div className="w-full bg-zinc-800 rounded-t-sm overflow-hidden" style={{ height: "80px" }}>
                      <div
                        className="w-full bg-red-500/70 rounded-t-sm transition-all"
                        style={{ height: `${Math.max(pct, count > 0 ? 4 : 0)}%`, marginTop: "auto" }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-600">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500 border-t border-zinc-800 pt-3">
              <span>WhatsApp outreach: <strong className="text-zinc-300">{data.channelSplit.whatsapp ?? 0}</strong></span>
              <span>Email outreach: <strong className="text-zinc-300">{data.channelSplit.email ?? 0}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top verticals */}
      <Card>
        <CardHeader><CardTitle>Top Verticals</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.topVerticals.map(({ vertical, count, avgScore }) => {
              const pct = Math.round((count / maxVertical) * 100);
              return (
                <div key={vertical} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-zinc-400 truncate capitalize">{vertical.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs text-zinc-400">{count}</span>
                  {avgScore > 0 && (
                    <span className={`w-12 text-right text-xs font-medium ${avgScore >= 70 ? "text-green-400" : avgScore >= 40 ? "text-amber-400" : "text-red-400"}`}>
                      {avgScore}pts
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
