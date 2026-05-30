import { requireUser, resolveOrgId, checkOrgAccess } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Star, Mail, Zap, ArrowRight, Search, Sparkles, MessageSquare, GitBranch, ChevronRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { STAGES } from "@/lib/utils";

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
    db.from("hunter_leads").select("id,name,score,stage,vertical,city,google_rating").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
    db.from("hunter_leads").select("stage").eq("org_id", orgId),
  ]);

  const stageCounts: Record<string, number> = {};
  stageRows?.forEach(({ stage }) => { stageCounts[stage] = (stageCounts[stage] ?? 0) + 1; });
  return { total, hot, enriched, scored, unenriched, needsScore, recent: recent ?? [], stageCounts };
}

function getNextAction(total: number, unenriched: number, needsScore: number, scored: number): {
  label: string; desc: string; href: string; color: string; icon: typeof Zap;
} | null {
  if (total === 0)       return null;
  if (unenriched > 0)    return { label: `Enrich ${unenriched} lead${unenriched > 1 ? "s" : ""}`, desc: "Find contact details, website intelligence, and tech stack.", href: "/leads", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Mail };
  if (needsScore > 0)    return { label: `Score ${needsScore} lead${needsScore > 1 ? "s" : ""} with AI`, desc: "Hunter Intelligence ranks each lead by revenue signal and fit.", href: "/leads", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: Sparkles };
  if (scored > 0)        return { label: "Write outreach copy for your top leads", desc: "AI-generated WhatsApp + email openers personalised per lead.", href: "/leads", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: MessageSquare };
  return { label: "Move leads through your pipeline", desc: "Track which leads are contacted, replied, and won.", href: "/pipeline", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: GitBranch };
}

const PIPELINE_STEPS = [
  { step: 1, label: "Discover",  desc: "Surface businesses from 36 Kenyan verticals",        href: "/discover",  icon: Search,        time: "~2 min" },
  { step: 2, label: "Enrich",    desc: "Crawl each website for contacts, tech stack & more",  href: "/leads",     icon: Mail,          time: "~1 min/lead" },
  { step: 3, label: "Score",     desc: "Hunter AI ranks leads by revenue signal & fit",        href: "/leads",     icon: Sparkles,      time: "~10 sec/lead" },
  { step: 4, label: "Outreach",  desc: "Generate personalised WhatsApp + email openers",      href: "/leads",     icon: MessageSquare, time: "~5 sec/lead" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const [{ total, hot, enriched, scored, unenriched, needsScore, recent, stageCounts }, access] =
    await Promise.all([getStats(orgId), checkOrgAccess(orgId)]);

  const totalN = total ?? 0;
  const stats = [
    { label: "Total Leads",     value: totalN,          icon: Users,      color: "text-blue-400" },
    { label: "Hot ★4.5+",       value: hot ?? 0,        icon: Star,       color: "text-yellow-400" },
    { label: "Enriched",        value: enriched ?? 0,   icon: Mail,       color: "text-amber-400" },
    { label: "AI Scored",       value: scored ?? 0,     icon: TrendingUp, color: "text-purple-400" },
  ];

  const nextAction = getNextAction(totalN, unenriched ?? 0, needsScore ?? 0, scored ?? 0);

  // Trial banner config
  const trialExpired  = !access.allowed && access.reason === "trial_expired";
  const paymentFailed = !access.allowed && access.reason === "payment_failed";
  const trialUrgent   = access.isTrialing && (access.daysLeft ?? 99) <= 3;
  const showBanner    = !access.allowed || (access.isTrialing && (access.daysLeft ?? 99) < 999);

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Your lead pipeline at a glance</p>
      </div>

      {/* ── Trial / access banner ── */}
      {showBanner && (
        <div className={`mb-5 rounded-xl border px-4 py-3.5 flex items-center gap-3 ${
          trialExpired || paymentFailed
            ? "border-red-700/50 bg-red-950/30"
            : trialUrgent
            ? "border-red-700/40 bg-red-950/20"
            : "border-amber-700/40 bg-amber-950/20"
        }`}>
          {trialExpired || paymentFailed
            ? <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            : <Clock className={`h-4 w-4 shrink-0 ${trialUrgent ? "text-red-400" : "text-amber-400"}`} />
          }
          <div className="flex-1 min-w-0">
            {trialExpired && (
              <p className="text-sm font-semibold text-red-300">
                Your free trial has ended — your {totalN} saved leads are waiting.
              </p>
            )}
            {paymentFailed && (
              <p className="text-sm font-semibold text-red-300">
                Payment failed — update your payment method to restore access.
              </p>
            )}
            {access.isTrialing && !trialExpired && (
              <p className={`text-sm font-semibold ${trialUrgent ? "text-red-300" : "text-amber-300"}`}>
                {(access.daysLeft ?? 0) <= 1
                  ? "Last day of your free trial."
                  : `${access.daysLeft} days left in your free trial.`}
                {` ${access.trialLeadLimit - (totalN)} lead slots remaining.`}
              </p>
            )}
            <p className="text-xs text-zinc-500 mt-0.5">
              {trialExpired
                ? "Upgrade to keep prospecting. Your pipeline and leads are preserved."
                : paymentFailed
                ? "No access until payment is resolved."
                : "Upgrade any time to remove limits and keep your pipeline running."}
            </p>
          </div>
          <Link
            href="/upgrade"
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              trialExpired || paymentFailed || trialUrgent
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-amber-500 hover:bg-amber-400 text-black"
            }`}
          >
            Upgrade →
          </Link>
        </div>
      )}

      {/* ── Zero-lead activation ── */}
      {totalN === 0 && (
        <div className="mb-6 rounded-2xl border border-amber-900/40 bg-gradient-to-br from-amber-950/30 to-zinc-900/60 p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-100">Get your first leads in 2 minutes</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Follow these 4 steps — each one runs in the background while you move on.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {PIPELINE_STEPS.map((s) => (
              <Link key={s.step} href={s.href}
                className="group flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-amber-700/40 hover:bg-zinc-800/60 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Step {s.step}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-amber-400 transition-colors" />
                </div>
                <s.icon className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{s.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
                <span className="text-[11px] text-zinc-600">{s.time}</span>
              </Link>
            ))}
          </div>
          <Link href="/discover"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
            <Search className="h-4 w-4" /> Start with Discover →
          </Link>
        </div>
      )}

      {/* ── Smart next-action banner (shown when user has leads) ── */}
      {nextAction && (
        <Link href={nextAction.href}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-5 transition-all hover:opacity-90 ${nextAction.color}`}>
          <nextAction.icon className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-100">{nextAction.label}</p>
            <p className="text-xs text-zinc-400 truncate">{nextAction.desc}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
        </Link>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-zinc-100">{value.toLocaleString()}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* ── Pipeline + Recent ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
          <CardContent>
            {totalN === 0 ? (
              <div className="space-y-2">
                {STAGES.map((s) => (
                  <div key={s.value}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-600">{s.label}</span>
                      <span className="text-zinc-700 font-medium">0</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800/50 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {STAGES.map((s) => {
                  const count = stageCounts[s.value] ?? 0;
                  const pct = totalN ? Math.round((count / totalN) * 100) : 0;
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
            )}
            {totalN > 0 && (
              <Link href="/pipeline" className="mt-4 flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition-colors">
                Manage pipeline <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Leads</CardTitle>
              {recent.length > 0 && (
                <Link href="/leads" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="text-center py-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/60 mb-3">
                  <Users className="h-5 w-5 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-500 mb-1">No leads yet.</p>
                <p className="text-xs text-zinc-600 mb-4">Run a scrape to populate your workspace with real businesses.</p>
                <Link href="/discover"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/20 px-4 py-2 text-sm font-medium text-amber-400 transition-colors">
                  <Search className="h-4 w-4" /> Go to Discover
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recent.map((lead: Record<string, unknown>) => {
                  const score = lead.score as number | null;
                  const enriched = lead.enrichment_status === "done";
                  return (
                    <Link key={lead.id as string} href={`/leads/${lead.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-800/60 transition-colors group">
                      <div className="h-8 w-8 rounded-md bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0 group-hover:bg-zinc-700 transition-colors">
                        {(lead.name as string).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{lead.name as string}</p>
                        <p className="text-xs text-zinc-500 truncate capitalize">{lead.vertical as string} · {lead.city as string}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {enriched && <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />}
                        {score !== null && (
                          <span className={`text-xs font-bold tabular-nums ${score >= 70 ? "text-amber-400" : score >= 40 ? "text-yellow-400" : "text-zinc-500"}`}>
                            {score}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── How it works (always visible for context) ── */}
      {totalN > 0 && totalN < 5 && (
        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Pipeline steps</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PIPELINE_STEPS.map((s) => (
              <Link key={s.step} href={s.href}
                className="flex items-center gap-2.5 rounded-lg p-3 border border-zinc-800 bg-zinc-950/40 hover:border-amber-700/30 transition-colors group">
                <s.icon className="h-4 w-4 text-zinc-500 group-hover:text-amber-400 transition-colors shrink-0" />
                <div>
                  <p className="text-xs font-medium text-zinc-300">{s.label}</p>
                  <p className="text-[11px] text-zinc-600">{s.time}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
