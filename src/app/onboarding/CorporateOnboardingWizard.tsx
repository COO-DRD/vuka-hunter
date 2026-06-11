"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconChevronRight as ChevronRight, IconChevronLeft as ChevronLeft, IconCheck as Check,
  IconBuilding as Building2, IconUsers as Users, IconUserPlus as UserPlus,
  IconX as X, IconMail as Mail, IconShieldCheck as Shield,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { HunterWordmark } from "@/components/HunterLogo";

const ROLES = [
  { value: "agency",       label: "Agency / Consultant",     desc: "Selling services, software, or expertise to other businesses" },
  { value: "manufacturer", label: "Manufacturer / Producer",  desc: "Finding buyers, retailers, or distributors for your products" },
  { value: "distributor",  label: "Distributor / Wholesaler", desc: "Sourcing or supplying goods to resell, distribute, or export" },
  { value: "agriculture",  label: "Agriculture / Farming",    desc: "Finding buyers, processors, or input suppliers" },
  { value: "finance",      label: "Finance / Investment",     desc: "Providing capital, loans, or financial services to SMEs" },
  { value: "recruiter",    label: "Recruiter / HR",           desc: "Placing candidates in companies across specific sectors" },
  { value: "research",     label: "Research / Intelligence",  desc: "Market research, competitive analysis, or business intelligence" },
  { value: "other",        label: "Other",                    desc: "A use case not listed above" },
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

  const [useCase, setUseCase]               = useState(existing?.use_case ?? "");
  const [businessName, setBusinessName]     = useState(existing?.business_name ?? existing?.company_name ?? "");
  const [senderName, setSenderName]         = useState(existing?.sender_name ?? "");
  const [orgDescription, setOrgDescription] = useState(existing?.org_description ?? "");
  const [targetDesc, setTargetDesc]         = useState(existing?.target_description ?? "");
  const [channel, setChannel]               = useState(existing?.outreach_channel ?? "whatsapp");
  const [signals, setSignals]               = useState<string[]>(existing?.priority_signals ?? []);

  const [inviteEmails, setInviteEmails]   = useState<string[]>([""]);
  const [inviting, setInviting]           = useState(false);
  const [inviteResults, setInviteResults] = useState<Array<{ email: string; status: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const seatLimit  = existing?.seat_limit ?? 5;
  const maxInvites = Math.max(0, seatLimit - 1);

  function toggleSignal(val: string) {
    setSignals((prev) =>
      prev.includes(val)
        ? prev.filter((s) => s !== val)
        : prev.length < 4 ? [...prev, val] : prev
    );
  }

  function addInviteRow() {
    if (inviteEmails.length < maxInvites) setInviteEmails((prev) => [...prev, ""]);
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
      } catch { /* non-fatal */ }
    }

    setTimeout(() => { window.location.assign("/dashboard"); }, 1500);
    setInviting(false);
  }

  const canProceed1 = !!useCase;
  const canProceed2 = businessName.trim().length > 0 && senderName.trim().length > 0;
  const canProceed3 = targetDesc.trim().length > 0;
  const canProceed4 = signals.length > 0;

  const descPlaceholder   = ORG_DESC_PLACEHOLDER[useCase]    ?? ORG_DESC_PLACEHOLDER.other;
  const targetPlaceholder = TARGET_PLACEHOLDER[useCase]      ?? TARGET_PLACEHOLDER.other;

  // suppress unused variable warning — orgId kept in props for future API calls
  void orgId;

  const inputCls = "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 resize-none transition-colors";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-stone-50">
      <div className="w-full max-w-lg">

        {/* Logo + corporate badge */}
        <div className="flex items-center gap-3 justify-center mb-12">
          <HunterWordmark size="sm" onLight />
          <span className="flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600">
            <Building2 className="h-3 w-3" /> Corporate
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-400 tracking-wide uppercase">
              Step {step} of {TOTAL_STEPS}
            </span>
            {step > 1 && (
              <span className="text-xs text-stone-400">
                {Math.round(((step - 1) / TOTAL_STEPS) * 100)}% complete
              </span>
            )}
          </div>
          <div className="h-0.5 w-full bg-stone-200 rounded-full">
            <div
              className="h-full bg-stone-900 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Step 1: Role ── */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">What best describes your organisation?</h1>
            <p className="text-sm text-stone-500 mb-8">
              This determines how 4unter scores and qualifies leads for your team.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button key={r.value} onClick={() => setUseCase(r.value)}
                  className={cn(
                    "text-left rounded-md border p-4 transition-all duration-150",
                    useCase === r.value
                      ? "border-stone-900 bg-white shadow-sm"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  )}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-stone-900 leading-snug">{r.label}</p>
                    {useCase === r.value && (
                      <div className="shrink-0 h-4 w-4 rounded-full bg-stone-900 flex items-center justify-center mt-0.5">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">{r.desc}</p>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceed1} className="gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Business details ── */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">Your organisation</h1>
            <p className="text-sm text-stone-500 mb-8">This shapes how 4unter qualifies and scores leads for your team.</p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Organisation name</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Kenya Ltd." autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Your name</label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Jane Wanjiku" />
                <p className="text-xs text-stone-400 mt-1.5">Team lead or admin — used as default sender name</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  What your organisation does <span className="normal-case font-normal text-stone-400">(optional)</span>
                </label>
                <textarea value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder={descPlaceholder} rows={3} className={inputCls} />
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canProceed2} className="gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Ideal lead ── */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">Your ideal lead</h1>
            <p className="text-sm text-stone-500 mb-8">4unter&apos;s AI scores every lead against this. Be specific.</p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Describe the business you are looking for
                </label>
                <textarea value={targetDesc} onChange={(e) => setTargetDesc(e.target.value)}
                  placeholder={targetPlaceholder} rows={4} autoFocus className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
                  Primary outreach channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CHANNELS.map((c) => (
                    <button key={c.value} onClick={() => setChannel(c.value)}
                      className={cn(
                        "rounded-md border py-2.5 text-sm font-medium transition-all duration-150",
                        channel === c.value
                          ? "border-stone-900 bg-white text-stone-900 shadow-sm"
                          : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"
                      )}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(4)} disabled={!canProceed3} className="gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Priority signals ── */}
        {step === 4 && (
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">What matters most?</h1>
            <p className="text-sm text-stone-500 mb-8">Select up to 4 signals. 4unter weights the AI score around your priorities.</p>
            <div className="space-y-1.5">
              {SIGNALS.map((s) => {
                const selected = signals.includes(s.value);
                const disabled = !selected && signals.length >= 4;
                return (
                  <button key={s.value} onClick={() => toggleSignal(s.value)} disabled={disabled}
                    className={cn(
                      "w-full text-left rounded-md border px-4 py-3 transition-all duration-150 flex items-center gap-3",
                      selected  ? "border-stone-900 bg-white shadow-sm"
                      : disabled ? "border-stone-100 opacity-35 cursor-not-allowed"
                      : "border-stone-200 bg-white hover:border-stone-300"
                    )}>
                    <div className={cn(
                      "shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                      selected ? "border-stone-900 bg-stone-900" : "border-stone-300"
                    )}>
                      {selected && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900">{s.label}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-stone-400 mt-3">{signals.length} of 4 selected</p>
            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button
                onClick={async () => {
                  const ok = await handleSaveProfile();
                  if (ok) setStep(5);
                }}
                disabled={!canProceed4}
                loading={loading}
                className="gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Team invites ── */}
        {step === 5 && (
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">Set up your team</h1>
            <p className="text-sm text-stone-500 mb-8">
              Invite team members to your corporate workspace. Each person receives an email to join.
              You can skip this and manage invites from Settings later.
            </p>

            <div className="rounded-md border border-stone-200 bg-white px-4 py-3 mb-6 flex items-center gap-3">
              <Shield className="h-4 w-4 text-stone-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-stone-700">
                  {seatLimit} seat{seatLimit !== 1 ? "s" : ""} on your plan
                </p>
                <p className="text-xs text-stone-400">1 used (you) · {maxInvites} available to invite</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {inviteEmails.map((email, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateInviteEmail(i, e.target.value)}
                      placeholder="team@company.com"
                      className="pl-9"
                    />
                  </div>
                  {inviteEmails.length > 1 && (
                    <button onClick={() => removeInviteRow(i)}
                      className="text-stone-400 hover:text-stone-700 transition-colors p-1" type="button">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {inviteEmails.length < maxInvites && (
              <button onClick={addInviteRow} type="button"
                className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors mb-5">
                <UserPlus className="h-3.5 w-3.5" /> Add another member
              </button>
            )}

            {inviteResults.length > 0 && (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 mb-4 space-y-1">
                {inviteResults.map((r) => (
                  <div key={r.email} className="flex items-center gap-2 text-xs">
                    {r.status === "invited"
                      ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <X className="h-3.5 w-3.5 text-stone-400 shrink-0" />}
                    <span className={r.status === "invited" ? "text-stone-700" : "text-stone-400"}>
                      {r.email} — {r.status === "invited" ? "invite sent" : r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.assign("/dashboard")}>
                  Skip for now
                </Button>
                <Button onClick={handleInviteAndFinish} loading={inviting} className="gap-2">
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
