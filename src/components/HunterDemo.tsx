"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Zap, Mail, MessageSquare, Star } from "lucide-react";

const LEADS = [
  { name: "Pearl Dental Clinic",     vertical: "dental",      city: "Westlands",  rating: 4.8, reviews: 156 },
  { name: "Kilimani Physio Centre",  vertical: "physio",      city: "Kilimani",   rating: 4.3, reviews: 88  },
  { name: "Akili Real Estate",       vertical: "real_estate", city: "Karen",      rating: 4.6, reviews: 42  },
  { name: "The Grand Hotel Nairobi", vertical: "hotel",       city: "Upperhill",  rating: 4.7, reviews: 310 },
];

const ENRICHED = [
  { label: "Website detected",   ok: true  },
  { label: "2 emails extracted", ok: true  },
  { label: "Booking system",     ok: false },
  { label: "WhatsApp CTA",       ok: false },
  { label: "Pain signals found", ok: true  },
];

const PHASES = ["discover", "enrich", "score", "outreach"] as const;
type Phase = typeof PHASES[number];

const PHASE_LABELS: Record<Phase, string> = {
  discover: "01 · Discover",
  enrich:   "02 · Enrich",
  score:    "03 · Score",
  outreach: "04 · Outreach",
};

const INTERVAL = 4000;

function DiscoverPhase({ active }: { active: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) { setShown(0); return; }
    const timers = LEADS.map((_, i) =>
      setTimeout(() => setShown(i + 1), 300 + i * 500)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-stone-500 font-mono">Scanning Nairobi · dental clinic</span>
      </div>
      {LEADS.map((lead, i) => (
        <motion.div
          key={lead.name}
          initial={{ opacity: 0, x: -8 }}
          animate={i < shown ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2.5 rounded-md bg-stone-50 border border-stone-100 px-3 py-2"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          <span className="text-xs text-stone-800 flex-1 truncate font-medium">{lead.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-400" />
            <span className="text-xs text-stone-500 font-mono">{lead.rating}</span>
            <span className="text-xs text-stone-400">· {lead.reviews}</span>
          </div>
        </motion.div>
      ))}
      <motion.div
        animate={shown >= LEADS.length ? { opacity: 1 } : { opacity: 0 }}
        className="flex items-center justify-between pt-1 px-1"
      >
        <span className="text-xs text-stone-500 font-mono">{LEADS.length} leads accepted</span>
        <span className="text-xs font-semibold text-green-600">Protocol passed</span>
      </motion.div>
    </div>
  );
}

function EnrichPhase({ active }: { active: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) { setShown(0); return; }
    const timers = ENRICHED.map((_, i) =>
      setTimeout(() => setShown(i + 1), 200 + i * 450)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-xs text-stone-500 font-mono">Crawling · Pearl Dental Clinic</span>
      </div>
      {ENRICHED.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -8 }}
          animate={i < shown ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2.5 rounded-md bg-stone-50 border border-stone-100 px-3 py-2"
        >
          {item.ok
            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
          <span className={`text-xs ${item.ok ? "text-stone-700" : "text-stone-500"}`}>{item.label}</span>
          {!item.ok && (
            <span className="ml-auto text-[10px] text-orange-600 font-semibold bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
              Pain signal
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function ScorePhase({ active }: { active: boolean }) {
  const [score, setScore] = useState(0);
  const [textVisible, setTextVisible] = useState(false);
  const TARGET = 84;

  useEffect(() => {
    if (!active) { setScore(0); setTextVisible(false); return; }
    const step = TARGET / 40;
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + step, TARGET);
      setScore(Math.round(current));
      if (current >= TARGET) clearInterval(interval);
    }, 40);
    const t = setTimeout(() => setTextVisible(true), 1800);
    return () => { clearInterval(interval); clearTimeout(t); };
  }, [active]);

  const pct = (score / 100) * 100;
  const color = score >= 70 ? "from-green-500 to-amber-400" : score >= 40 ? "from-yellow-500 to-orange-400" : "from-red-500 to-red-400";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-3.5 w-3.5 text-purple-500" />
        <span className="text-xs text-stone-500 font-mono">Hunter Intelligence · Scoring</span>
      </div>
      <div className="rounded-lg bg-stone-50 border border-stone-100 px-4 py-4 text-center">
        <p className="text-xs text-stone-500 mb-1">Fit Score</p>
        <p className={`text-5xl font-black tabular-nums ${score >= 70 ? "text-green-600" : "text-yellow-600"}`}>
          {score}
        </p>
        <p className="text-xs text-stone-400 mt-0.5">/ 100</p>
        <div className="mt-3 h-1.5 rounded-full bg-stone-200 overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${color}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
      </div>
      <AnimatePresence>
        {textVisible && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5"
          >
            <p className="text-xs text-stone-600 leading-relaxed italic">
              &ldquo;No booking system, 4.8★, 156 reviews — missed bookings after 5 PM every day.&rdquo;
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OutreachPhase({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const MSG = "Your 4.8★ means patients trust you. Calls after 5 PM go to voicemail — that's KES 50k/month in missed bookings. Worth a 15-min call?";

  useEffect(() => {
    if (!active) { setStep(0); return; }
    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
        <span className="text-xs text-stone-500 font-mono">Opener generated · Pearl Dental</span>
      </div>
      <AnimatePresence>
        {step >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-green-50 border border-green-200 px-4 py-3"
          >
            <p className="text-xs text-stone-700 leading-relaxed">{MSG}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {step >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600">
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs font-medium text-green-700">
              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HunterDemo() {
  const [phase, setPhase] = useState<Phase>("discover");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / INTERVAL) * 100, 100));
    }, 50);
    const advance = setTimeout(() => {
      setPhase((p) => {
        const idx = PHASES.indexOf(p);
        return PHASES[(idx + 1) % PHASES.length];
      });
    }, INTERVAL);
    return () => { clearInterval(tick); clearTimeout(advance); };
  }, [phase]);

  return (
    <div className="w-full rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xl shadow-stone-200/60">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        </div>
        <span className="text-xs font-mono text-stone-500">{PHASE_LABELS[phase]}</span>
        <div className="flex gap-1">
          {PHASES.map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`h-1.5 rounded-full transition-all ${
                p === phase ? "w-4 bg-amber-500" : "w-1.5 bg-stone-200 hover:bg-stone-400"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[220px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {phase === "discover"  && <DiscoverPhase  active={phase === "discover"}  />}
            {phase === "enrich"    && <EnrichPhase    active={phase === "enrich"}    />}
            {phase === "score"     && <ScorePhase     active={phase === "score"}     />}
            {phase === "outreach"  && <OutreachPhase  active={phase === "outreach"}  />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-stone-100">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
