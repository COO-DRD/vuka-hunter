"use client";

import { useState, useEffect } from "react";
import { Zap, User, Users, Shield, Check, ArrowRight, Loader2, AlertTriangle, CheckCircle2, Phone, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PlanTier = "individual" | "corporate";

const INDIVIDUAL_PLANS = [
  {
    id:         "solo",
    label:      "Solo",
    seats:      1,
    price:      2500,
    priceLabel: "KES 2,500",
    period:     "/ month",
    color:      "border-zinc-700",
    highlight:  false,
    features: [
      "1 seat",
      "Unlimited lead discovery",
      "Enrich · Score · AI openers",
      "All data sources",
      "7-day free trial",
    ],
  },
] as const;

const CORPORATE_PLANS = [
  {
    id:         "starter",
    label:      "Starter",
    seats:      5,
    price:      5000,
    priceLabel: "KES 5,000",
    period:     "/ month",
    color:      "border-zinc-700",
    highlight:  false,
    features: [
      "5 team seats",
      "Shared lead workspace",
      "Enrich · Score · AI openers",
      "Team invite by email",
      "14-day free trial",
    ],
  },
  {
    id:         "growth",
    label:      "Growth",
    seats:      15,
    price:      12000,
    priceLabel: "KES 12,000",
    period:     "/ month",
    color:      "border-amber-500",
    highlight:  true,
    features: [
      "15 team seats",
      "Shared lead workspace",
      "Enrich · Score · AI openers",
      "Domain-based auto-join",
      "Team invite by email",
      "Priority support",
    ],
  },
  {
    id:         "enterprise",
    label:      "Enterprise",
    seats:      30,
    price:      25000,
    priceLabel: "KES 25,000",
    period:     "/ month",
    color:      "border-zinc-700",
    highlight:  false,
    features: [
      "30 team seats",
      "Shared lead workspace",
      "Enrich · Score · AI openers",
      "Domain-based auto-join",
      "Team invite by email",
      "Dedicated onboarding",
      "Custom integrations on request",
    ],
  },
] as const;

type PlanId =
  | (typeof INDIVIDUAL_PLANS)[number]["id"]
  | (typeof CORPORATE_PLANS)[number]["id"];

export default function UpgradePage() {
  const [tier,              setTier]              = useState<PlanTier>("individual");
  const [selected,          setSelected]          = useState<PlanId>("solo");
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState("");
  const [stripeConfigured,  setStripeConfigured]  = useState<boolean | null>(null);

  // Invoice request state (used when Stripe is not configured)
  const [reqPhone,   setReqPhone]   = useState("");
  const [reqNote,    setReqNote]    = useState("");
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError,   setReqError]   = useState("");
  const [reqDone,    setReqDone]    = useState<{ ref: string; duplicate: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/billing/configured")
      .then((r) => r.json())
      .then((d) => setStripeConfigured(d.configured ?? false))
      .catch(() => setStripeConfigured(false));
  }, []);

  // Keep selection valid when switching tiers
  function switchTier(t: PlanTier) {
    setTier(t);
    setSelected(t === "individual" ? "solo" : "growth");
    setError("");
  }

  const plans = tier === "individual" ? INDIVIDUAL_PLANS : CORPORATE_PLANS;
  const plan  = [...INDIVIDUAL_PLANS, ...CORPORATE_PLANS].find((p) => p.id === selected)!;

  async function handleRequest() {
    setReqLoading(true);
    setReqError("");
    try {
      const res  = await fetch("/api/billing/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: selected, phone: reqPhone, note: reqNote }),
      });
      const json = await res.json();
      if (!res.ok) { setReqError(json.error ?? "Could not submit. Try again."); return; }
      setReqDone({ ref: json.ref_number, duplicate: json.duplicate ?? false });
    } catch {
      setReqError("Connection error. Check your internet and try again.");
    } finally {
      setReqLoading(false);
    }
  }

  async function handleCheckout() {
    setLoading(true);
    setError("");
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch("/api/billing/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: selected, idempotency_key: idempotencyKey }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status >= 500) {
          setError("Our payment processor is being set up — see the contact options below to upgrade manually.");
        } else {
          setError(json.error ?? "Checkout failed. Please try again.");
        }
        return;
      }
      const params = new URLSearchParams({
        client_secret:     json.client_secret,
        payment_intent_id: json.payment_intent_id ?? "",
        plan:              selected,
      });
      window.location.assign(`/billing/pay?${params.toString()}`);
    } catch {
      setError("Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-16">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-zinc-100 mb-3">Choose a plan</h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Full access after your trial ends. Cancel any time.
          </p>
        </div>

        {/* Tier switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 gap-1">
            <button
              onClick={() => switchTier("individual")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all",
                tier === "individual"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <User className="h-3.5 w-3.5" /> Individual
            </button>
            <button
              onClick={() => switchTier("corporate")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all",
                tier === "corporate"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Users className="h-3.5 w-3.5" /> Team / Corporate
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className={cn(
          "grid gap-4 mb-10",
          tier === "individual" ? "grid-cols-1 max-w-sm mx-auto" : "sm:grid-cols-3"
        )}>
          {(plans as typeof INDIVIDUAL_PLANS | typeof CORPORATE_PLANS).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id as PlanId)}
              className={cn(
                "relative text-left rounded-2xl border-2 p-6 transition-all",
                selected === p.id
                  ? "highlight" in p && p.highlight
                    ? "border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/30"
                    : "border-amber-600/60 bg-amber-600/8 ring-1 ring-amber-600/30"
                  : cn(
                    "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600",
                    "highlight" in p && p.highlight && "hover:border-amber-700/60"
                  )
              )}
            >
              {"highlight" in p && p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-bold text-black tracking-wide uppercase">
                  Most popular
                </span>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "highlight" in p && p.highlight ? "bg-amber-500/20" : "bg-zinc-700/40"
                )}>
                  {p.seats === 1
                    ? <User className={cn("h-4 w-4", "highlight" in p && p.highlight ? "text-amber-400" : "text-zinc-400")} />
                    : <Users className={cn("h-4 w-4", "highlight" in p && p.highlight ? "text-amber-400" : "text-zinc-400")} />
                  }
                </div>
                <span className="font-bold text-zinc-100">{p.label}</span>
              </div>

              <div className="mb-1">
                <span className="text-2xl font-black text-zinc-100">{p.priceLabel}</span>
                <span className="text-xs text-zinc-500 ml-1">{p.period}</span>
              </div>
              <p className="text-xs text-zinc-500 mb-5">
                {p.seats === 1 ? "1 seat — you only" : `${p.seats} seats included`}
              </p>

              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                    <Check className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {selected === p.id && (
                <div className="absolute top-4 right-4">
                  <div className="h-5 w-5 rounded-full border-2 border-amber-500 bg-amber-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-black" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Security note */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 mb-8 flex items-start gap-3">
          <Shield className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            Payments are processed by Stripe. 4unter never stores your card details.
            {tier === "corporate" && (
              <> After payment you become the <strong className="text-zinc-400">organisation admin</strong> and can invite up to <strong className="text-zinc-400">{plan.seats - 1} team members</strong>.</>
            )}
          </p>
        </div>

        {/* CTA */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-3 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {stripeConfigured === false ? (
          reqDone ? (
            <div className="rounded-xl border border-green-700/40 bg-green-950/20 px-6 py-6 text-center space-y-3">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto" />
              <p className="text-sm font-semibold text-zinc-100">
                {reqDone.duplicate ? "You already have a pending request" : "Request received"}
              </p>
              <p className="text-xs text-zinc-400">
                Reference <span className="font-mono text-amber-400 font-semibold">{reqDone.ref}</span>. We will review and activate your <strong className="text-zinc-200">{plan.label}</strong> account within 1 hour — keep an eye on your WhatsApp and email.
              </p>
              <p className="text-[11px] text-zinc-600">
                Plan: {plan.label} · {plan.priceLabel}/month · {plan.seats === 1 ? "1 seat" : `${plan.seats} seats`}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-0.5">Request invoice</p>
                <p className="text-xs text-zinc-500">
                  Card payment is coming soon. Send a request and we will activate your account manually within 1 hour and send you a payment link.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-100">{plan.label}</p>
                  <p className="text-xs text-zinc-500">{plan.priceLabel}/month · {plan.seats === 1 ? "1 seat" : `${plan.seats} seats`}</p>
                </div>
                <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                  Selected
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    <Phone className="inline h-3 w-3 mr-1" />
                    WhatsApp / phone number <span className="text-zinc-600">(so we can reach you fast)</span>
                  </label>
                  <Input
                    type="tel"
                    value={reqPhone}
                    onChange={(e) => setReqPhone(e.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    <FileText className="inline h-3 w-3 mr-1" />
                    Anything to add? <span className="text-zinc-600">(optional)</span>
                  </label>
                  <textarea
                    value={reqNote}
                    onChange={(e) => setReqNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. paying by M-Pesa, need invoice for company records, team of 5 in insurance..."
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-600/50 resize-none"
                  />
                </div>
              </div>

              {reqError && <p className="text-xs text-red-400">{reqError}</p>}

              <button
                onClick={handleRequest}
                disabled={reqLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-6 py-3 font-bold text-black text-sm transition-colors"
              >
                {reqLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {reqLoading ? "Submitting..." : `Request ${plan.label} activation`}
              </button>
              <p className="text-[11px] text-zinc-600 text-center">
                We will send a payment link to your email and confirm via WhatsApp.
              </p>
            </div>
          )
        ) : (
          <div className="flex justify-center">
            <button
              onClick={handleCheckout}
              disabled={loading || stripeConfigured === null}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-8 py-3.5 font-bold text-black text-sm transition-colors"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : (
                <><Zap className="h-4 w-4" /> Continue to payment — {plan.priceLabel}<ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-zinc-600 mt-4">
          {tier === "corporate"
            ? "Seats are charged monthly. Add or suspend members any time from Settings."
            : "Individual plan · 1 seat · billed monthly · cancel any time."}
        </p>
      </div>
    </div>
  );
}
