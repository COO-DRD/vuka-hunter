import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Infinity, Mail, Calendar, ShieldCheck, Hash, Building2, Pencil } from "lucide-react";
import Link from "next/link";
import ChangePasswordForm from "./ChangePasswordForm";
import ClearLeadsButton from "./ClearLeadsButton";

export default async function SettingsPage() {
  const user = await requireUser();
  const db = createSupabaseServiceClient();
  const { data: org } = await db.from("hunter_orgs").select("*").eq("id", user.id).single();
  const creditsUsed = org?.credits_used ?? 0;

  const initial   = user.email ? user.email[0].toUpperCase() : "?";
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Account &amp; preferences</p>
      </div>

      {/* Account info */}
      <Card className="mb-4">
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600/20 border border-red-600/30 text-lg font-bold text-red-400">
              {initial}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{user.email}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Beta member</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
              <span className="text-zinc-400 w-28 shrink-0">Email</span>
              <span className="text-zinc-200">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
              <span className="text-zinc-400 w-28 shrink-0">Member since</span>
              <span className="text-zinc-200">{memberSince}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <ShieldCheck className="h-4 w-4 text-zinc-500 shrink-0" />
              <span className="text-zinc-400 w-28 shrink-0">Auth</span>
              <span className="text-zinc-200">Email / Password</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Hash className="h-4 w-4 text-zinc-500 shrink-0" />
              <span className="text-zinc-400 w-28 shrink-0">User ID</span>
              <span className="font-mono text-xs text-zinc-500">{user.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits */}
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

      {/* Business profile */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Business Profile</CardTitle>
            <Link
              href="/onboarding"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Pencil className="h-3 w-3" /> Edit
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Building2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
              <span className="text-zinc-400 w-28 shrink-0">Business</span>
              <span className="text-zinc-200">{org?.business_name || org?.name || "—"}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Mail className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
              <span className="text-zinc-400 w-28 shrink-0">Sender name</span>
              <span className="text-zinc-200">{org?.sender_name || "—"}</span>
            </div>
            {org?.org_description && (
              <div className="flex items-start gap-3 text-sm">
                <Zap className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-zinc-400 w-28 shrink-0">What you do</span>
                <span className="text-zinc-400 leading-relaxed">{org.org_description}</span>
              </div>
            )}
            {org?.target_description && (
              <div className="flex items-start gap-3 text-sm">
                <Hash className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-zinc-400 w-28 shrink-0">Ideal lead</span>
                <span className="text-zinc-400 leading-relaxed">{org.target_description}</span>
              </div>
            )}
            {org?.priority_signals?.length > 0 && (
              <div className="flex items-start gap-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-zinc-400 w-28 shrink-0">Signals</span>
                <span className="text-zinc-400">{(org.priority_signals as string[]).join(", ")}</span>
              </div>
            )}
          </div>
          {!org?.use_case && (
            <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
              Profile not set up yet.{" "}
              <Link href="/onboarding" className="text-red-400 hover:text-red-300">Complete setup →</Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="mb-4">
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {/* API */}
      <Card className="mb-4">
        <CardHeader><CardTitle>API Access</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 mb-3">REST API for integrating Hunter with your own tools.</p>
          <div className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-500">
            Coming soon — available in the full release
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-300">Reset all leads</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Delete every lead, scrape job, and reset your credit counter. Useful for starting a fresh campaign.
              </p>
            </div>
            <div className="shrink-0">
              <ClearLeadsButton />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
