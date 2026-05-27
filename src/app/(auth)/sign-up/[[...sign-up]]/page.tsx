"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, Eye, EyeOff, User } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

export default function SignUpPage() {
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [termsAccepted, setTerms]     = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) { setError("You must accept the Terms of Service to continue."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, termsAccepted: true }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong."); return; }
      window.location.assign("/sign-in?registered=1");
    } catch {
      setError("Something went wrong. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!termsAccepted) { setError("You must accept the Terms of Service to continue."); return; }
    setGoogleLoading(true);
    setError("");
    try {
      const sb = createSupabaseBrowserClient();
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) setError(error.message);
    } catch {
      setError("Google sign-in failed. Try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 mb-4">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Hunter</h1>
          <p className="text-sm text-zinc-400 mt-1">Create your account</p>
        </div>

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          loading={googleLoading}
          className="w-full mb-4 gap-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
        >
          {!googleLoading && <GoogleIcon />}
          Continue with Google
        </Button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-zinc-950 px-2 text-zinc-600">or sign up with email</span>
          </div>
        </div>

        <form onSubmit={handleSignUp} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoFocus
                autoComplete="name"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Password</label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
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

          {/* Terms acceptance */}
          <label className="flex items-start gap-2.5 cursor-pointer group mt-1">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => { setTerms(e.target.checked); setError(""); }}
                className="sr-only peer"
              />
              <div className="h-4 w-4 rounded border border-zinc-600 bg-zinc-900 peer-checked:bg-red-600 peer-checked:border-red-600 transition-colors flex items-center justify-center">
                {termsAccepted && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
              I have read and agree to the{" "}
              <Link href="/terms" target="_blank" className="text-red-400 hover:text-red-300 underline underline-offset-2">
                Terms of Service &amp; Usage Policy
              </Link>
            </span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button
            type="submit"
            loading={loading}
            disabled={!termsAccepted}
            className="w-full mt-1"
          >
            Create account
          </Button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-5">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-red-400 hover:text-red-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
