"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sb = createSupabaseBrowserClient();
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) { setError(error.message); return; }
      if (data.session) {
        window.location.assign("/dashboard");
      } else {
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center px-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 mb-4">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 mb-2">Check your email</h2>
          <p className="text-sm text-zinc-400">We sent a confirmation link to <strong className="text-zinc-200">{email}</strong>.</p>
          <p className="text-sm text-zinc-500 mt-1">Click it to activate your account, then <Link href="/sign-in" className="text-red-400 hover:underline">sign in</Link>.</p>
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
          <p className="text-sm text-zinc-400 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full mt-1">Create account</Button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-5">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-red-400 hover:text-red-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
