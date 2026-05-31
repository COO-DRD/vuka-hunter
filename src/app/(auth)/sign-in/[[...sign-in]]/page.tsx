"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { HunterWordmark } from "@/components/HunterLogo";
import { HunterDemo } from "@/components/HunterDemo";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const BULLETS = [
  "Discover leads across 36 Kenyan B2B verticals",
  "Enrich with website, contact, and tech intelligence",
  "AI scores every lead and surfaces the exact pain signal to open with",
];

export default function SignInPage() {
  return (
    <div className="min-h-screen flex" style={{ background: "#0d1117" }}>

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col justify-between px-10 py-10 relative overflow-hidden"
        style={{ background: "#0d1117", borderRight: "1px solid #30363d" }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, #2a2a2e 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Amber glow */}
        <div
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)", filter: "blur(40px)" }}
        />
        {/* Large watermark "4" */}
        <div
          className="absolute bottom-0 left-0 select-none pointer-events-none"
          style={{ fontSize: 320, fontWeight: 900, lineHeight: 1, color: "rgba(245,158,11,0.04)", letterSpacing: "-0.05em" }}
          aria-hidden
        >
          4
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <HunterWordmark size="sm" />
        </div>

        {/* Headline + demo */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-black leading-tight text-zinc-100">
              Find the leads<br />
              <span className="text-brand-gradient">nobody else</span><br />
              is calling.
            </h1>
            <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
              AI-powered B2B lead intelligence built for the Kenyan market.
            </p>
          </div>

          {/* Animated demo */}
          <HunterDemo />

          {/* Bullets */}
          <ul className="space-y-2.5">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-zinc-400">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/25">
                  <CheckCircle2 className="h-2.5 w-2.5 text-amber-400" />
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-zinc-700">
            Dullu Digital · 4unter.dullugroup.co.ke
          </p>
          <p className="text-xs text-zinc-700 mt-0.5">Free Trial — 7 days</p>
          <p className="text-xs text-zinc-700 mt-0.5">
            For pros: 200 leads ready, 0 taken. Credit card not needed.<br />
            Kenya DPA 2019 compliant — your data stays private.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <HunterWordmark size="sm" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-zinc-100">Welcome back</h2>
            <p className="text-sm text-zinc-500 mt-1">Sign in to your 4unter account.</p>
          </div>

          <SignIn
            appearance={{
              baseTheme: dark,
              variables: {
                colorPrimary:         "#F59E0B",
                colorBackground:      "#161b22",
                colorText:            "#e6edf3",
                colorTextSecondary:   "#8b949e",
                colorInputBackground: "#0d1117",
                colorInputText:       "#e6edf3",
                colorNeutral:         "#30363d",
                borderRadius:         "0.5rem",
                fontFamily:           "var(--font-geist-sans)",
                fontSize:             "14px",
              },
              elements: {
                rootBox:                   "w-full",
                card:                      "w-full bg-transparent shadow-none border-none !p-0",
                cardBox:                   "w-full",
                header:                    "!hidden",
                socialButtonsBlockButton:
                  "border border-[#30363d] hover:border-[#8b949e] hover:bg-white/5 transition-colors text-zinc-300 font-medium rounded-lg",
                socialButtonsBlockButtonText: "font-medium text-sm",
                dividerLine:               "bg-[#30363d]",
                dividerText:               "text-zinc-600 text-xs",
                formFieldLabel:            "text-zinc-400 text-xs font-medium",
                formFieldInput:
                  "bg-[#0d1117] border-[#30363d] text-zinc-100 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 rounded-lg",
                formButtonPrimary:
                  "bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors rounded-lg",
                footerActionLink:          "text-amber-400 hover:text-amber-300 font-medium",
                footerActionText:          "text-zinc-500 text-sm",
                identityPreviewText:       "text-zinc-300",
                identityPreviewEditButton: "text-amber-400",
                formResendCodeLink:        "text-amber-400 hover:text-amber-300",
                otpCodeFieldInput:
                  "border-[#30363d] bg-[#0d1117] text-zinc-100 focus:border-amber-500 rounded-lg",
                alertText:                 "text-zinc-300 text-sm",
                formFieldErrorText:        "text-red-400 text-xs",
                formFieldSuccessText:      "text-green-400 text-xs",
              },
            }}
          />
        </div>
      </div>

    </div>
  );
}
