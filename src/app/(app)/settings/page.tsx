import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Infinity } from "lucide-react";

export default async function SettingsPage() {
  const user = await requireUser();
  const db = createSupabaseServiceClient();
  const { data: org } = await db.from("hunter_orgs").select("*").eq("id", user.id).single();
  const creditsUsed = org?.credits_used ?? 0;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{user.email}</p>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Credits</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Infinity className="h-6 w-6 text-red-400" />
                <span className="text-2xl font-bold text-zinc-100">Unlimited</span>
              </div>
              <p className="text-xs text-zinc-500">
                {creditsUsed.toLocaleString()} leads scraped so far · Beta users get unlimited access
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-red-600/20 text-red-400 border border-red-600/30 px-3 py-1.5 rounded-full">
              <Zap className="h-3 w-3" /> Beta
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>API Access</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 mb-3">REST API for integrating Hunter with your own tools.</p>
          <div className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-500">
            Coming soon — available in the full release
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
