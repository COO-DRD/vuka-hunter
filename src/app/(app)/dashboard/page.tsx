import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Star, Mail, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { STAGES } from "@/lib/utils";

async function getStats(orgId: string) {
  const db = createSupabaseServiceClient();
  const [{ count: total }, { count: hot }, { count: enriched }, { count: scored }, { data: recent }, { data: stageRows }] =
    await Promise.all([
      db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId),
      db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId).gte("google_rating", 4.5).gte("google_review_count", 30),
      db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("enrichment_status", "done"),
      db.from("hunter_leads").select("*", { count: "exact", head: true }).eq("org_id", orgId).not("score", "is", null),
      db.from("hunter_leads").select("id,name,score,stage,vertical,city,google_rating").eq("org_id", orgId).order("created_at", { ascending: false }).limit(6),
      db.from("hunter_leads").select("stage").eq("org_id", orgId),
    ]);

  const stageCounts: Record<string, number> = {};
  stageRows?.forEach(({ stage }) => { stageCounts[stage] = (stageCounts[stage] ?? 0) + 1; });
  return { total, hot, enriched, scored, recent: recent ?? [], stageCounts };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const db = createSupabaseServiceClient();
  const [{ total, hot, enriched, scored, recent, stageCounts }] = await Promise.all([
    getStats(user.id),
    db.from("hunter_orgs").upsert({ id: user.id, name: user.email ?? "My Workspace", plan: "beta", credits_total: 999999 }, { onConflict: "id" }),
  ]);
  const stats = [
    { label: "Total Leads",     value: total ?? 0,    icon: Users,      color: "text-blue-400" },
    { label: "Hot Leads ★4.5+", value: hot ?? 0,      icon: Star,       color: "text-yellow-400" },
    { label: "Enriched",        value: enriched ?? 0, icon: Mail,       color: "text-green-400" },
    { label: "AI Scored",       value: scored ?? 0,   icon: TrendingUp, color: "text-purple-400" },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Your lead pipeline at a glance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}><CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-500">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-zinc-100">{value.toLocaleString()}</div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {STAGES.map((s) => {
                const count = stageCounts[s.value] ?? 0;
                const pct = total ? Math.round((count / (total as number)) * 100) : 0;
                return (
                  <div key={s.value}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">{s.label}</span>
                      <span className="text-zinc-300 font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Leads</CardTitle>
              <Link href="/leads" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
            </div>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No leads yet.</p>
                <Link href="/discover" className="text-xs text-red-400 hover:underline mt-1 inline-block">Start scraping →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((lead: Record<string, unknown>) => (
                  <Link key={lead.id as string} href={`/leads/${lead.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-800 transition-colors">
                    <div className="h-8 w-8 rounded-md bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                      {(lead.name as string).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{lead.name as string}</p>
                      <p className="text-xs text-zinc-500 truncate">{lead.vertical as string} · {lead.city as string}</p>
                    </div>
                    {lead.score !== null && (
                      <span className={`text-xs font-bold ${(lead.score as number) >= 70 ? "text-green-400" : (lead.score as number) >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                        {lead.score as number}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {(total === 0 || total === null) && (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-700 p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-200 mb-1">Get started</h2>
          <p className="text-sm text-zinc-500 mb-4">Discover leads → Enrich → Score → Outreach</p>
          <Link href="/discover" className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors">
            <Zap className="h-4 w-4" /> Start scraping leads
          </Link>
        </div>
      )}
    </div>
  );
}
