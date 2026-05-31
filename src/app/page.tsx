"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, useScroll, useTransform, useInView, useSpring, Variants } from "framer-motion";
import {
  ArrowRight, Search, CheckCircle2, XCircle, Star, Zap, Mail,
  MessageSquare, Building2, MapPin, TrendingUp, Globe, Check,
} from "lucide-react";
import { HunterWordmark } from "@/components/HunterLogo";

// ── Animation presets ─────────────────────────────────────────────────────────
const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.65, ease } },
};

const fadeLeft: Variants = {
  hidden:  { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.65, ease } },
};

const fadeRight: Variants = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.65, ease } },
};

const stagger = (delay = 0.09): Variants => ({
  hidden:  {},
  visible: { transition: { staggerChildren: delay, delayChildren: 0.1 } },
});

function InView({
  children,
  variants = fadeUp,
  className = "",
}: {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

// ── Word-split hero heading ───────────────────────────────────────────────────
function SplitWords({
  text,
  className = "",
  staggerDelay = 0.06,
  childDelay = 0,
}: {
  text: string;
  className?: string;
  staggerDelay?: number;
  childDelay?: number;
}) {
  const words = text.split(" ");
  const container: Variants = {
    hidden:  {},
    visible: { transition: { staggerChildren: staggerDelay, delayChildren: childDelay } },
  };
  const word: Variants = {
    hidden:  { opacity: 0, y: 24, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.5, ease } },
  };
  return (
    <motion.span
      className={`inline ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((w, i) => (
        <motion.span key={i} variants={word} className="inline-block mr-[0.22em]">
          {w}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ── Count-up number ───────────────────────────────────────────────────────────
function CountUp({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const raw = useSpring(0, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    raw.set(to);
  }, [inView, raw, to]);

  useEffect(() => raw.on("change", (v) => setDisplay(Math.round(v))), [raw]);

  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

// ── Floating ambient orbs ─────────────────────────────────────────────────────
function Orb({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none blur-3xl ${className}`}
      animate={{
        y:      [0, -28, 8, -18, 0],
        x:      [0, 14, -10, 20, 0],
        scale:  [1, 1.08, 0.96, 1.04, 1],
        opacity:[0.35, 0.5, 0.3, 0.45, 0.35],
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── Floating screenshot wrapper ───────────────────────────────────────────────
function FloatCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 2, -6, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_LEADS = [
  { id: 1, name: "Pearl Dental Clinic",     city: "Westlands",  rating: 4.8, score: 87, stage: "new"      },
  { id: 2, name: "Kilimani Physio Centre",  city: "Kilimani",   rating: 4.3, score: 72, stage: "contacted" },
  { id: 3, name: "Akili Real Estate",       city: "Karen",      rating: 4.6, score: 65, stage: "replied"   },
  { id: 4, name: "The Grand Hotel Nairobi", city: "Upperhill",  rating: 4.7, score: 91, stage: "qualified" },
  { id: 5, name: "Nairobi Eye Specialists", city: "CBD",        rating: 4.5, score: 78, stage: "new"       },
  { id: 6, name: "Urban Brew Coffee",       city: "Lavington",  rating: 4.4, score: 54, stage: "new"       },
];

const STAGE_COLORS: Record<string, string> = {
  new:       "bg-stone-100 text-stone-500",
  contacted: "bg-blue-50 text-blue-600",
  replied:   "bg-amber-50 text-amber-600",
  qualified: "bg-purple-50 text-purple-600",
  won:       "bg-green-50 text-green-600",
};

// ── Browser chrome wrapper ────────────────────────────────────────────────────
function BrowserFrame({ children, url = "4unter.dullugroup.co.ke/leads", className = "" }: {
  children: React.ReactNode;
  url?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl overflow-hidden border border-stone-200 shadow-xl shadow-stone-300/30 ${className}`}
      style={{ background: "#FFFFFF" }}>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-200" style={{ background: "#F8F7F4" }}>
        <div className="flex gap-1.5 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 flex items-center gap-1.5 bg-stone-100 rounded-md px-3 py-1 max-w-xs mx-auto">
          <Globe className="h-3 w-3 text-stone-400 shrink-0" />
          <span className="text-[11px] text-stone-500 font-mono truncate">{url}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Leads table mockup ────────────────────────────────────────────────────────
function LeadsScreenshot() {
  const [active, setActive] = useState<number | null>(null);
  const containerVariants: Variants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
  };
  const rowVariants: Variants = {
    hidden:  { opacity: 0, x: -12 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease } },
  };
  const inViewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(inViewRef, { once: true });

  return (
    <BrowserFrame url="4unter.dullugroup.co.ke/leads">
      <div ref={inViewRef} className="flex" style={{ minHeight: 340 }}>
        <div className="w-40 shrink-0 border-r border-stone-100 py-3 space-y-0.5 px-2" style={{ background: "#F8F7F4" }}>
          {["Dashboard","Discover","Leads","Pipeline","Settings"].map((item) => (
            <div key={item}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-medium transition-colors
                ${item === "Leads" ? "border-l-2 border-amber-500 bg-amber-500/8 text-amber-600 -ml-px pl-[7px]"
                  : "text-stone-400 hover:text-stone-700"}`}>
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-800">Leads</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-mono">
                {MOCK_LEADS.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-100 rounded px-2 py-1">
                <Search className="h-3 w-3 text-stone-400" />
                <span className="text-[11px] text-stone-400">dental...</span>
              </div>
              <div className="bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded">+ Discover</div>
            </div>
          </div>
          <div className="text-[11px]">
            <div className="flex items-center px-4 py-1.5 border-b border-stone-100 text-stone-400 font-medium gap-3">
              <span className="w-4" />
              <span className="flex-1">Company</span>
              <span className="w-16 text-right">Score</span>
              <span className="w-20 text-right">Stage</span>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            >
              {MOCK_LEADS.map((lead) => (
                <motion.div
                  key={lead.id}
                  variants={rowVariants}
                  onHoverStart={() => setActive(lead.id)}
                  onHoverEnd={() => setActive(null)}
                  className={`flex items-center px-4 py-2 gap-3 border-b border-stone-50 cursor-pointer transition-colors
                    ${active === lead.id ? "bg-stone-50" : ""}`}
                >
                  <span className="w-4 h-4 rounded border border-stone-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-800 font-medium truncate">{lead.name}</p>
                    <p className="text-stone-400 text-[10px] flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />{lead.city}
                      <span className="ml-1 flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-400" />{lead.rating}
                      </span>
                    </p>
                  </div>
                  <span className={`w-16 text-right font-bold font-mono
                    ${lead.score >= 70 ? "text-green-600" : lead.score >= 50 ? "text-yellow-600" : "text-stone-400"}`}>
                    {lead.score}
                  </span>
                  <span className={`w-20 text-right text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[lead.stage]}`}>
                    {lead.stage}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

// ── Score card mockup ─────────────────────────────────────────────────────────
function ScoreScreenshot() {
  const [score, setScore] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    let n = 0;
    const iv = setInterval(() => { n = Math.min(n + 2, 87); setScore(n); if (n >= 87) clearInterval(iv); }, 20);
    return () => clearInterval(iv);
  }, [inView]);

  return (
    <BrowserFrame url="4unter.dullugroup.co.ke/leads/pearl-dental">
      <div ref={ref} className="p-5 space-y-4" style={{ minHeight: 300 }}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">PD</div>
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Pearl Dental Clinic</h3>
            <p className="text-xs text-stone-500 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Westlands, Nairobi
              <span className="flex items-center gap-0.5 ml-1">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-400" />4.8 · 156 reviews
              </span>
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-3xl font-black tabular-nums transition-colors ${score >= 70 ? "text-green-600" : "text-yellow-600"}`}>{score}</p>
            <p className="text-[10px] text-stone-400">/ 100</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-green-500 to-amber-400"
            animate={{ width: `${score}%` }} transition={{ duration: 1.5, ease: "easeOut" }} />
        </div>
        <motion.div
          className="grid grid-cols-2 gap-2"
          variants={stagger(0.08)}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {[
            { label: "No booking system", ok: false, tag: "Pain" },
            { label: "WhatsApp gap",      ok: false, tag: "Pain" },
            { label: "2 emails extracted",ok: true,  tag: null   },
            { label: "4.8★ social proof", ok: true,  tag: null   },
          ].map((s) => (
            <motion.div key={s.label} variants={fadeUp}
              className="flex items-center gap-2 rounded-lg bg-stone-50 border border-stone-100 px-2.5 py-2">
              {s.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
              <span className="text-[11px] text-stone-700 flex-1 truncate">{s.label}</span>
              {s.tag && <span className="text-[9px] bg-orange-50 border border-orange-100 text-orange-600 px-1 py-0.5 rounded font-semibold">{s.tag}</span>}
            </motion.div>
          ))}
        </motion.div>
        <motion.div
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5"
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <span className="font-semibold text-amber-600">AI Signal:</span> No booking system + 4.8★ + 156 reviews = missed bookings after 5 PM daily. High close probability.
          </p>
        </motion.div>
      </div>
    </BrowserFrame>
  );
}

// ── Outreach mockup ───────────────────────────────────────────────────────────
function OutreachScreenshot() {
  const MSG = "Hi Dr. Kamau, your 4.8★ puts Pearl Dental in the top 5% in Westlands — patients clearly trust you. But calls after 5 PM go to voicemail, which is roughly KES 50k in missed bookings a month. Worth a 10-minute conversation this week?";
  const [chars, setChars] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => {
      const iv = setInterval(() => { setChars((c) => { if (c >= MSG.length) { clearInterval(iv); return c; } return c + 3; }); }, 18);
      return () => clearInterval(iv);
    }, 500);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <BrowserFrame url="4unter.dullugroup.co.ke/leads/pearl-dental">
      <div ref={ref} className="p-5 space-y-4" style={{ minHeight: 300 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-900">AI Opener — Pearl Dental Clinic</p>
            <p className="text-[11px] text-stone-500">WhatsApp · crafted with real pain signal</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            <span className="text-[10px] text-amber-600 font-medium">Generating…</span>
          </div>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 min-h-[100px]">
          <p className="text-xs text-stone-800 leading-relaxed">
            {MSG.slice(0, chars)}
            {chars < MSG.length && <span className="inline-block w-0.5 h-3.5 bg-amber-500 ml-0.5 animate-pulse align-middle" />}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["Consultative", "Kenya-specific", "Pain-led", "No fluff"].map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-stone-200 text-stone-500">{tag}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600">
            <Mail className="h-3.5 w-3.5" /> Copy for email
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs font-medium text-green-700">
            <MessageSquare className="h-3.5 w-3.5" /> Open WhatsApp
          </button>
        </div>
      </div>
    </BrowserFrame>
  );
}

// ── Discover mockup — static completed state ──────────────────────────────────
function DiscoverScreenshot() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const rowVariants: Variants = {
    hidden:  { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease } },
  };

  return (
    <BrowserFrame url="4unter.dullugroup.co.ke/discover">
      <div ref={ref} className="p-5 space-y-4" style={{ minHeight: 300 }}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Vertical",   value: "Dental Clinics" },
            { label: "City",       value: "Nairobi" },
            { label: "Min Rating", value: "4.0+" },
            { label: "Reviews",    value: "50+ reviews" },
          ].map((f) => (
            <div key={f.label} className="rounded-lg bg-stone-50 border border-stone-100 px-3 py-2">
              <p className="text-[9px] text-stone-400 uppercase tracking-wide">{f.label}</p>
              <p className="text-[11px] text-stone-800 font-medium mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-green-700 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            Discovery complete
          </span>
          <span className="font-bold text-green-700 font-mono text-sm">214 leads</span>
        </div>
        <motion.div
          className="space-y-1.5"
          variants={stagger(0.07)}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {MOCK_LEADS.slice(0, 4).map((lead) => (
            <motion.div key={lead.id}
              variants={rowVariants}
              className="flex items-center gap-2.5 rounded-lg bg-stone-50 border border-stone-100 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-[11px] text-stone-800 flex-1 truncate font-medium">{lead.name}</span>
              <span className="text-[10px] text-stone-500">{lead.city}</span>
              <span className="flex items-center gap-0.5 text-[10px] font-bold font-mono
                ${lead.score >= 70 ? 'text-green-600' : 'text-yellow-600'}">
                <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-400" />{lead.rating}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </BrowserFrame>
  );
}

// ── CTA input ─────────────────────────────────────────────────────────────────
function HeroSignup({ dark = false, signedIn = false }: { dark?: boolean; signedIn?: boolean }) {
  const [email, setEmail] = useState("");
  if (signedIn) {
    return (
      <Link
        href="/dashboard"
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors
          px-8 py-3 text-sm font-bold text-black ${dark ? "" : ""}`}
      >
        Go to dashboard <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your work email"
        className={`flex-1 border px-4 py-3 text-sm focus:outline-none transition rounded-lg ${
          dark
            ? "bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-500/60"
            : "bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/20"
        }`}
      />
      <Link
        href={email ? `/sign-up?email=${encodeURIComponent(email)}` : "/sign-up"}
        className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors
          px-6 py-3 text-sm font-bold text-black whitespace-nowrap">
        Start for free <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ── Scroll-to helper ──────────────────────────────────────────────────────────
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Scroll-parallax hook ──────────────────────────────────────────────────────
function useParallax(factor = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${factor * -100}px`, `${factor * 100}px`]);
  return { ref, y };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { isSignedIn } = useUser();
  const { ref: heroParallaxRef, y: heroScreenshotY } = useParallax(0.08);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navCta = isSignedIn ? "/dashboard" : "/sign-up";
  const loginHref = isSignedIn ? "/dashboard" : "/sign-in";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8F7F4] text-stone-900">

      {/* ── Nav ── */}
      <motion.header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
          scrolled ? "bg-[#F8F7F4]/95 backdrop-blur-sm border-b border-stone-200" : ""
        }`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <HunterWordmark size="sm" onLight />
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={() => scrollTo("features")} className="text-stone-500 hover:text-stone-900 transition-colors">Features</button>
            <button onClick={() => scrollTo("pricing")}  className="text-stone-500 hover:text-stone-900 transition-colors">Pricing</button>
            <button onClick={() => scrollTo("use-cases")} className="text-stone-500 hover:text-stone-900 transition-colors">Use Cases</button>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href={loginHref}
              className="hidden sm:block text-sm text-stone-500 hover:text-stone-900 transition-colors px-3 py-1.5">
              {isSignedIn ? "Dashboard" : "Log in"}
            </Link>
            <Link href={navCta}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors px-4 py-2 text-sm font-bold text-black">
              {isSignedIn ? "Dashboard" : "Get started"} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-10 px-4 sm:px-6 text-center overflow-hidden">
        <Orb className="w-96 h-96 bg-amber-400/20 -top-24 -left-32" />
        <Orb className="w-72 h-72 bg-amber-300/15 top-20 -right-20" />
        <Orb className="w-56 h-56 bg-orange-300/10 bottom-0 left-1/3" />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-28 bg-gradient-to-b from-amber-500/60 to-transparent pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-stone-950">
            <SplitWords text="The AI lead platform" staggerDelay={0.07} childDelay={0.1} />
            <br />
            <span className="text-brand-gradient">
              <SplitWords text="built for Kenya." staggerDelay={0.07} childDelay={0.5} />
            </span>
          </h1>

          <motion.p
            className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-stone-500"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.55, ease }}
          >
            Find 200 qualified local businesses, score every one with AI, and have the
            WhatsApp opener written — before your competitor finishes their first Google search.
          </motion.p>

          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.55, ease }}
          >
            <HeroSignup signedIn={!!isSignedIn} />
          </motion.div>

          <motion.p
            className="mt-3 text-xs text-stone-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.4 }}
          >
            Free 7-day trial · No credit card · Set up in under 2 minutes
          </motion.p>
        </div>

        <div ref={heroParallaxRef} className="relative z-10 mx-auto mt-14 max-w-5xl">
          <div className="absolute -bottom-1 inset-x-0 h-28 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, #F8F7F4)" }} />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease }}
            style={{ y: heroScreenshotY }}
          >
            <FloatCard delay={0.5}>
              <LeadsScreenshot />
            </FloatCard>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-stone-200 bg-stone-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center"
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {[
              { value: 200,  suffix: "+",    label: "Leads per run",       prefix: "" },
              { value: 4,    suffix: " min", label: "Discovery to opener", prefix: "< " },
              { value: 36,   suffix: "",     label: "Verticals covered",   prefix: "" },
              { value: 10,   suffix: "×",    label: "Faster than manual",  prefix: "" },
            ].map(({ value, suffix, label, prefix }) => (
              <motion.div key={label} variants={fadeUp}>
                <div className="text-3xl font-black text-amber-500 tracking-tight">
                  <CountUp to={value} suffix={suffix} prefix={prefix} />
                </div>
                <div className="mt-1 text-xs text-stone-500">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <div id="features" style={{ scrollMarginTop: "4rem" }}>

        {/* Feature 1: Discover */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <InView variants={fadeLeft}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500 mb-4">01 · Discover</p>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight text-stone-950">
                200 pre-qualified leads<br />in under two minutes.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-stone-600">
                4unter pulls from multiple business data sources simultaneously.
                A strict protocol filter removes low-rated, unreviewed, and off-vertical
                results — so every lead on your list is already worth your time.
              </p>
              <motion.ul
                className="mt-6 space-y-3"
                variants={stagger(0.08)}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
              >
                {[
                  "Real-time scan across multiple data sources",
                  "Rating, review count, and name filters enforced automatically",
                  "Runs in the background — check back when it's done",
                ].map((item) => (
                  <motion.li key={item} variants={fadeUp} className="flex items-start gap-2.5 text-sm text-stone-600">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    {item}
                  </motion.li>
                ))}
              </motion.ul>
            </InView>
            <InView variants={fadeRight}>
              <FloatCard delay={1}>
                <DiscoverScreenshot />
              </FloatCard>
            </InView>
          </div>
        </section>

        {/* Feature 2: Enrich & Score */}
        <section className="border-y border-stone-200 bg-stone-100">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-28">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <InView variants={fadeLeft}>
                <FloatCard delay={1.5}>
                  <ScoreScreenshot />
                </FloatCard>
              </InView>
              <InView variants={fadeRight}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500 mb-4">02 · Enrich & Score</p>
                <h2 className="text-3xl sm:text-4xl font-black leading-tight text-stone-950">
                  Know who to call<br />before you dial.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-stone-600">
                  4unter crawls each lead&apos;s website for emails, booking systems, live chat, and
                  social signals. AI scores them 0–100 and names the exact pain point —
                  so you open with their real gap, not a generic pitch.
                </p>
                <motion.ul
                  className="mt-6 space-y-3"
                  variants={stagger(0.08)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                >
                  {[
                    "Email addresses, phone numbers, and decision-maker contacts extracted",
                    "AI identifies missing booking systems, dead social, and poor follow-up",
                    "Score tells you who is hot — so you work the right list first",
                  ].map((item) => (
                    <motion.li key={item} variants={fadeUp} className="flex items-start gap-2.5 text-sm text-stone-600">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      {item}
                    </motion.li>
                  ))}
                </motion.ul>
              </InView>
            </div>
          </div>
        </section>

        {/* Feature 3: Outreach */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <InView variants={fadeLeft}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500 mb-4">03 · Outreach</p>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight text-stone-950">
                One click. A message<br />they actually read.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-stone-600">
                The AI opener is written using that lead&apos;s actual data — their rating, their
                gap, their city. No templates. No generic intros. Just a specific, credible
                message that opens real conversations on WhatsApp or email.
              </p>
              <motion.ul
                className="mt-6 space-y-3"
                variants={stagger(0.08)}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
              >
                {[
                  "References the lead's real pain signal — not a copy-paste template",
                  "One-click to open WhatsApp or copy to email — no extra steps",
                  "Kenyan context baked in: KES, local references, appropriate tone",
                ].map((item) => (
                  <motion.li key={item} variants={fadeUp} className="flex items-start gap-2.5 text-sm text-stone-600">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    {item}
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5, ease }}
              >
                <Link href={navCta}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors px-6 py-3 text-sm font-bold text-black">
                  Try it free <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </InView>
            <InView variants={fadeRight}>
              <FloatCard delay={2}>
                <OutreachScreenshot />
              </FloatCard>
            </InView>
          </div>
        </section>

      </div>{/* /#features */}

      {/* ── Use Cases ── */}
      <section id="use-cases" style={{ scrollMarginTop: "4rem" }} className="border-y border-stone-200 bg-stone-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
          <InView>
            <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-stone-400 mb-2">Use Cases</p>
            <p className="text-center text-2xl font-black text-stone-950 mb-10">What changes when you use 4unter</p>
          </InView>
          <motion.div
            className="grid gap-5 md:grid-cols-3"
            variants={stagger(0.12)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {[
              {
                before: "Hours on Google, tabs everywhere, still no clear list to call.",
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
              <motion.div
                key={label}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white border border-stone-200 overflow-hidden rounded-xl"
              >
                <div className="px-5 py-3 border-b border-stone-200">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">{label}</p>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wide mb-1.5">Before</p>
                    <p className="text-sm leading-relaxed text-stone-500">{before}</p>
                  </div>
                  <div className="h-px bg-stone-100" />
                  <div>
                    <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide mb-1.5">After</p>
                    <p className="text-sm font-medium leading-relaxed text-stone-900">{after}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Built for Kenya ── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
        <InView className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-stone-950">
            Made for the Kenyan market.<br />Not adapted from it.
          </h2>
        </InView>
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {[
            { icon: MapPin,        title: "40+ Counties",    body: "Nairobi, Mombasa, Kisumu, Nakuru, Kilifi, and beyond. Not just CBD." },
            { icon: Building2,     title: "36 Verticals",    body: "Dental, physio, hotel, real estate, pharmacy, solar, and more." },
            { icon: MessageSquare, title: "WhatsApp First",  body: "Openers written for WhatsApp by default. Because that's how Kenya closes." },
            { icon: TrendingUp,    title: "KES Context",     body: "AI references local pricing, terms, and pain points — not USD templates." },
          ].map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
              className="bg-white border border-stone-200 rounded-xl p-5 cursor-default"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 border border-amber-200">
                <Icon className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-stone-900 mb-1.5">{title}</p>
              <p className="text-xs leading-relaxed text-stone-500">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ scrollMarginTop: "4rem" }} className="border-y border-stone-200 bg-stone-100">
        <div className="mx-auto max-w-lg px-4 sm:px-6 py-20">
          <InView className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500 mb-3">Pricing</p>
            <h2 className="text-3xl font-black text-stone-950">One plan. No limits.</h2>
            <p className="mt-2 text-stone-500 text-sm">Everything you need to run your full pipeline.</p>
          </InView>
          <InView>
            <div className="rounded-2xl border-2 border-amber-500 bg-white ring-1 ring-amber-500/20 p-8 shadow-xl shadow-amber-100/40">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-lg font-black text-stone-950">4unter Pro</p>
                  <p className="text-xs text-stone-400 mt-0.5">7-day free trial included</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-amber-500">1,999</p>
                  <p className="text-xs text-stone-400">KES / month</p>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited lead discovery",
                  "AI scoring on every lead",
                  "WhatsApp & email opener generation",
                  "All 36 Kenyan B2B verticals",
                  "Website enrichment — email, phone, tech stack, social",
                  "Pipeline management (New → Won)",
                  "CSV export",
                  "No credit card for trial",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-stone-700">
                    <Check className="h-4 w-4 text-amber-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-up"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 transition-colors px-6 py-3.5 font-bold text-black text-sm"
              >
                {isSignedIn ? "Go to dashboard" : "Start 7-day free trial"} <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-center text-xs text-stone-400 mt-3">Cancel any time · billed monthly</p>
            </div>
          </InView>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-stone-950 border-t border-stone-800 relative overflow-hidden">
        <Orb className="w-96 h-96 bg-amber-500/8 -top-32 -left-32" />
        <Orb className="w-72 h-72 bg-amber-400/6 -bottom-20 -right-20" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-24 text-center">
          <motion.h2
            className="text-4xl sm:text-5xl font-black leading-tight text-white"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            Your competitor is still<br />on page 2 of Google.
          </motion.h2>
          <motion.p
            className="mt-5 text-lg text-stone-400"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            You&apos;re already in their DMs.
          </motion.p>
          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3, ease }}
          >
            <HeroSignup dark signedIn={!!isSignedIn} />
          </motion.div>
          <motion.p
            className="mt-4 text-xs text-stone-600"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            7-day free trial · No credit card · Cancel any time
          </motion.p>
        </div>
      </section>

    </div>
  );
}
