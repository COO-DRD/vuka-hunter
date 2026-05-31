"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Search, CheckCircle2, XCircle, Star, Zap, Mail,
  MessageSquare, Building2, MapPin, TrendingUp, Users, Target,
  ChevronRight, Play, BarChart3, Globe, Phone,
} from "lucide-react";
import { HunterWordmark } from "@/components/HunterLogo";

// ── Mock lead data ────────────────────────────────────────────────────────────
const MOCK_LEADS = [
  { id: 1, name: "Pearl Dental Clinic",     vertical: "Dental",      city: "Westlands",  rating: 4.8, reviews: 156, score: 87, stage: "new"       },
  { id: 2, name: "Kilimani Physio Centre",  vertical: "Physio",      city: "Kilimani",   rating: 4.3, reviews: 88,  score: 72, stage: "contacted"  },
  { id: 3, name: "Akili Real Estate",       vertical: "Real Estate", city: "Karen",      rating: 4.6, reviews: 42,  score: 65, stage: "replied"    },
  { id: 4, name: "The Grand Hotel Nairobi", vertical: "Hotel",       city: "Upperhill",  rating: 4.7, reviews: 310, score: 91, stage: "qualified"  },
  { id: 5, name: "Nairobi Eye Specialists", vertical: "Ophthalmology","city": "CBD",     rating: 4.5, reviews: 203, score: 78, stage: "new"        },
  { id: 6, name: "Urban Brew Coffee",       vertical: "Café",        city: "Lavington",  rating: 4.4, reviews: 97,  score: 54, stage: "new"        },
];

const STAGE_COLORS: Record<string, string> = {
  new:       "bg-zinc-700/60 text-zinc-300",
  contacted: "bg-blue-500/15 text-blue-300",
  replied:   "bg-amber-500/15 text-amber-300",
  qualified: "bg-purple-500/15 text-purple-300",
  won:       "bg-green-500/15 text-green-400",
};

// ── Browser chrome wrapper ────────────────────────────────────────────────────
function BrowserFrame({ children, url = "4unter.dullugroup.co.ke/leads", className = "" }: {
  children: React.ReactNode;
  url?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 ${className}`}
      style={{ background: "#161b22" }}>
      {/* Chrome bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/8" style={{ background: "#0d1117" }}>
        <div className="flex gap-1.5 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 flex items-center gap-1.5 bg-white/5 rounded-md px-3 py-1 max-w-xs mx-auto">
          <Globe className="h-3 w-3 text-zinc-500 shrink-0" />
          <span className="text-[11px] text-zinc-500 font-mono truncate">{url}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Leads table screenshot mockup ─────────────────────────────────────────────
function LeadsScreenshot() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <BrowserFrame url="4unter.dullugroup.co.ke/leads">
      <div className="flex" style={{ minHeight: 340 }}>
        {/* Mini sidebar */}
        <div className="w-40 shrink-0 border-r border-white/6 py-3 space-y-0.5 px-2" style={{ background: "#161b22" }}>
          {["Dashboard","Discover","Leads","Pipeline","Settings"].map((item, i) => (
            <div key={item}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-medium transition-colors
                ${item === "Leads" ? "border-l-2 border-amber-500 bg-amber-500/8 text-amber-300 -ml-px pl-[7px]"
                  : "text-zinc-500 hover:text-zinc-300"}`}>
              {item}
            </div>
          ))}
        </div>
        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-100">Leads</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-mono">
                {MOCK_LEADS.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/5 rounded px-2 py-1">
                <Search className="h-3 w-3 text-zinc-500" />
                <span className="text-[11px] text-zinc-600">dental...</span>
              </div>
              <div className="bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded">+ Discover</div>
            </div>
          </div>
          {/* Table */}
          <div className="text-[11px]">
            <div className="flex items-center px-4 py-1.5 border-b border-white/5 text-zinc-600 font-medium gap-3">
              <span className="w-4" />
              <span className="flex-1">Company</span>
              <span className="w-16 text-right">Score</span>
              <span className="w-20 text-right">Stage</span>
            </div>
            {MOCK_LEADS.map((lead) => (
              <motion.div
                key={lead.id}
                onHoverStart={() => setActive(lead.id)}
                onHoverEnd={() => setActive(null)}
                className={`flex items-center px-4 py-2 gap-3 border-b border-white/4 cursor-pointer transition-colors
                  ${active === lead.id ? "bg-white/4" : ""}`}
              >
                <span className="w-4 h-4 rounded border border-zinc-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 font-medium truncate">{lead.name}</p>
                  <p className="text-zinc-600 text-[10px] flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />{lead.city}
                    <span className="ml-1 flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />{lead.rating}
                    </span>
                  </p>
                </div>
                <span className={`w-16 text-right font-bold font-mono
                  ${lead.score >= 70 ? "text-green-400" : lead.score >= 50 ? "text-yellow-400" : "text-zinc-500"}`}>
                  {lead.score}
                </span>
                <span className={`w-20 text-right text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[lead.stage]}`}>
                  {lead.stage}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

// ── Score card screenshot mockup ──────────────────────────────────────────────
function ScoreScreenshot() {
  const [score, setScore] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let n = 0;
    const iv = setInterval(() => {
      n = Math.min(n + 2, 87);
      setScore(n);
      if (n >= 87) clearInterval(iv);
    }, 20);
    return () => clearInterval(iv);
  }, [visible]);

  return (
    <BrowserFrame url="4unter.dullugroup.co.ke/leads/pearl-dental">
      <div ref={ref} className="p-5 space-y-4" style={{ minHeight: 300 }}>
        {/* Lead header */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
            PD
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Pearl Dental Clinic</h3>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Westlands, Nairobi
              <span className="flex items-center gap-0.5 ml-1">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />4.8 · 156 reviews
              </span>
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-3xl font-black tabular-nums transition-colors ${score >= 70 ? "text-green-400" : "text-yellow-400"}`}>
              {score}
            </p>
            <p className="text-[10px] text-zinc-600">/ 100</p>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-amber-400"
            animate={{ width: `${score}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>

        {/* Signals */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "No booking system",   ok: false, tag: "Pain" },
            { label: "WhatsApp gap",        ok: false, tag: "Pain" },
            { label: "2 emails extracted",  ok: true,  tag: null   },
            { label: "4.8★ social proof",   ok: true,  tag: null   },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 rounded-lg bg-white/4 px-2.5 py-2">
              {s.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
              <span className="text-[11px] text-zinc-300 flex-1 truncate">{s.label}</span>
              {s.tag && (
                <span className="text-[9px] bg-orange-500/15 text-orange-400 px-1 py-0.5 rounded font-semibold">{s.tag}</span>
              )}
            </div>
          ))}
        </div>

        {/* AI insight */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            <span className="font-semibold text-amber-400">AI Signal:</span> No booking system + 4.8★ + 156 reviews =
            missed bookings after 5 PM daily. High close probability.
          </p>
        </div>
      </div>
    </BrowserFrame>
  );
}

// ── Outreach screenshot mockup ────────────────────────────────────────────────
function OutreachScreenshot() {
  const MSG = "Hi Dr. Kamau, your 4.8★ puts Pearl Dental in the top 5% in Westlands — patients clearly trust you. But calls after 5 PM go to voicemail, which is roughly KES 50k in missed bookings a month. Worth a 10-minute conversation this week?";
  const [chars, setChars] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      const iv = setInterval(() => {
        setChars((c) => {
          if (c >= MSG.length) { clearInterval(iv); return c; }
          return c + 3;
        });
      }, 18);
      return () => clearInterval(iv);
    }, 500);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <BrowserFrame url="4unter.dullugroup.co.ke/leads/pearl-dental">
      <div ref={ref} className="p-5 space-y-4" style={{ minHeight: 300 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-100">AI Opener — Pearl Dental Clinic</p>
            <p className="text-[11px] text-zinc-500">WhatsApp · crafted with real pain signal</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="text-[10px] text-amber-400 font-medium">Generating…</span>
          </div>
        </div>

        {/* Message bubble */}
        <div className="rounded-xl bg-green-600/10 border border-green-600/20 px-4 py-3 min-h-[100px]">
          <p className="text-xs text-zinc-200 leading-relaxed">
            {MSG.slice(0, chars)}
            {chars < MSG.length && (
              <span className="inline-block w-0.5 h-3.5 bg-amber-400 ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>

        {/* Tone chips */}
        <div className="flex gap-1.5 flex-wrap">
          {["Consultative", "Kenya-specific", "Pain-led", "No fluff"].map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400">{tag}</span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-300">
            <Mail className="h-3.5 w-3.5" /> Copy for email
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-600/20 border border-green-600/30 px-3 py-2 text-xs font-medium text-green-400">
            <MessageSquare className="h-3.5 w-3.5" /> Open WhatsApp
          </button>
        </div>
      </div>
    </BrowserFrame>
  );
}

// ── Discover screenshot mockup ────────────────────────────────────────────────
function DiscoverScreenshot() {
  const [progress, setProgress] = useState(0);
  const [found, setFound] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(iv); return 100; }
        return p + 1;
      });
      setFound((f) => Math.min(f + 2, 214));
    }, 40);
    return () => clearInterval(iv);
  }, [visible]);

  return (
    <BrowserFrame url="4unter.dullugroup.co.ke/discover">
      <div ref={ref} className="p-5 space-y-4" style={{ minHeight: 300 }}>
        {/* Search config */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Vertical", value: "Dental Clinics" },
            { label: "City",     value: "Nairobi" },
            { label: "Min Rating", value: "4.0+" },
            { label: "Reviews",  value: "50+ reviews" },
          ].map((f) => (
            <div key={f.label} className="rounded-lg bg-white/4 border border-white/6 px-3 py-2">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wide">{f.label}</p>
              <p className="text-[11px] text-zinc-200 font-medium mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="rounded-lg bg-white/4 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Scanning Google Places · Foursquare · OSM
            </span>
            <span className="font-bold text-green-400 font-mono">{found} found</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.05, ease: "linear" }}
            />
          </div>
          <p className="text-[10px] text-zinc-600">{progress}% · Protocol filter active · Low-rated businesses blocked</p>
        </div>

        {/* Live results */}
        <div className="space-y-1.5">
          {MOCK_LEADS.slice(0, 3).map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, x: -8 }}
              animate={visible && progress > (i + 1) * 20 ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2.5 rounded-lg bg-white/4 px-3 py-2"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
              <span className="text-[11px] text-zinc-200 flex-1 truncate font-medium">{lead.name}</span>
              <span className="text-[10px] text-zinc-500">{lead.city}</span>
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />{lead.rating}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

// ── Sign up form ──────────────────────────────────────────────────────────────
function HeroSignup() {
  const [email, setEmail] = useState("");
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your work email"
        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600
          focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition"
      />
      <Link
        href={email ? `/sign-up?email=${encodeURIComponent(email)}` : "/sign-up"}
        className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors
          px-6 py-3 text-sm font-bold text-black whitespace-nowrap"
      >
        Start for free <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--background)", color: "var(--text-1)" }}>

      {/* ── Nav ── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
          scrolled ? "backdrop-blur-md border-b border-white/6" : ""
        }`}
        style={scrolled ? { background: "rgba(13,17,23,0.92)" } : {}}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <HunterWordmark size="sm" />
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {["Features", "Pricing", "Use Cases"].map((item) => (
              <span key={item} className="text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer">{item}</span>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href="/sign-in"
              className="hidden sm:block text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5">
              Log in
            </Link>
            <Link href="/sign-up"
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors px-4 py-2 text-sm font-bold text-black">
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-10 px-4 sm:px-6 text-center overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10">
          <div className="h-[600px] w-[900px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, #F59E0B 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/8 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-amber-400">Now live · Nairobi · Mombasa · 40 counties</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
            The AI lead platform<br />
            <span className="text-brand-gradient">built for East Africa.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed" style={{ color: "var(--text-2)" }}>
            Find 200 qualified local businesses, score every one with AI, and have the
            WhatsApp opener written — before your competitor finishes their first Google search.
          </p>

          <div className="mt-8">
            <HeroSignup />
          </div>

          <p className="mt-3 text-xs" style={{ color: "var(--text-3)" }}>
            Free 7-day trial · No credit card · Set up in under 2 minutes
          </p>
        </div>

        {/* Hero product screenshot */}
        <div className="relative z-10 mx-auto mt-12 max-w-5xl">
          {/* Gradient fade at bottom */}
          <div className="absolute -bottom-1 inset-x-0 h-24 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }} />
          <LeadsScreenshot />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-white/6" style={{ background: "var(--bg-surface)" }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "200+",    label: "Leads per run"         },
              { value: "< 4 min", label: "Discovery to opener"   },
              { value: "36",      label: "Verticals covered"     },
              { value: "10×",     label: "Faster than manual"    },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-black text-amber-400 tracking-tight">{value}</div>
                <div className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature 1: Discover ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">01 · Discover</p>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight">
              200 pre-qualified leads<br />in under two minutes.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--text-2)" }}>
              4unter pulls from Google Places, Foursquare, and OpenStreetMap simultaneously.
              A strict protocol filter removes low-rated, unreviewed, and off-vertical
              results — so every lead on your list is already worth your time.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Real-time scan across 3 data sources",
                "Rating, review count, and name filters enforced automatically",
                "Runs in the background — check back when it's done",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                  <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <DiscoverScreenshot />
        </div>
      </section>

      {/* ── Feature 2: Enrich & Score ── */}
      <section className="border-y border-white/6" style={{ background: "var(--bg-surface)" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScoreScreenshot />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">02 · Enrich & Score</p>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                Know who to call<br />before you dial.
              </h2>
              <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--text-2)" }}>
                4unter crawls each lead&apos;s website for emails, booking systems, live chat, and
                social signals. Gemini AI scores them 0–100 and names the exact pain point —
                so you open with their real gap, not a generic pitch.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Email addresses, phone numbers, and decision-maker contacts extracted",
                  "AI identifies missing booking systems, dead social, and poor follow-up",
                  "Score tells you who is hot — so you work the right list first",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                    <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 3: Outreach ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">03 · Outreach</p>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight">
              One click. A message<br />they actually read.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--text-2)" }}>
              The AI opener is written using that lead&apos;s actual data — their rating, their
              gap, their city. No templates. No generic intros. Just a specific, credible
              message that opens real conversations on WhatsApp or email.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "References the lead's real pain signal — not a copy-paste template",
                "One-click to open WhatsApp or copy to email — no extra steps",
                "Kenyan context baked in: KES, local references, appropriate tone",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                  <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/sign-up"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors px-6 py-3 text-sm font-bold text-black">
                Try it free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <OutreachScreenshot />
        </div>
      </section>

      {/* ── Pain → Gain ── */}
      <section className="border-y border-white/6" style={{ background: "var(--bg-surface)" }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-10" style={{ color: "var(--text-3)" }}>
            What changes
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                before: "Hours on Google Maps, tabs everywhere, still no clear list to call.",
                after:  "200 scored leads waiting before your coffee goes cold.",
                label:  "Time",
              },
              {
                before: "Same opener to everyone. Wonder why nobody replies.",
                after:  "Every message names their exact gap — real, specific, credible.",
                label:  "Relevance",
              },
              {
                before: "Your ceiling is how fast you can research manually.",
                after:  "Your ceiling is your close rate. Not your research speed.",
                label:  "Scale",
              },
            ].map(({ before, after, label }) => (
              <div key={label} className="rounded-2xl border border-white/6 overflow-hidden"
                style={{ background: "var(--bg-elevated)" }}>
                <div className="px-5 py-4 border-b border-white/6">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>{label}</p>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide mb-1.5">Before</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-3)" }}>{before}</p>
                  </div>
                  <div className="h-px" style={{ background: "var(--border)" }} />
                  <div>
                    <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wide mb-1.5">After</p>
                    <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-1)" }}>{after}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built for Kenya specifics ── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Built different</p>
          <h2 className="text-2xl sm:text-3xl font-black">
            Made for the Kenyan market.<br />Not adapted from it.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MapPin,    title: "40+ Counties",       body: "Nairobi, Mombasa, Kisumu, Nakuru, Kilifi, and beyond. Not just CBD." },
            { icon: Building2, title: "36 Verticals",       body: "Dental, physio, hotel, real estate, pharmacy, solar, and more." },
            { icon: MessageSquare, title: "WhatsApp First", body: "Openers written for WhatsApp by default. Because that's how Kenya closes." },
            { icon: TrendingUp, title: "KES Context",       body: "AI references local pricing, terms, and pain points — not USD templates." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-white/6 p-5" style={{ background: "var(--bg-surface)" }}>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Icon className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-sm font-semibold mb-1.5">{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-white/6" style={{ background: "var(--bg-surface)" }}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-24 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-5">Get started today</p>
          <h2 className="text-4xl sm:text-5xl font-black leading-tight">
            Your competitor is still<br />on page 2 of Google.
          </h2>
          <p className="mt-5 text-lg" style={{ color: "var(--text-2)" }}>
            You&apos;re already in their DMs.
          </p>
          <div className="mt-10">
            <HeroSignup />
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--text-3)" }}>
            7-day free trial · No credit card · Cancel any time
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <HunterWordmark size="sm" />
            <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-3)" }}>
              <Link href="/terms"    className="hover:text-zinc-200 transition-colors">Terms</Link>
              <Link href="/workshop" className="hover:text-zinc-200 transition-colors">Workshop</Link>
              <Link href="/sign-in"  className="hover:text-zinc-200 transition-colors">Sign in</Link>
              <span>© 2026 Dullu Digital</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
