import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { HunterWordmark } from "@/components/HunterLogo";
import { HunterDemo } from "@/components/HunterDemo";
import { Button } from "@/components/ui/button";
import { Search, Globe, Zap, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";

export default async function LandingPage() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <HunterWordmark size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center">
          {/* Left: copy */}
          <div className="flex-1 space-y-6 lg:max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">AI-powered · Kenya</span>
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-zinc-50 sm:text-5xl lg:text-6xl">
              Find your next<br />
              <span className="text-brand-gradient">
                100 clients
              </span>
              .<br />
              Automatically.
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed">
              Hunter scrapes Google Maps for quality Kenyan businesses, enriches each lead
              with emails and pain signals, scores fit with AI, and writes outreach
              copy — all in under a minute.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Start hunting free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg">Sign in</Button>
              </Link>
            </div>
            <ul className="space-y-1.5 pt-2">
              {[
                "Protocol-filtered leads — no spam, no irrelevant businesses",
                "Gemini AI scoring with specific pain signals per business",
                "One-click WhatsApp & email openers that convert",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-500">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: animated demo */}
          <div className="flex-1 lg:max-w-sm xl:max-w-md">
            <HunterDemo />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-zinc-600">
            The pipeline
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Search,
                step: "01",
                title: "Discover",
                body: "Scan Google Maps by vertical and city. Hunter applies a strict quality protocol — only rated, reviewed businesses make it through.",
                color: "text-green-400",
              },
              {
                icon: Globe,
                step: "02",
                title: "Enrich",
                body: "Crawl each website for emails, booking systems, live chat, and WhatsApp CTAs. Missing features become your sales angle.",
                color: "text-blue-400",
              },
              {
                icon: Zap,
                step: "03",
                title: "Score",
                body: "Gemini AI rates every lead 0–100 and surfaces specific pain signals. Know exactly why a business is worth your time.",
                color: "text-purple-400",
              },
              {
                icon: MessageSquare,
                step: "04",
                title: "Outreach",
                body: "Generate a personalised WhatsApp or email opener in one click — written with the lead's real pain, not a template.",
                color: "text-emerald-400",
              },
            ].map(({ icon: Icon, step, title, body, color }) => (
              <div key={step} className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-600">{step}</span>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="text-3xl font-black text-zinc-50 sm:text-4xl">
          Ready to start hunting?
        </h2>
        <p className="mt-3 text-zinc-500">
          Free during beta · No credit card · Nairobi & beyond
        </p>
        <Link href="/sign-up" className="mt-8 inline-block">
          <Button size="lg" className="gap-2 px-8">
            Create your account <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
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
