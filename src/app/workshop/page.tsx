"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { HunterWordmark } from "@/components/HunterLogo";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, MapPin, Users, CheckCircle2, Zap, Target, MessageSquare, ArrowRight } from "lucide-react";

const WORKSHOP = {
  title: "AI Sales Automation for Kenyan SMBs",
  subtitle: "A hands-on workshop for founders, sales leads, and consultants who want to fill their pipeline with warm leads — automatically.",
  date: "Every Thursday",
  time: "6:00 PM – 7:30 PM EAT",
  format: "Online · Zoom",
  spots: "25 seats per session",
};

const AGENDA = [
  { time: "6:00", item: "Why most Kenyan sales teams waste 80% of their prospecting time" },
  { time: "6:15", item: "Live demo: scrape, enrich & score 50 leads in under 3 minutes" },
  { time: "6:40", item: "Writing outreach that converts — pain-led vs generic templates" },
  { time: "7:10", item: "Q&A + how to get 4unter working for your vertical" },
];

const OUTCOMES = [
  "Leave with a live 4unter account and your first 20 leads scored",
  "A WhatsApp outreach template tuned to your vertical",
  "Understanding of which pain signals close deals in Kenya",
  "Direct access to the Dullu Digital team for custom deployments",
];

export default function WorkshopPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", role: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrMsg("");
    const nameTrimmed = form.name.trim();
    if (!nameTrimmed)                                                          { setErrMsg("Enter your name."); return; }
    if (nameTrimmed.length < 2)                                               { setErrMsg("Name must be at least 2 characters."); return; }
    if (!form.email.trim())                                                    { setErrMsg("Enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))            { setErrMsg("Enter a valid email address."); return; }
    setStatus("loading");
    try {
      const res = await fetch("/api/workshop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error ?? "Something went wrong"); setStatus("error"); return; }
      setStatus("done");
    } catch {
      setErrMsg("Network error — please try again.");
      setStatus("error");
    }
  }

  const inputCls = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500";

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-stone-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#F8F7F4]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <HunterWordmark size="sm" onLight />
          <Link href="/sign-up"
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors px-4 py-2 text-sm font-bold text-black">
            Try 4unter free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left: workshop info */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-50 px-3 py-1">
              <CalendarDays className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Free Workshop</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 sm:text-4xl">
                {WORKSHOP.title}
              </h1>
              <p className="text-stone-600 leading-relaxed">{WORKSHOP.subtitle}</p>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: CalendarDays, label: WORKSHOP.date },
                { icon: Clock,        label: WORKSHOP.time },
                { icon: MapPin,       label: WORKSHOP.format },
                { icon: Users,        label: WORKSHOP.spots },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2.5">
                  <Icon className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span className="text-xs text-stone-700">{label}</span>
                </div>
              ))}
            </div>

            {/* Agenda */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Agenda</p>
              <div className="space-y-2">
                {AGENDA.map(({ time, item }) => (
                  <div key={time} className="flex items-start gap-3">
                    <span className="text-xs font-mono text-stone-400 shrink-0 pt-0.5 w-8">{time}</span>
                    <span className="text-sm text-stone-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What you'll leave with */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">What you&apos;ll leave with</p>
              <ul className="space-y-2">
                {OUTCOMES.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-sm text-stone-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>

            {/* Who runs it */}
            <div className="rounded-xl border border-stone-200 bg-white p-4 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">Dullu Digital</p>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  We built 4unter to solve our own prospecting problem. Now we use it daily to generate pipeline for AI automation projects across Nairobi.
                </p>
              </div>
            </div>
          </div>

          {/* Right: registration form */}
          <div className="lg:sticky lg:top-24 h-fit">
            {status === "done" ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">You&apos;re registered!</h2>
                <p className="text-sm text-stone-600">
                  Check your email for the Zoom link. We&apos;ll send a reminder 24 hours before the session.
                </p>
                <div className="pt-2">
                  <Link href="/sign-up"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 transition-colors px-6 py-3 font-bold text-black text-sm">
                    <Zap className="h-4 w-4" />
                    Start using 4unter free
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-200/60 space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-stone-900">Reserve your seat</h2>
                  <p className="text-xs text-stone-500">Free · 25 seats per session</p>
                </div>

                <form onSubmit={submit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-600 font-medium">Full name *</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Jane Kamau"
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-600 font-medium">WhatsApp / phone</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+254 7xx xxx xxx"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-600 font-medium">Email *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@company.co.ke"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-600 font-medium">Company</label>
                      <input
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        placeholder="Acme Ltd"
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-600 font-medium">Your role</label>
                      <input
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        placeholder="Founder / Sales"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {status === "error" && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {errMsg}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full gap-2 mt-1"
                    size="lg"
                    loading={status === "loading"}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Reserve my seat
                  </Button>
                </form>

                <p className="text-xs text-stone-400 text-center">
                  We&apos;ll send the Zoom link to your email. No spam.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
