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
    <div className="min-h-screen flex" style={{ background: "#F8F7F4" }}>

      {/* ── Left panel — visible at lg+ ── */}
      <div className="hidden lg:flex lg:w-[460px] xl:w-[500px] shrink-0 flex-col justify-between px-10 py-10 relative overflow-hidden"
        style={{ background: "#F2F0EB", borderRight: "1px solid #E5E1D8" }}>

        {/* Amber top-left accent */}
        <div className="absolute top-0 left-0 w-px h-full pointer-events-none"
          style={{ background: "linear-gradient(to bottom, #F59E0B 0%, transparent 60%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <HunterWordmark size="sm" onLight />
        </div>

        {/* Middle: headline + demo + bullets */}
        <div className="relative z-10 space-y-7">
          <div>
            <h1 className="text-4xl font-black leading-tight" style={{ color: "#0C0C0C" }}>
              Find the leads<br />
              <span className="text-brand-gradient">nobody else</span><br />
              is calling.
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "#6B6B6B" }}>
              AI-powered B2B lead intelligence built for the Kenyan market.
            </p>
          </div>

          <HunterDemo />

          <ul className="space-y-2.5">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm" style={{ color: "#555" }}>
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <CheckCircle2 className="h-2.5 w-2.5" style={{ color: "#F59E0B" }} />
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: "#AAA" }}>Dullu Digital · 4unter.dullugroup.co.ke</p>
          <p className="text-xs mt-0.5" style={{ color: "#AAA" }}>Free 7-day trial · Kenya DPA 2019 compliant</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto"
        style={{ background: "#F8F7F4" }}>

        <div className="w-full max-w-[380px]">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <HunterWordmark size="sm" onLight />
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-black" style={{ color: "#0C0C0C" }}>Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: "#6B6B6B" }}>Sign in to your 4unter account.</p>
          </div>

          {/* Clerk form — card stripped via globals.css .cl-card override */}
          <SignIn
            appearance={{
              variables: {
                colorPrimary:         "#F59E0B",
                colorBackground:      "#F8F7F4",
                colorText:            "#0C0C0C",
                colorTextSecondary:   "#6B7280",
                colorInputBackground: "#FFFFFF",
                colorInputText:       "#0C0C0C",
                colorNeutral:         "#D1D5DB",
                borderRadius:         "0.5rem",
                fontFamily:           "var(--font-geist-sans)",
                fontSize:             "14px",
              },
              elements: {
                socialButtonsBlock:      { display: "none" },
                socialButtonsIconButton: { display: "none" },
                dividerRow:              { display: "none" },
                dividerText:             { display: "none" },
              },
            }}
          />
        </div>
      </div>

    </div>
  );
}
