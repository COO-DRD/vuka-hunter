"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowLeft, CheckCircle, UserCheck, Target, Sparkles, BarChart3 } from "lucide-react";
import Link from "next/link";
import { HunterWordmark, HunterMark } from "@/components/HunterLogo";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function friendlyError(msg: string): string {
  if (msg.includes("Invalid login") || msg.includes("invalid credentials"))
    return "Incorrect email or password.";
  if (msg.includes("Email not confirmed"))
    return "Your email isn't confirmed yet — check your inbox.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Wait a moment and try again.";
  return msg || "Something went wrong. Check your connection.";
}

const FEATURES = [
  { icon: Target,    text: "Discover leads across 36 Kenyan B2B verticals" },
  { icon: Sparkles,  text: "Enrich with website, contact, and tech intelligence" },
  { icon: BarChart3, text: "Score every lead with Hunter Intelligence in seconds" },
];

type Mode = "signin" | "forgot" | "forgot_sent";

export default function SignInPage() {
  const params = useSearchParams();
  const [mode, setMode]             = useState<Mode>("signin");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (params.get("error") === "link_expired") setError("That confirmation link expired. Request a new one below.");
    if (params.get("registered") === "1") setRegistered(true);
  }, [params]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    // Validate before any auth call
    if (!email.trim()) { setError("Enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Enter your password."); return; }
    setLoading(true); setError("");
    try {
      const sb = createSupabaseBrowserClient();
      const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) { setError(friendlyError(error.message)); return; }
      window.location.assign("/dashboard");
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setGoogleLoading(true); setError("");
    try {
      const sb = createSupabaseBrowserClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${siteUrl}/auth/callback`, queryParams: { access_type: "offline", prompt: "consent" } },
      });
      if (error) setError(error.message);
    } catch { setError("Google sign-in failed. Try again."); }
    finally { setGoogleLoading(false); }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    setLoading(true); setError("");
    try {
      const sb = createSupabaseBrowserClient();
      await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=/settings`,
      });
      setMode("forgot_sent");
    } catch { setError("Couldn't send reset email. Check your connection."); }
    finally { setLoading(false); }
  }

  const formContent = (() => {
    if (mode === "forgot_sent") return (
      <div className="text-center animate-fade-up">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-600/20 border border-green-600/40 mb-4">
          <CheckCircle className="h-5 w-5 text-green-400" />
        </div>
        <h2 className="text-lg font-bold text-zinc-100 mb-2">Check your email</h2>
        <p className="text-sm text-zinc-400 mb-5">
          Reset link sent to <span className="text-zinc-200 font-medium">{email}</span>.
        </p>
        <button onClick={() => { setMode("signin"); setError(""); }}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </button>
      </div>
    );

    if (mode === "forgot") return (
      <div className="animate-fade-up">
        <button onClick={() => { setMode("signin"); setError(""); }}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <h2 className="text-xl font-bold text-zinc-100 mb-1">Reset password</h2>
        <p className="text-sm text-zinc-500 mb-6">We&apos;ll send a reset link to your email.</p>
        <form onSubmit={handleForgot} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus autoComplete="email" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
        </form>
      </div>
    );

    return (
      <div className="animate-fade-up">
        <h2 className="text-xl font-bold text-zinc-100 mb-1">Welcome back</h2>
        <p className="text-sm text-zinc-500 mb-6">Sign in to your 4unter account.</p>

        {registered && (
          <div className="flex items-center gap-2 rounded-lg border border-green-600/30 bg-green-600/10 px-3 py-2.5 mb-4 text-sm text-green-400">
            <UserCheck className="h-4 w-4 shrink-0" /> Account created — sign in below.
          </div>
        )}

        <Button type="button" variant="outline" onClick={handleGoogle} loading={googleLoading}
          className="w-full mb-4 gap-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 h-10">
          {!googleLoading && <GoogleIcon />} Continue with Google
        </Button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-zinc-950 px-2 text-zinc-600">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSignIn} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus autoComplete="email" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-400">Password</label>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password" className="pr-10" />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1} aria-label={showPw ? "Hide" : "Show"}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full mt-1">Sign in</Button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-5">
          No account?{" "}
          <Link href="/sign-up" className="text-amber-400 hover:text-amber-300 font-medium">Create one free</Link>
        </p>
        <p className="text-center text-xs text-zinc-700 mt-2">
          <Link href="/terms" className="hover:text-zinc-500 transition-colors">Terms of Service</Link>
        </p>
      </div>
    );
  })();

  return (
    <div className="min-h-screen flex">
      {/* ── Brand panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col auth-grid-bg relative overflow-hidden">
        {/* Gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-950/20 pointer-events-none" />
        {/* Large watermark icon */}
        <div className="absolute -bottom-16 -right-16 opacity-[0.04] text-white">
          <HunterMark className="h-80 w-80" />
        </div>

        <div className="relative flex flex-col h-full px-10 py-10">
          <HunterWordmark size="md" />

          <div className="flex-1 flex flex-col justify-center">
            <p className="text-3xl font-bold text-zinc-100 leading-tight mb-3">
              Find the leads<br />
              <span className="text-brand-gradient">nobody else</span><br />
              is calling.
            </p>
            <p className="text-sm text-zinc-500 mb-10 leading-relaxed">
              AI-powered B2B lead intelligence built for the Kenyan market.
            </p>

            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <div key={text}
                  className={`flex items-center gap-3 animate-fade-up delay-${(i + 1) * 75}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600/10 border border-amber-600/20">
                    <Icon className="h-4 w-4 text-amber-400" />
                  </div>
                  <span className="text-sm text-zinc-400">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-zinc-700 mt-auto">
            Dullu Digital · hunter.dullugroup.co.ke
          </p>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-zinc-950 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <HunterWordmark size="md" />
          </div>
          {formContent}
        </div>
      </div>
    </div>
  );
}
