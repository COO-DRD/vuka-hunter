"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconChevronRight as ChevronRight, IconChevronLeft as ChevronLeft, IconCheck as Check } from "@tabler/icons-react";
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
  agency:       "e.g. We build AI-powered booking and automation systems for local businesses in Kenya",
  manufacturer: "e.g. We manufacture quality dairy products and supply to the Kenyan market",
  distributor:  "e.g. We distribute FMCG goods to retail outlets across East Africa",
  agriculture:  "e.g. We grow and supply certified fresh produce to hotels, restaurants, and supermarkets",
  finance:      "e.g. We provide working capital and invoice financing to SMEs in manufacturing and trade",
  recruiter:    "e.g. We place mid-to-senior level talent in fintech and healthcare companies",
  research:     "e.g. We produce market intelligence reports for investors and corporate strategy teams",
  other:        "Describe what you do and who you serve",
};

const TARGET_PLACEHOLDER: Record<string, string> = {
  agency:       "e.g. Hotels and clinics with 50+ reviews, no booking system, and active WhatsApp presence",
  manufacturer: "e.g. Supermarkets, restaurants, and distributors with strong review counts and multiple locations",
  distributor:  "e.g. Mini-marts and dukas with 20+ reviews that don't already have an exclusive supplier",
  agriculture:  "e.g. Hotels, restaurants, and schools that source fresh produce regularly and pay on time",
  finance:      "e.g. Manufacturing SMEs with 3+ years in business, 30+ Google reviews, and active operations",
  recruiter:    "e.g. Fast-growing tech or healthcare companies that are actively hiring or recently expanded",
  research:     "e.g. Businesses in targeted sectors with verifiable online presence and consistent activity",
  other:        "Describe the type of business you are looking for",
};

interface OrgProfile {
  business_name:       string | null;
  sender_name:         string | null;
  use_case:            string | null;
  org_description:     string | null;
  target_description:  string | null;
  priority_signals:    string[] | null;
  outreach_channel:    string | null;
  onboarding_complete: boolean;
}

const TOTAL_STEPS = 5;

export default function OnboardingWizard({ existing }: { existing: OrgProfile | null }) {
  const isEditing = existing?.onboarding_complete === true;

  const [step, setStep]                     = useState(1);
  const [useCase, setUseCase]               = useState(existing?.use_case ?? "");
  const [businessName, setBusinessName]     = useState(existing?.business_name ?? "");
  const [senderName, setSenderName]         = useState(existing?.sender_name ?? "");
  const [orgDescription, setOrgDescription] = useState(existing?.org_description ?? "");
  const [targetDesc, setTargetDesc]         = useState(existing?.target_description ?? "");
  const [channel, setChannel]               = useState(existing?.outreach_channel ?? "whatsapp");
  const [signals, setSignals]               = useState<string[]>(existing?.priority_signals ?? []);
  const [waNumber, setWaNumber]             = useState("");
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");

  function toggleSignal(val: string) {
    setSignals((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val)
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
        body: JSON.stringify({
          businessName,
          senderName,
          useCase,
          orgDescription,
          targetDescription: targetDesc,
          prioritySignals:   signals,
          outreachChannel:   channel,
          whatsappNumber:    waNumber.trim() || null,
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

  const descPlaceholder   = ORG_DESC_PLACEHOLDER[useCase] ?? ORG_DESC_PLACEHOLDER.other;
  const targetPlaceholder = TARGET_PLACEHOLDER[useCase]   ?? TARGET_PLACEHOLDER.other;

  const inputCls = "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 resize-none transition-colors";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-stone-50">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex justify-center mb-12">
          <HunterWordmark size="sm" onLight />
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
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">
              {isEditing ? "Update your profile" : "What best describes you?"}
            </h1>
            <p className="text-sm text-stone-500 mb-8">
              This determines how 4unter scores and qualifies your leads.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setUseCase(r.value)}
                  className={cn(
                    "text-left rounded-md border p-4 transition-all duration-150",
                    useCase === r.value
                      ? "border-stone-900 bg-white shadow-sm"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  )}
                >
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

        {/* ── Step 2: About your business ── */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">About your business</h1>
            <p className="text-sm text-stone-500 mb-8">
              This shapes how 4unter qualifies and scores leads for you.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Business or organisation name
                </label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Distributors Ltd"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Your name
                </label>
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. John Kamau"
                />
                <p className="text-xs text-stone-400 mt-1.5">Used in outreach messages as the sender name</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  What you do <span className="normal-case text-stone-400 font-normal">(optional — improves scoring)</span>
                </label>
                <textarea
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder={descPlaceholder}
                  rows={3}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-between">
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
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">Your ideal lead</h1>
            <p className="text-sm text-stone-500 mb-8">
              4unter&apos;s AI scores every lead against this. Be specific — it directly affects quality.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Describe the business you are looking for
                </label>
                <textarea
                  value={targetDesc}
                  onChange={(e) => setTargetDesc(e.target.value)}
                  placeholder={targetPlaceholder}
                  rows={4}
                  autoFocus
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
                  Primary outreach channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setChannel(c.value)}
                      className={cn(
                        "rounded-md border py-2.5 text-sm font-medium transition-all duration-150",
                        channel === c.value
                          ? "border-stone-900 bg-white text-stone-900 shadow-sm"
                          : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
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
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">What matters most?</h1>
            <p className="text-sm text-stone-500 mb-8">
              Select up to 4 signals. 4unter weights the AI score around your priorities.
            </p>

            <div className="space-y-1.5">
              {SIGNALS.map((s) => {
                const selected = signals.includes(s.value);
                const disabled = !selected && signals.length >= 4;
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleSignal(s.value)}
                    disabled={disabled}
                    className={cn(
                      "w-full text-left rounded-md border px-4 py-3 transition-all duration-150 flex items-center gap-3",
                      selected  ? "border-stone-900 bg-white shadow-sm"
                      : disabled ? "border-stone-100 opacity-35 cursor-not-allowed"
                      : "border-stone-200 bg-white hover:border-stone-300"
                    )}
                  >
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
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {isEditing ? (
                <Button onClick={handleSubmit} disabled={!canProceed4} loading={loading} className="gap-2">
                  Save changes {!loading && <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : (
                <Button onClick={() => setStep(5)} disabled={!canProceed4} className="gap-2">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 5: WhatsApp (optional) ── */}
        {step === 5 && (
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight">Stay informed</h1>
            <p className="text-sm text-stone-500 mb-8">
              Add your WhatsApp number to receive setup guidance and lead alerts during your first week.
              You can skip this and add it later in Settings.
            </p>

            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                WhatsApp number
              </label>
              <Input
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                type="tel"
                autoFocus
              />
              <p className="text-xs text-stone-400 mt-1.5">Include your country code, e.g. +254 for Kenya</p>
            </div>

            {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="text-sm text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
              >
                Skip for now
              </button>
              <Button
                onClick={handleSubmit}
                disabled={!waNumber.trim()}
                loading={loading}
                className="gap-2"
              >
                Save and continue {!loading && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
