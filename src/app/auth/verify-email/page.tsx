"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HunterWordmark } from "@/components/HunterLogo";

function VerifyEmailContent() {
  const params = useSearchParams();
  const email  = params.get("email") ?? "";

  const [status,   setStatus]   = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (!email || cooldown > 0) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      if (res.ok) { setStatus("sent"); setCooldown(60); }
      else        { setStatus("error"); }
    } catch { setStatus("error"); }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center animate-fade-up">

        <div className="flex justify-center mb-8">
          <HunterWordmark size="md" />
        </div>

        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Mail className="h-7 w-7 text-amber-400" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-zinc-100 mb-2">Check your inbox</h1>
        <p className="text-sm text-zinc-400 mb-1">
          We sent a verification link to
        </p>
        {email && (
          <p className="text-sm font-semibold text-zinc-200 mb-6 break-all">{email}</p>
        )}
        <p className="text-xs text-zinc-500 mb-8 leading-relaxed">
          Click the link in the email to activate your account.
          The link expires in 24 hours. Check your spam folder if it doesn&apos;t arrive.
        </p>

        {email && (
          <Button
            onClick={resend}
            loading={status === "sending"}
            disabled={cooldown > 0 || status === "sending"}
            variant="outline"
            className="w-full mb-3 gap-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
          >
            <RefreshCw className="h-4 w-4" />
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
          </Button>
        )}

        {status === "sent" && (
          <p className="text-xs text-green-400 mb-3">Verification email resent — check your inbox.</p>
        )}
        {status === "error" && (
          <p className="text-xs text-red-400 mb-3">Could not resend. Try again shortly.</p>
        )}

        <Link href="/sign-in"
          className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
