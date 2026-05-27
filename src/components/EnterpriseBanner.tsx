"use client";
import { useState, useEffect } from "react";
import { X, Sparkles, CalendarDays } from "lucide-react";

const DISMISSED_KEY = "hunter_enterprise_banner_dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function EnterpriseBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (raw) {
        const dismissedAt = parseInt(raw, 10);
        if (Date.now() - dismissedAt < DISMISS_TTL_MS) return;
      }
    } catch { /* localStorage unavailable */ }
    // Small delay so it doesn't fight with page load
    const t = setTimeout(() => setVisible(true), 3500);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 animate-in slide-in-from-top-2 fade-in duration-300"
      role="complementary"
      aria-label="Enterprise commission notice"
    >
      {/* Accent bar */}
      <div className="h-0.5 w-full rounded-t-xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500" />

      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-600/20 border border-red-600/30">
              <Sparkles className="h-3.5 w-3.5 text-red-400" />
            </div>
            <p className="text-xs font-semibold text-zinc-100">Built for your industry</p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors mt-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed mb-3">
          Dullu Digital builds <strong className="text-zinc-200">commissioned AI tools</strong> for
          enterprises exactly like the ones you are hunting.
        </p>

        <a
          href="https://vuka-six.vercel.app/#contact"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-red-600 hover:bg-red-500 transition-colors px-3 py-2 text-xs font-semibold text-white"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Book a call — assess your fit
        </a>
      </div>
    </div>
  );
}
