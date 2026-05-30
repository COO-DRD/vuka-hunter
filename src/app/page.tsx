import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { HunterWordmark } from "@/components/HunterLogo";
import { HunterDemo } from "@/components/HunterDemo";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default async function LandingPage() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <HunterWordmark size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="gap-1.5">Get started <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero — full-viewport, centered statement ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-14 text-center">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[700px] rounded-full bg-amber-500/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-amber-400">Kenya · 36 verticals · live pipeline data</span>
          </div>

          <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-zinc-50 sm:text-6xl lg:text-7xl">
            While you were Googling,<br />
            <span className="text-brand-gradient">they already called.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-lg text-zinc-400 leading-relaxed">
            4unter finds 200 qualified Kenyan businesses, scores every one, and writes the opener —
            before your competitor finishes their first search.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 px-8">
                Start hunting free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg">Sign in</Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-600">7-day free trial · No credit card · Nairobi, Mombasa &amp; beyond</p>
        </div>

        {/* Demo card floated below headline */}
        <div className="relative z-10 mt-16 w-full max-w-md">
          <HunterDemo />
        </div>

        {/* Scroll cue */}
        <div className="relative z-10 mt-12 flex flex-col items-center gap-1 text-zinc-700">
          <span className="text-[11px] uppercase tracking-widest">See how</span>
          <div className="h-6 w-px bg-gradient-to-b from-zinc-700 to-transparent" />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-zinc-800/60 bg-zinc-900/20">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
            {[
              { value: "200+",    label: "Leads per run"          },
              { value: "< 4 min", label: "From search to opener"  },
              { value: "36",      label: "Verticals covered"      },
              { value: "10×",     label: "Faster than manual"     },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-black text-amber-400 tracking-tight">{value}</div>
                <div className="text-xs text-zinc-600 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The feeling, not the features ── */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            {
              before: "Every morning: hours on Google, tabs everywhere, no clear list to call.",
              after:  "Now: 200 scored leads waiting before your coffee is cold.",
              color:  "border-red-900/40",
              label:  "Time",
            },
            {
              before: "Sending the same opener to every business and wondering why nobody replies.",
              after:  "Every message names their exact gap — no-shows, missing booking system, dead social.",
              color:  "border-amber-900/40",
              label:  "Relevance",
            },
            {
              before: "Your best month is still capped by how fast you can research.",
              after:  "Your ceiling is now your close rate, not your research speed.",
              color:  "border-amber-700/30",
              label:  "Scale",
            },
          ].map(({ before, after, color, label }) => (
            <div key={label} className={`rounded-2xl border ${color} bg-zinc-900/40 p-6 space-y-4`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p>
              <div className="space-y-3">
                <p className="text-sm text-zinc-500 italic leading-relaxed">&ldquo;{before}&rdquo;</p>
                <div className="h-px bg-zinc-800" />
                <p className="text-sm text-zinc-200 font-medium leading-relaxed">{after}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-zinc-800/60 bg-zinc-900/20">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="mb-10 text-center text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
            4 steps · under 4 minutes
          </p>
          <div className="grid gap-px bg-zinc-800/40 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl overflow-hidden">
            {[
              {
                step: "01",
                title: "Discover",
                body: "Pull 200 businesses from Google Places, Foursquare, and OSM. Only rated, reviewed businesses pass.",
              },
              {
                step: "02",
                title: "Enrich",
                body: "Crawl each website for emails, booking systems, live chat, and decision-maker contacts.",
              },
              {
                step: "03",
                title: "Score",
                body: "AI rates 0–100 and names the exact pain signal. Know who to call before you dial.",
              },
              {
                step: "04",
                title: "Outreach",
                body: "One-click WhatsApp or email opener — written with that lead's real gap, not a template.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="bg-zinc-900/60 p-6 space-y-2">
                <span className="text-xs font-mono text-zinc-700">{step}</span>
                <h3 className="font-bold text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proof points ── */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="max-w-xl mx-auto space-y-3">
          {[
            "200 qualified leads in minutes — not days of manual research",
            "AI scores every lead and names the exact pain signal to open with",
            "WhatsApp &amp; email opener written and ready before you finish your coffee",
            "Kenya-specific data across Nairobi, Mombasa, Kilifi, Kisumu, and 32 more counties",
          ].map((f) => (
            <div key={f} className="flex items-start gap-3 text-sm text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span dangerouslySetInnerHTML={{ __html: f }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/20">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-4">Close faster</p>
          <h2 className="text-3xl font-black text-zinc-50 sm:text-4xl lg:text-5xl">
            Your competitor is still on page&nbsp;2.<br />
            <span className="text-brand-gradient">You&apos;re already in their DMs.</span>
          </h2>
          <Link href="/sign-up" className="mt-8 inline-block">
            <Button size="lg" className="gap-2 px-10">
              Start hunting free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-4 text-xs text-zinc-600">7-day free trial · No credit card · Set up in under 2 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <HunterWordmark size="sm" />
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
            <Link href="/sign-in" className="hover:text-zinc-400 transition-colors">Sign in</Link>
            <span>© 2026 Dullu Digital</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
