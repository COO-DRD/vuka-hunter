import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap, Infinity, Mail, Calendar, ShieldCheck, Hash, Building2,
  Pencil, CheckCircle2, XCircle, ExternalLink, MapPin, Users,
  FileText, AlertCircle, BadgeCheck,
} from "lucide-react";
import Link from "next/link";
import ChangePasswordForm from "./ChangePasswordForm";
import ClearLeadsButton from "./ClearLeadsButton";
import EnrichmentModeSelector from "@/components/settings/EnrichmentModeSelector";
import ComplianceForm from "./ComplianceForm";
import TeamPanel from "./TeamPanel";

export default async function SettingsPage() {
  const user = await requireUser();
  const db   = createSupabaseServiceClient();

  const { data: org } = await db.from("hunter_orgs").select("*").eq("id", user.id).single();

  const { data: consents } = await db
    .from("hunter_legal_consents")
    .select("consent_type, accepted, accepted_at")
    .eq("org_id", user.id)
    .order("accepted_at", { ascending: false });

  const { data: members } = org?.account_type === "corporate"
    ? await db.from("hunter_org_members").select("user_id, role, status, display_name, last_active_at").eq("org_id", user.id).order("created_at")
    : { data: null };

  const seatsUsed  = org?.seats_used  ?? 1;
  const seatLimit  = org?.seat_limit  ?? 5;

  const isCorporate   = org?.account_type === "corporate";
  const creditsUsed   = org?.credits_used ?? 0;
  const initial       = user.email ? user.email[0].toUpperCase() : "?";
  const memberSince   = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const trialEnd      = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;
  const isTrialing    = org?.subscription_status === "trialing";
  const planLabels: Record<string, string> = { trial: "Free Trial", starter: "Starter", growth: "Growth", enterprise: "Enterprise" };
  const planLabel = planLabels[org?.subscribed_plan ?? "trial"] ?? "Free Trial";

  const statusColour: Record<string, string> = {
    trialing: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    active:   "text-green-400 bg-green-500/10 border-green-500/20",
    past_due: "text-red-400 bg-red-500/10 border-red-500/20",
    cancelled:"text-zinc-400 bg-zinc-500/10 border-zinc-700",
    unpaid:   "text-red-400 bg-red-500/10 border-red-500/20",
  };
  const statusLabel: Record<string, string> = {
    trialing: "Trial", active: "Active", past_due: "Past due",
    cancelled: "Cancelled", unpaid: "Unpaid",
  };
  const subStatus = org?.subscription_status ?? "trialing";

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Account, compliance &amp; preferences</p>
      </div>

      {/* ── Enrichment mode ── */}
      <Card className="mb-4">
        <CardHeader><CardTitle>Enrichment Mode</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-500 mb-4">
            Select your sales context. Hunter scores leads and writes outreach copy optimised for this use case.
          </p>
          <EnrichmentModeSelector current={org?.enrichment_mode ?? "general"} />
        </CardContent>
      </Card>

      {/* ── Subscription ── */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Subscription</CardTitle>
            <span className={`flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1 rounded-full ${statusColour[subStatus] ?? statusColour.trialing}`}>
              <Zap className="h-3 w-3" />
              {statusLabel[subStatus] ?? "Trial"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-bold text-zinc-100">{planLabel}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isCorporate ? `${org?.seat_limit ?? 5} seats · ${org?.seats_used ?? 1} in use` : "Individual account"}
              </p>
            </div>
            {isTrialing && trialEnd && (
              <div className="text-right">
                <p className={`text-sm font-semibold ${trialDaysLeft <= 2 ? "text-red-400" : "text-amber-400"}`}>
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Trial ends {trialEnd.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Infinity className="h-4 w-4 text-zinc-500 shrink-0" />
              <span className="text-zinc-400 w-28 shrink-0">Credits</span>
              <span className="text-zinc-200">Unlimited · {creditsUsed.toLocaleString()} used</span>
            </div>
          </div>
          {isTrialing && (
            <div className="mt-4 rounded-lg border border-amber-900/40 bg-amber-950/10 px-4 py-3 text-xs text-amber-400">
              After your trial, plans start at <span className="font-semibold">KES 5,000/month</span> for corporate
              or <span className="font-semibold">KES 2,500/month</span> for individual.
              Upgrade any time — contact <span className="font-medium">billing@dullugroup.co.ke</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Account ── */}
      <Card className="mb-4">
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600/20 border border-red-600/30 text-lg font-bold text-red-400">
              {initial}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{user.email}</p>
              <p className="text-xs text-zinc-500 mt-0.5 capitalize">
                {isCorporate ? "Corporate admin" : "Individual"} · {org?.name}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <SettingRow icon={Mail} label="Email">{user.email}</SettingRow>
            <SettingRow icon={Calendar} label="Member since">{memberSince}</SettingRow>
            <SettingRow icon={ShieldCheck} label="Auth">
              {org?.auth_provider === "google" ? "Google OAuth" : "Email / Password"}
            </SettingRow>
            <SettingRow icon={BadgeCheck} label="Email verified">
              {user.email_confirmed_at
                ? <span className="text-green-400">Verified {new Date(user.email_confirmed_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                : <span className="text-amber-400 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Not yet verified</span>
              }
            </SettingRow>
            {org?.operating_county && (
              <SettingRow icon={MapPin} label="County">{org.operating_county}{org.operating_address ? ` · ${org.operating_address}` : ""}</SettingRow>
            )}
            <SettingRow icon={Hash} label="User ID">
              <span className="font-mono text-xs text-zinc-500">{user.id}</span>
            </SettingRow>
          </div>
        </CardContent>
      </Card>

      {/* ── Business profile ── */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Business Profile</CardTitle>
            <Link href="/onboarding" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <Pencil className="h-3 w-3" /> Edit
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <SettingRow icon={Building2} label="Business">{org?.business_name || org?.company_name || org?.name || "—"}</SettingRow>
            <SettingRow icon={Mail} label="Sender name">{org?.sender_name || "—"}</SettingRow>
            {org?.org_description && (
              <SettingRow icon={Zap} label="What you do">
                <span className="text-zinc-400 leading-relaxed">{org.org_description}</span>
              </SettingRow>
            )}
            {org?.priority_signals?.length > 0 && (
              <SettingRow icon={ShieldCheck} label="Signals">
                <span className="text-zinc-400">{(org.priority_signals as string[]).join(", ")}</span>
              </SettingRow>
            )}
          </div>
          {!org?.use_case && (
            <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
              Profile not set up yet.{" "}
              <Link href="/onboarding" className="text-amber-400 hover:text-amber-300">Complete setup →</Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Corporate team ── */}
      {isCorporate && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Team</CardTitle>
              <Link href="/upgrade" className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                <Users className="h-3 w-3" /> Upgrade seats
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <TeamPanel
              members={members ?? []}
              seatLimit={seatLimit}
              seatsUsed={seatsUsed}
              orgDomain={org?.org_domain ?? null}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Compliance (KRA PIN + company reg — post-signup) ── */}
      {isCorporate && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Billing &amp; Compliance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 mb-4">
              Required for tax-compliant invoicing. KRA PIN appears on all receipts issued to your organisation.
              Company registration number is used for enterprise contract verification.
            </p>
            <ComplianceForm
              kraPin={org?.kra_pin ?? ""}
              companyRegNo={org?.company_reg_no ?? ""}
              billingEmail={org?.billing_email ?? ""}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Data & Privacy ── */}
      <Card className="mb-4">
        <CardHeader><CardTitle>Data &amp; Privacy</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Your data is processed by Dullu Digital under the{" "}
            <span className="text-zinc-300">Kenya Data Protection Act 2019</span>.
            To exercise your rights (access, correction, erasure, portability), contact{" "}
            <a href="mailto:privacy@dullugroup.co.ke" className="text-amber-400 hover:text-amber-300">
              privacy@dullugroup.co.ke
            </a>.
          </p>
          {consents && consents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-400 mb-2">Consent record</p>
              {consents.map((c) => {
                const labels: Record<string, string> = {
                  terms_of_service:                "Terms of Service",
                  kenya_dpa_data_collection:       "Kenya DPA — Data collection & processing",
                  kenya_dpa_third_party_enrichment:"Kenya DPA — Third-party enrichment",
                  data_processing_agreement:       "Data Processing Agreement",
                  kra_compliance_acknowledgment:   "KRA Compliance",
                  marketing_communications:        "Marketing communications",
                };
                return (
                  <div key={`${c.consent_type}-${c.accepted_at}`} className="flex items-center gap-3 text-xs text-zinc-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span className="flex-1">{labels[c.consent_type] ?? c.consent_type}</span>
                    <span className="text-zinc-700 shrink-0">
                      {new Date(c.accepted_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Usage Policy ── */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usage Policy</CardTitle>
            <Link href="/terms" target="_blank" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Full terms <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Permitted
              </p>
              <div className="space-y-1.5">
                {[
                  "B2B lead discovery and outreach for your own business",
                  "Market research and competitive intelligence",
                  "Importing and managing your own lead lists",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs text-zinc-400">
                    <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />{item}
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" /> Not Permitted
              </p>
              <div className="space-y-1.5">
                {[
                  "Reselling or redistributing scraped data to third parties",
                  "Mass spamming or automated unsolicited messaging",
                  "Targeting private individuals — B2B entities only",
                  "Creating multiple accounts to circumvent limits",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs text-zinc-400">
                    <XCircle className="h-3 w-3 text-red-700 shrink-0 mt-0.5" />{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {org?.terms_accepted_at && (
            <p className="mt-4 text-xs text-zinc-600">
              <FileText className="h-3 w-3 inline mr-1" />
              Terms accepted{" "}
              {new Date(org.terms_accepted_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Change password ── */}
      {org?.auth_provider !== "google" && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
          <CardContent><ChangePasswordForm /></CardContent>
        </Card>
      )}

      {/* ── API ── */}
      <Card className="mb-4">
        <CardHeader><CardTitle>API Access</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 mb-3">REST API for integrating Hunter with your own tools.</p>
          <div className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-500">
            Available in full release
          </div>
        </CardContent>
      </Card>

      {/* ── Danger zone ── */}
      <Card className="border-red-900/50">
        <CardHeader><CardTitle className="text-red-400">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-300">Reset all leads</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Delete every lead, scrape job, and reset your credit counter.
              </p>
            </div>
            <div className="shrink-0"><ClearLeadsButton /></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({
  icon: Icon, label, children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
      <span className="text-zinc-400 w-28 shrink-0">{label}</span>
      <span className="text-zinc-200">{children}</span>
    </div>
  );
}
