"use client";

import { useState, useEffect } from "react";
import { Zap, Shield, Check, ArrowRight, Loader2, AlertTriangle, CheckCircle2, Phone, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

const PLAN = {
  id:         "pro",
  label:      "4unter Pro",
  price:      1999,
  priceLabel: "KES 1,999",
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
      // Paystack: redirect to hosted payment page
      window.location.assign(json.authorization_url);
    } catch {
      setError("Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-16" style={{ background: "var(--background)" }}>
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-stone-900 mb-3">Upgrade to Pro</h1>
          <p className="text-stone-500 text-sm">
            Full access. One plan. No limits.
          </p>
        </div>

        {/* Single plan card */}
        <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 ring-1 ring-amber-500/30 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-lg font-black text-stone-900">{PLAN.label}</p>
              <p className="text-xs text-stone-500 mt-0.5">Cancel any time</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-amber-500">{PLAN.priceLabel}</p>
              <p className="text-xs text-stone-500">{PLAN.period}</p>
            </div>
          </div>

          <ul className="space-y-3">
            {PLAN.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-stone-700">
                <Check className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Security note */}
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 mb-6 flex items-start gap-3">
          <Shield className="h-4 w-4 text-stone-400 mt-0.5 shrink-0" />
          <p className="text-xs text-stone-500 leading-relaxed">
            Payments processed securely. 4unter never stores your card details.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* CTA */}
        {stripeConfigured === false ? (
          reqDone ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-6 text-center space-y-3">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
              <p className="text-sm font-semibold text-stone-900">
                {reqDone.duplicate ? "You already have a pending request" : "Request received"}
              </p>
              <p className="text-xs text-stone-500">
                Reference <span className="font-mono text-amber-500 font-semibold">{reqDone.ref}</span>. We will activate your Pro account within 1 hour — check your WhatsApp and email.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-white px-6 py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-stone-900 mb-0.5">Request activation</p>
                <p className="text-xs text-stone-500">
                  Card payment is coming soon. Submit a request and we will activate your account within 1 hour and send you a payment link.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1.5">
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
                  <label className="block text-xs text-stone-500 mb-1.5">
                    <FileText className="inline h-3 w-3 mr-1" />
                    Anything to add? <span className="text-stone-400">(optional)</span>
                  </label>
                  <textarea
                    value={reqNote}
                    onChange={(e) => setReqNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. paying by M-Pesa, need invoice..."
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
                    style={{ background: "var(--bg-surface)", color: "var(--text-1)", borderColor: "var(--border)" }}
                  />
                </div>
              </div>

              {reqError && <p className="text-xs text-red-500">{reqError}</p>}

              <button
                onClick={handleRequest}
                disabled={reqLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 px-6 py-3 font-bold text-black text-sm transition-colors"
              >
                {reqLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {reqLoading ? "Submitting..." : "Request Pro activation"}
              </button>
              <p className="text-[11px] text-stone-400 text-center">
                We will send a payment link to your email and confirm via WhatsApp.
              </p>
            </div>
          )
        ) : (
          <button
            onClick={handleCheckout}
            disabled={loading || stripeConfigured === null}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 px-8 py-4 font-bold text-black text-sm transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
            ) : (
              <><Zap className="h-4 w-4" /> Start Pro — KES 1,999/month <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        )}

        <p className="text-center text-xs text-stone-400 mt-4">
          7-day free trial included · billed monthly · cancel any time
        </p>
      </div>
    </div>
  );
}
