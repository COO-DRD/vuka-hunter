"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap, ChevronRight, ChevronLeft, Check, Building2,
  Users, UserPlus, X, Mail, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Reuse the same role/signal/channel constants ──────────────────────────────
const ROLES = [
  { value: "agency",       label: "Agency / Consultant",     desc: "I sell services, software, or expertise to other businesses",          icon: "🏢" },
  { value: "manufacturer", label: "Manufacturer / Producer",  desc: "I make products and need buyers, retailers, or distributors",          icon: "🏭" },
  { value: "distributor",  label: "Distributor / Wholesaler", desc: "I source or supply products to resell, distribute, or export",         icon: "📦" },
  { value: "agriculture",  label: "Agriculture / Farming",    desc: "I produce goods and need buyers, processors, or input suppliers",      icon: "🌾" },
  { value: "finance",      label: "Finance / Investment",     desc: "I provide capital, loans, or financial services to businesses",        icon: "💼" },
  { value: "recruiter",    label: "Recruiter / HR",           desc: "I find candidates or talent for companies in specific sectors",        icon: "🎯" },
  { value: "research",     label: "Research / Intelligence",  desc: "I do market research, competitive analysis, or business intelligence", icon: "🔍" },
  { value: "other",        label: "Other",                    desc: "My use case is different — I'll describe it below",                    icon: "⚙️" },
];

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email",    label: "Email"    },
  { value: "phone",    label: "Phone"    },
  { value: "visit",    label: "In-person"},
];

const SIGNALS = [
  { value: "established", label: "Established business",     desc: "High Google rating and strong review count" },
  { value: "growing",     label: "Growing fast",             desc: "Recent surge in reviews or expanding locations" },
  { value: "gap",         label: "Has a gap I can fill",     desc: "Clearly missing my product, service, or supply" },
  { value: "volume",      label: "High customer volume",     desc: "Lots of transactions, foot traffic, or reviews" },
  { value: "reachable",   label: "Contactable directly",     desc: "Has phone, email, or WhatsApp available" },
  { value: "no_digital",  label: "Limited digital presence", desc: "No website, no social, or very outdated online presence" },
  { value: "budget",      label: "Budget signals",           desc: "Premium positioning, multiple locations, or high-end clientele" },
  { value: "geography",   label: "Serves my target area",    desc: "Located in or delivers to my region" },
];

const ORG_DESC_PLACEHOLDER: Record<string, string> = {
  agency: "e.g. We build AI-powered booking and automation systems for local businesses in Kenya",
  other:  "Describe what you do and who you serve…",
};
const TARGET_PLACEHOLDER: Record<string, string> = {
  agency: "e.g. Hotels and clinics with 50+ reviews, no booking system, and active WhatsApp presence",
  other:  "Describe the type of business you are looking for…",
};

interface OrgProfile {
  business_name?:      string | null;
  sender_name?:        string | null;
  use_case?:           string | null;
  org_description?:    string | null;
  target_description?: string | null;
  priority_signals?:   string[] | null;
  outreach_channel?:   string | null;
  onboarding_complete?: boolean;
  seat_limit?:         number | null;
  company_name?:       string | null;
}

export default function CorporateOnboardingWizard({
  existing,
  orgId,
}: {
  existing: OrgProfile | null;
  orgId: string;
}) {
  const TOTAL_STEPS = 5;
  const [step, setStep]       = useState(1);

  // Profile state
  const [useCase, setUseCase]               = useState(existing?.use_case ?? "");
  const [businessName, setBusinessName]     = useState(existing?.business_name ?? existing?.company_name ?? "");
  const [senderName, setSenderName]         = useState(existing?.sender_name ?? "");
  const [orgDescription, setOrgDescription] = useState(existing?.org_description ?? "");
  const [targetDesc, setTargetDesc]         = useState(existing?.target_description ?? "");
  const [channel, setChannel]               = useState(existing?.outreach_channel ?? "whatsapp");
  const [signals, setSignals]               = useState<string[]>(existing?.priority_signals ?? []);

  // Invite state
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);
  const [inviting, setInviting]         = useState(false);
  const [inviteResults, setInviteResults] = useState<Array<{ email: string; status: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const seatLimit  = existing?.seat_limit ?? 5;
  const maxInvites = Math.max(0, seatLimit - 1); // admin occupies 1 seat

  function toggleSignal(val: string) {
    setSignals((prev) =>
      prev.includes(val)
        ? prev.filter((s) => s !== val)
        : prev.length < 4 ? [...prev, val] : prev
    );
  }

  function addInviteRow() {
    if (inviteEmails.length < maxInvites) {
      setInviteEmails((prev) => [...prev, ""]);
    }
  }

  function removeInviteRow(i: number) {
    setInviteEmails((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateInviteEmail(i: number, val: string) {
    setInviteEmails((prev) => prev.map((e, idx) => (idx === i ? val : e)));
  }

  async function handleSaveProfile() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          businessName,
          senderName,
          useCase,
          orgDescription,
          targetDescription: targetDesc,
          prioritySignals:   signals,
          outreachChannel:   channel,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save profile."); return false; }
      return true;
    } catch {
      setError("Something went wrong. Check your connection.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteAndFinish() {
    setInviting(true);
    setError("");
    const validEmails = inviteEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e));

    if (validEmails.length > 0) {
      try {
        const res = await fetch("/api/auth/invite", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ emails: validEmails }),
        });
        const json = await res.json();
        if (res.ok) setInviteResults(json.results ?? []);
      } catch { /* non-fatal — continue to dashboard */ }
    }

    // Redirect after a short moment so user sees results
    setTimeout(() => { window.location.assign("/dashboard"); }, 1500);
    setInviting(false);
  }

  const canProceed1 = !!useCase;
  const canProceed2 = businessName.trim().length > 0 && senderName.trim().length > 0;
  const canProceed3 = targetDesc.trim().length > 0;
  const canProceed4 = signals.length > 0;

  const descPlaceholder   = ORG_DESC_PLACEHOLDER[useCase]    ?? ORG_DESC_PLACEHOLDER.other;
  const targetPlaceholder = TARGET_PLACEHOLDER[useCase]      ?? TARGET_PLACEHOLDER.other;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">

        {/* Logo + corporate badge */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-zinc-100 text-lg tracking-tight">Hunter</span>
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
            <Building2 className="h-3 w-3" /> Corporate
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div key={s} className={cn(
              "rounded-full transition-all",
              s === step  ? "h-2 w-6 bg-amber-500" :
              s < step    ? "h-2 w-2 bg-amber-700"  :
                            "h-2 w-2 bg-zinc-700"
            )} />
          ))}
        </div>

        {/* ── Step 1: Role ── */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">Welcome to Hunter</h1>
            <p className="text-sm text-zinc-400 mb-6">What best describes your organisation?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button key={r.value} onClick={() => setUseCase(r.value)}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-all",
                    useCase === r.value
                      ? "border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/40"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                  )}>
                  <div className="text-2xl mb-2">{r.icon}</div>
                  <p className="text-sm font-semibold text-zinc-100 mb-0.5">{r.label}</p>
                  <p className="text-xs text-zinc-500 leading-snug">{r.desc}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceed1} className="gap-2 bg-amber-600 hover:bg-amber-700">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Business details ── */}
        {step === 2 && (
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">Your organisation</h1>
            <p className="text-sm text-zinc-400 mb-6">This shapes how Hunter qualifies and scores leads.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Organisation / company name *</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Kenya Ltd." autoFocus />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Your name (team lead / admin) *</label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Jane Wanjiku" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">What does your organisation do? <span className="text-zinc-600">(optional)</span></label>
                <textarea value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder={descPlaceholder} rows={3}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canProceed2} className="gap-2 bg-amber-600 hover:bg-amber-700">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Ideal lead ── */}
        {step === 3 && (
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">Describe your ideal lead</h1>
            <p className="text-sm text-zinc-400 mb-6">Hunter&apos;s AI scores leads against this. Be specific.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">What type of business are you looking for? *</label>
                <textarea value={targetDesc} onChange={(e) => setTargetDesc(e.target.value)}
                  placeholder={targetPlaceholder} rows={4} autoFocus
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2">How will your team reach out to leads?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CHANNELS.map((c) => (
                    <button key={c.value} onClick={() => setChannel(c.value)}
                      className={cn(
                        "rounded-lg border py-2.5 text-sm font-medium transition-all",
                        channel === c.value
                          ? "border-amber-500 bg-amber-950/20 text-amber-300"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                      )}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(4)} disabled={!canProceed3} className="gap-2 bg-amber-600 hover:bg-amber-700">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Priority signals ── */}
        {step === 4 && (
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">What matters most?</h1>
            <p className="text-sm text-zinc-400 mb-6">Pick up to 4 signals. Hunter weights the AI score around these.</p>
            <div className="space-y-2">
              {SIGNALS.map((s) => {
                const selected = signals.includes(s.value);
                const disabled = !selected && signals.length >= 4;
                return (
                  <button key={s.value} onClick={() => toggleSignal(s.value)} disabled={disabled}
                    className={cn(
                      "w-full text-left rounded-xl border px-4 py-3 transition-all flex items-start gap-3",
                      selected  ? "border-amber-500 bg-amber-950/20"
                                : disabled ? "border-zinc-800/50 opacity-40 cursor-not-allowed"
                                : "border-zinc-800 hover:border-zinc-600"
                    )}>
                    <div className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center",
                      selected ? "border-amber-500 bg-amber-500" : "border-zinc-600"
                    )}>
                      {selected && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{s.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-600 mt-3">{signals.length}/4 selected</p>
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button
                onClick={async () => {
                  const ok = await handleSaveProfile();
                  if (ok) setStep(5);
                }}
                disabled={!canProceed4}
                loading={loading}
                className="gap-2 bg-amber-600 hover:bg-amber-700">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Team invites (corporate-only) ── */}
        {step === 5 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-amber-400" />
              <h1 className="text-xl font-bold text-zinc-100">Set up your team</h1>
            </div>
            <p className="text-sm text-zinc-400 mb-1">
              Invite up to <span className="text-amber-400 font-medium">{maxInvites} team members</span> to your corporate workspace.
            </p>
            <p className="text-xs text-zinc-600 mb-6">
              Each invited member receives an email to set their password and join your account.
              You can skip this and invite from Settings later.
            </p>

            {/* Seat indicator */}
            <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 px-4 py-3 mb-5 flex items-center gap-3">
              <Shield className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-300">
                  {seatLimit} seat{seatLimit !== 1 ? "s" : ""} on your plan
                </p>
                <p className="text-xs text-zinc-500">1 used (you) · {maxInvites} available to invite</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {inviteEmails.map((email, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateInviteEmail(i, e.target.value)}
                      placeholder={`team@company.com`}
                      className="pl-9"
                    />
                  </div>
                  {inviteEmails.length > 1 && (
                    <button onClick={() => removeInviteRow(i)}
                      className="text-zinc-600 hover:text-zinc-300 transition-colors p-1" type="button">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {inviteEmails.length < maxInvites && (
              <button onClick={addInviteRow} type="button"
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors mb-5">
                <UserPlus className="h-3.5 w-3.5" /> Add another member
              </button>
            )}

            {/* Invite results */}
            {inviteResults.length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 mb-4 space-y-1">
                {inviteResults.map((r) => (
                  <div key={r.email} className="flex items-center gap-2 text-xs">
                    {r.status === "invited"
                      ? <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      : <X className="h-3.5 w-3.5 text-zinc-500 shrink-0" />}
                    <span className={r.status === "invited" ? "text-zinc-300" : "text-zinc-500"}>
                      {r.email} — {r.status === "invited" ? "invite sent" : r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.assign("/dashboard")}
                  className="border-zinc-700 text-zinc-400 hover:text-zinc-200">
                  Skip for now
                </Button>
                <Button onClick={handleInviteAndFinish} loading={inviting}
                  className="gap-2 bg-amber-600 hover:bg-amber-700">
                  {inviteEmails.some((e) => e.trim()) ? "Send invites & continue" : "Continue"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
