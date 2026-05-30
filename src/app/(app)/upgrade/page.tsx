"use client";

import { useState } from "react";
import { Zap, Users, Building2, Shield, Check, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
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
      "Scrape + Enrich + Score + Opener",
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
      "Scrape + Enrich + Score + Opener",
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
      "Scrape + Enrich + Score + Opener",
      "Domain-based auto-join",
      "Team invite by email",
      "Dedicated onboarding",
      "Custom integrations on request",
    ],
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

export default function UpgradePage() {
  const [selected,  setSelected]  = useState<PlanId>("growth");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

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
        setError(json.error ?? "Checkout failed. Please try again.");
        return;
      }
      // Redirect to Stripe Payment Element or confirmation page
      // For now, store client_secret and redirect to /billing/pay
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

  const plan = PLANS.find((p) => p.id === selected)!;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-16">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400 mb-4">
            <Building2 className="h-3.5 w-3.5" /> Corporate Plans
          </div>
          <h1 className="text-3xl font-black text-zinc-100 mb-3">Upgrade to Corporate</h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Give your whole team access to 4unter. One shared workspace, one subscription, full visibility across every seat.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-10">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={cn(
                "relative text-left rounded-2xl border-2 p-6 transition-all",
                selected === p.id
                  ? p.highlight
                    ? "border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/30"
                    : "border-zinc-500 bg-zinc-800/40 ring-1 ring-zinc-500/30"
                  : cn("border-zinc-800 bg-zinc-900/40 hover:border-zinc-600", p.highlight && "hover:border-amber-700/60")
              )}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-bold text-black tracking-wide uppercase">
                  Most popular
                </span>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  p.highlight ? "bg-amber-500/20" : "bg-zinc-700/40"
                )}>
                  <Users className={cn("h-4 w-4", p.highlight ? "text-amber-400" : "text-zinc-400")} />
                </div>
                <span className="font-bold text-zinc-100">{p.label}</span>
              </div>

              <div className="mb-1">
                <span className="text-2xl font-black text-zinc-100">{p.priceLabel}</span>
                <span className="text-xs text-zinc-500 ml-1">{p.period}</span>
              </div>
              <p className="text-xs text-zinc-500 mb-5">{p.seats} seats included</p>

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
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                    p.highlight ? "border-amber-500 bg-amber-500" : "border-zinc-400 bg-zinc-400"
                  )}>
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
            After payment, you become the <strong className="text-zinc-400">organisation admin</strong> and can immediately invite up to <strong className="text-zinc-400">{plan.seats - 1} team members</strong>.
            Each invited member receives an email to set their password and join your shared workspace.
          </p>
        </div>

        {/* CTA */}
        {error && <p className="text-xs text-red-400 text-center mb-4">{error}</p>}
        <div className="flex justify-center">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-8 py-3.5 font-bold text-black text-sm transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
            ) : (
              <><Zap className="h-4 w-4" /> Continue to payment — {plan.priceLabel}<ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-4">
          You can add or suspend members any time from Settings. Seats are charged monthly.
        </p>
      </div>
    </div>
  );
}
