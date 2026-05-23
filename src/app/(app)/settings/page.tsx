import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/utils";
import { CheckCircle, Zap } from "lucide-react";

export default async function SettingsPage() {
  const user = await requireUser();
  const db = createSupabaseServiceClient();
  const { data: org } = await db.from("hunter_orgs").select("*").eq("id", user.id).single();
  const plan = org?.plan ?? "free";
  const creditsUsed  = org?.credits_used ?? 0;
  const creditsTotal = org?.credits_total ?? 50;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{user.email}</p>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Credits</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-zinc-300">
                <span className="text-2xl font-bold text-zinc-100">{creditsTotal - creditsUsed}</span>
                <span className="text-zinc-500 ml-1">/ {creditsTotal} remaining</span>
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">1 credit = 1 lead scraped. Resets monthly.</p>
            </div>
            <span className="text-xs font-medium bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full capitalize">{plan}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${Math.min(100, (creditsUsed / creditsTotal) * 100)}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Plans</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PLANS).map(([key, p]) => (
              <div key={key} className={`rounded-lg border p-4 ${plan === key ? "border-red-600 bg-red-950/20" : "border-zinc-800"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-zinc-200">{p.label}</span>
                  {plan === key && <CheckCircle className="h-4 w-4 text-red-400" />}
                </div>
                <p className="text-lg font-bold text-zinc-100">{p.price === 0 ? "Free" : `$${p.price}/mo`}</p>
                <p className="text-xs text-zinc-500 mt-1">{p.credits.toLocaleString()} leads/month</p>
                {plan !== key && p.price > 0 && (
                  <button className="mt-3 w-full rounded-md bg-red-600 hover:bg-red-500 py-1.5 text-xs font-medium text-white transition-colors flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3" /> Upgrade
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-3">Email hello@dullugroup.co.ke to upgrade.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>API Access</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 mb-3">Use Hunter&apos;s REST API to integrate with your tools.</p>
          <div className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-500">
            API key available on Pro plan and above
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
