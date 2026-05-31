"use client";

import { useState, useEffect } from "react";
import { Zap, Shield, Check, ArrowRight, Loader2, AlertTriangle, CheckCircle2, Phone, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

const PLAN = {
  id:         "pro",
  label:      "4unter Pro",
  price:      2000,
  priceLabel: "KES 2,000",
  period:     "/ month",
  features: [
    "Unlimited lead discovery",
    "AI scoring on every lead",
    "WhatsApp & email opener generation",
    "All 36 Kenyan B2B verticals",
    "Website enrichment — email, phone, tech stack, social",
    "Pipeline management (New → Won)",
    "CSV export",
    "7-day free trial — no card needed",
  ],
};

export default function UpgradePage() {
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState("");
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

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

  async function handleRequest() {
    setReqLoading(true);
    setReqError("");
    try {
      const res  = await fetch("/api/billing/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: PLAN.id, phone: reqPhone, note: reqNote }),
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
        body:    JSON.stringify({ plan: PLAN.id, idempotency_key: idempotencyKey }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status >= 500) {
          setError("Payment is being set up — use the request form below to upgrade manually.");
        } else {
          setError(json.error ?? "Checkout failed. Please try again.");
        }
        return;
      }
      const params = new URLSearchParams({
        client_secret:     json.client_secret,
        payment_intent_id: json.payment_intent_id ?? "",
        plan:              PLAN.id,
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
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-zinc-100 mb-3">Upgrade to Pro</h1>
          <p className="text-zinc-400 text-sm">
            Full access. One plan. No limits.
          </p>
        </div>

        {/* Single plan card */}
        <div className="rounded-2xl border-2 border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/30 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-lg font-black text-zinc-100">{PLAN.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Cancel any time</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-amber-400">{PLAN.priceLabel}</p>
              <p className="text-xs text-zinc-500">{PLAN.period}</p>
            </div>
          </div>

          <ul className="space-y-3">
            {PLAN.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                <Check className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Security note */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 mb-6 flex items-start gap-3">
          <Shield className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            Payments processed securely. 4unter never stores your card details.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-3 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* CTA */}
        {stripeConfigured === false ? (
          reqDone ? (
            <div className="rounded-xl border border-green-700/40 bg-green-950/20 px-6 py-6 text-center space-y-3">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto" />
              <p className="text-sm font-semibold text-zinc-100">
                {reqDone.duplicate ? "You already have a pending request" : "Request received"}
              </p>
              <p className="text-xs text-zinc-400">
                Reference <span className="font-mono text-amber-400 font-semibold">{reqDone.ref}</span>. We will activate your Pro account within 1 hour — check your WhatsApp and email.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-0.5">Request activation</p>
                <p className="text-xs text-zinc-500">
                  Card payment is coming soon. Submit a request and we will activate your account within 1 hour and send you a payment link.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    <Phone className="inline h-3 w-3 mr-1" />
                    WhatsApp / phone number
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
                    placeholder="e.g. paying by M-Pesa, need invoice..."
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
                {reqLoading ? "Submitting..." : "Request Pro activation"}
              </button>
              <p className="text-[11px] text-zinc-600 text-center">
                We will send a payment link to your email and confirm via WhatsApp.
              </p>
            </div>
          )
        ) : (
          <button
            onClick={handleCheckout}
            disabled={loading || stripeConfigured === null}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-8 py-4 font-bold text-black text-sm transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
            ) : (
              <><Zap className="h-4 w-4" /> Start Pro — KES 2,000/month <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        )}

        <p className="text-center text-xs text-zinc-600 mt-4">
          7-day free trial included · billed monthly · cancel any time
        </p>
      </div>
    </div>
  );
}
