"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
  { value: "established", label: "Established business",       desc: "High Google rating and strong review count" },
  { value: "growing",     label: "Growing fast",               desc: "Recent surge in reviews or expanding locations" },
  { value: "gap",         label: "Has a gap I can fill",       desc: "Clearly missing my product, service, or supply" },
  { value: "volume",      label: "High customer volume",       desc: "Lots of transactions, foot traffic, or reviews" },
  { value: "reachable",   label: "Contactable directly",       desc: "Has phone, email, or WhatsApp available" },
  { value: "no_digital",  label: "Limited digital presence",   desc: "No website, no social, or very outdated online presence" },
  { value: "budget",      label: "Budget signals",             desc: "Premium positioning, multiple locations, or high-end clientele" },
  { value: "geography",   label: "Serves my target area",      desc: "Located in or delivers to my region" },
];

const ORG_DESC_PLACEHOLDER: Record<string, string> = {
  agency:       "e.g. We build AI-powered booking and automation systems for local businesses in Kenya",
  manufacturer: "e.g. We manufacture quality dairy products and supply to the Kenyan market",
  distributor:  "e.g. We distribute FMCG goods to retail outlets across East Africa",
  agriculture:  "e.g. We grow and supply certified fresh produce to hotels, restaurants, and supermarkets",
  finance:      "e.g. We provide working capital and invoice financing to SMEs in manufacturing and trade",
  recruiter:    "e.g. We place mid-to-senior level talent in fintech and healthcare companies",
  research:     "e.g. We produce market intelligence reports for investors and corporate strategy teams",
  other:        "Describe what you do and who you serve…",
};

const TARGET_PLACEHOLDER: Record<string, string> = {
  agency:       "e.g. Hotels and clinics with 50+ reviews, no booking system, and active WhatsApp presence",
  manufacturer: "e.g. Supermarkets, restaurants, and distributors with strong review counts and multiple locations",
  distributor:  "e.g. Mini-marts and dukas with 20+ reviews that don't already have an exclusive supplier",
  agriculture:  "e.g. Hotels, restaurants, and schools that source fresh produce regularly and pay on time",
  finance:      "e.g. Manufacturing SMEs with 3+ years in business, 30+ Google reviews, and active operations",
  recruiter:    "e.g. Fast-growing tech or healthcare companies that are actively hiring or recently expanded",
  research:     "e.g. Businesses in targeted sectors with verifiable online presence and consistent activity",
  other:        "Describe the type of business you are looking for…",
};

interface OrgProfile {
  business_name:      string | null;
  sender_name:        string | null;
  use_case:           string | null;
  org_description:    string | null;
  target_description: string | null;
  priority_signals:   string[] | null;
  outreach_channel:   string | null;
  onboarding_complete: boolean;
}

export default function OnboardingWizard({ existing }: { existing: OrgProfile | null }) {
  const isEditing = existing?.onboarding_complete === true;

  const [step, setStep]                     = useState(1);
  const [useCase, setUseCase]               = useState(existing?.use_case ?? "");
  const [businessName, setBusinessName]     = useState(existing?.business_name ?? existing?.business_name ?? "");
  const [senderName, setSenderName]         = useState(existing?.sender_name ?? "");
  const [orgDescription, setOrgDescription] = useState(existing?.org_description ?? "");
  const [targetDesc, setTargetDesc]         = useState(existing?.target_description ?? "");
  const [channel, setChannel]               = useState(existing?.outreach_channel ?? "whatsapp");
  const [signals, setSignals]               = useState<string[]>(existing?.priority_signals ?? []);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");

  function toggleSignal(val: string) {
    setSignals((prev) =>
      prev.includes(val)
        ? prev.filter((s) => s !== val)
        : prev.length < 4 ? [...prev, val] : prev
    );
  }

  async function handleSubmit() {
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
      if (!res.ok) { setError(json.error ?? "Failed to save profile."); return; }
      window.location.assign("/dashboard");
    } catch {
      setError("Something went wrong. Check your connection.");
    } finally {
      setLoading(false);
    }
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

        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-zinc-100 text-lg tracking-tight">4unter</span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "rounded-full transition-all",
                s === step   ? "h-2 w-6 bg-red-500" :
                s < step     ? "h-2 w-2 bg-red-700"  :
                               "h-2 w-2 bg-zinc-700"
              )}
            />
          ))}
        </div>

        {/* ── Step 1: Role ── */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">
              {isEditing ? "Update your profile" : "Welcome to 4unter"}
            </h1>
            <p className="text-sm text-zinc-400 mb-6">What best describes you?</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setUseCase(r.value)}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-all",
                    useCase === r.value
                      ? "border-red-500 bg-red-950/20 ring-1 ring-red-500/40"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                  )}
                >
                  <div className="text-2xl mb-2">{r.icon}</div>
                  <p className="text-sm font-semibold text-zinc-100 mb-0.5">{r.label}</p>
                  <p className="text-xs text-zinc-500 leading-snug">{r.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceed1} className="gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: About your business ── */}
        {step === 2 && (
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">Tell us about your business</h1>
            <p className="text-sm text-zinc-400 mb-6">
              This shapes how 4unter qualifies and scores leads for you.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Business / organisation name *</label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Distributors Ltd"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Your name (used in outreach messages) *</label>
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. John Kamau"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">What do you do? <span className="text-zinc-600">(optional but improves scoring)</span></label>
                <textarea
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder={descPlaceholder}
                  rows={3}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceed2} className="gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Ideal lead ── */}
        {step === 3 && (
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">Describe your ideal lead</h1>
            <p className="text-sm text-zinc-400 mb-6">
              4unter&apos;s AI scores leads against this — be specific about what matters to you.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">What type of business are you looking for? *</label>
                <textarea
                  value={targetDesc}
                  onChange={(e) => setTargetDesc(e.target.value)}
                  placeholder={targetPlaceholder}
                  rows={4}
                  autoFocus
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-2">How will you reach out to leads?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setChannel(c.value)}
                      className={cn(
                        "rounded-lg border py-2.5 text-sm font-medium transition-all",
                        channel === c.value
                          ? "border-red-500 bg-red-950/20 text-red-300"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={!canProceed3} className="gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Priority signals ── */}
        {step === 4 && (
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">What matters most?</h1>
            <p className="text-sm text-zinc-400 mb-6">
              Pick up to 4 signals. 4unter weights the AI score around these.
            </p>

            <div className="space-y-2">
              {SIGNALS.map((s) => {
                const selected = signals.includes(s.value);
                const disabled = !selected && signals.length >= 4;
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleSignal(s.value)}
                    disabled={disabled}
                    className={cn(
                      "w-full text-left rounded-xl border px-4 py-3 transition-all flex items-start gap-3",
                      selected  ? "border-red-500 bg-red-950/20"
                                : disabled ? "border-zinc-800/50 opacity-40 cursor-not-allowed"
                                : "border-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center",
                      selected ? "border-red-500 bg-red-500" : "border-zinc-600"
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
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canProceed4}
                loading={loading}
                className="gap-2"
              >
                {isEditing ? "Save changes" : "Get started"}
                {!loading && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
