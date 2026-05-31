"use client";

import { SignIn } from "@clerk/nextjs";
import { HunterWordmark } from "@/components/HunterLogo";
import { HunterDemo } from "@/components/HunterDemo";
import { CheckCircle2 } from "lucide-react";

const BULLETS = [
  "Discover leads across 36 Kenyan B2B verticals",
  "Enrich with website, contact, and tech intelligence",
  "AI scores every lead and surfaces the exact pain signal to open with",
];

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-[#F8F7F4]">

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col justify-between px-10 py-10 relative overflow-hidden border-r border-stone-200"
        style={{ background: "#F8F7F4" }}
      >
        {/* Thin amber vertical accent */}
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-amber-500/60 via-amber-500/20 to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <HunterWordmark size="sm" onLight />
        </div>

        {/* Headline + demo */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-black leading-tight text-stone-950">
              Find the leads<br />
              <span className="text-brand-gradient">nobody else</span><br />
              is calling.
            </h1>
            <p className="mt-3 text-sm text-stone-500 leading-relaxed">
              AI-powered B2B lead intelligence built for the Kenyan market.
            </p>
          </div>

          {/* Animated demo */}
          <HunterDemo />

          {/* Bullets */}
          <ul className="space-y-2.5">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-stone-600">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
                  <CheckCircle2 className="h-2.5 w-2.5 text-amber-500" />
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-stone-400">Dullu Digital · 4unter.dullugroup.co.ke</p>
          <p className="text-xs text-stone-400 mt-0.5">Free Trial — 7 days · Kenya DPA 2019 compliant</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-y-auto bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <HunterWordmark size="sm" onLight />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-stone-950">Welcome back</h2>
            <p className="text-sm text-stone-500 mt-1">Sign in to your 4unter account.</p>
          </div>

          <SignIn
            appearance={{
              variables: {
                colorPrimary:         "#F59E0B",
                colorBackground:      "#FFFFFF",
                colorText:            "#0C0C0C",
                colorTextSecondary:   "#6B7280",
                colorInputBackground: "#F8F7F4",
                colorInputText:       "#0C0C0C",
                colorNeutral:         "#D1D5DB",
                borderRadius:         "0.5rem",
                fontFamily:           "var(--font-geist-sans)",
                fontSize:             "14px",
              },
              elements: {
                rootBox:  "w-full",
                card:     "w-full shadow-none border-none bg-transparent !p-0",
                cardBox:  "w-full",
                header:   "!hidden",
                formButtonPrimary: "bg-amber-500 hover:bg-amber-400 !text-black font-bold transition-colors",
                footerActionLink:  "text-amber-600 hover:text-amber-700 font-medium",
                socialButtonsBlockButton: "border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 font-medium transition-colors",
              },
            }}
          />
        </div>
      </div>

    </div>
  );
}
