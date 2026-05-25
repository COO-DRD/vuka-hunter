"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

function friendlyError(msg: string): string {
  if (msg.includes("Invalid login") || msg.includes("invalid credentials") || msg.includes("Email not confirmed"))
    return "Incorrect email or password. Check your details and try again.";
  if (msg.includes("Email not confirmed"))
    return "Your email isn't confirmed yet — check your inbox for the activation link.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Wait a moment and try again.";
  return msg || "Something went wrong. Check your connection.";
}

type Mode = "signin" | "forgot" | "forgot_sent";

export default function SignInPage() {
  const params     = useSearchParams();
  const [mode, setMode]         = useState<Mode>("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const urlError = params.get("error");
    if (urlError === "link_expired") setError("That confirmation link has expired. Request a new one below.");
  }, [params]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sb = createSupabaseBrowserClient();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { setError(friendlyError(error.message)); return; }
      // Hard redirect — guarantees the browser sends the fresh session cookie
      // with the next request so middleware sees the session immediately.
      window.location.assign("/dashboard");
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sb = createSupabaseBrowserClient();
      await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });
      setMode("forgot_sent");
    } catch {
      setError("Couldn't send reset email. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "forgot_sent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-600/20 border border-green-600/40 mb-5">
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 mb-2">Check your email</h2>
          <p className="text-sm text-zinc-400 mb-6">
            We sent a password reset link to{" "}
            <span className="text-zinc-200 font-medium">{email}</span>.
          </p>
          <button
            onClick={() => { setMode("signin"); setError(""); }}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-full max-w-sm px-4">
          <div className="text-center mb-8">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 mb-4">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">Reset password</h1>
            <p className="text-sm text-zinc-400 mt-1">We&apos;ll email you a reset link</p>
          </div>

          <form onSubmit={handleForgot} className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" loading={loading} className="w-full mt-1">
              Send reset link
            </Button>
          </form>

          <button
            onClick={() => { setMode("signin"); setError(""); }}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mt-5 mx-auto transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 mb-4">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Hunter</h1>
          <p className="text-sm text-zinc-400 mt-1">AI lead scraper &amp; outreach</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-400">Password</label>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full mt-1">
            Sign in
          </Button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-5">
          No account?{" "}
          <Link href="/sign-up" className="text-red-400 hover:text-red-300">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
