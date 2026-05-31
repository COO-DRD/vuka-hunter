"use client";

import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { HunterWordmark } from "@/components/HunterLogo";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 auth-grid-bg"
      style={{ background: "#0d1117" }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div
          className="h-[500px] w-[700px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #F59E0B 0%, transparent 70%)", filter: "blur(80px)" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="mb-8">
          <HunterWordmark size="md" />
        </Link>

        {/* Headline */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-black text-zinc-100">Start hunting</h1>
          <p className="text-sm text-zinc-500 mt-1">7-day free trial · No credit card needed</p>
        </div>

        <SignUp
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
              spacingUnit:          "16px",
            },
            elements: {
              rootBox:              "w-full",
              card:                 "w-full shadow-2xl shadow-black/60 border border-[#30363d] !rounded-xl",
              cardBox:              "w-full",
              headerTitle:          "!hidden",
              headerSubtitle:       "!hidden",
              header:               "!hidden",
              socialButtonsBlockButton:
                "border-[#30363d] hover:border-[#8b949e] hover:bg-white/5 transition-colors text-zinc-300 font-medium",
              socialButtonsBlockButtonText: "font-medium",
              dividerLine:          "bg-[#30363d]",
              dividerText:          "text-zinc-600 text-xs",
              formFieldLabel:       "text-zinc-400 text-xs font-medium",
              formFieldInput:
                "bg-[#0d1117] border-[#30363d] text-zinc-100 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 rounded-lg",
              formButtonPrimary:
                "bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors rounded-lg",
              footerActionLink:     "text-amber-400 hover:text-amber-300 font-medium",
              footerActionText:     "text-zinc-500",
              identityPreviewText:  "text-zinc-300",
              identityPreviewEditButton: "text-amber-400 hover:text-amber-300",
              formResendCodeLink:   "text-amber-400 hover:text-amber-300",
              otpCodeFieldInput:
                "border-[#30363d] bg-[#0d1117] text-zinc-100 focus:border-amber-500",
              alertText:            "text-zinc-300",
              formFieldErrorText:   "text-red-400",
            },
          }}
        />
      </div>
    </div>
  );
}
