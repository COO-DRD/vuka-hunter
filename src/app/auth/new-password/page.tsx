"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HunterWordmark } from "@/components/HunterLogo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, KeyRound, CheckCircle } from "lucide-react";

export default function NewPasswordPage() {
  const router = useRouter();
  const [pw,      setPw]      = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!pw)                     { setError("Enter your new password.");                          return; }
    if (pw.length < 8)           { setError("Password must be at least 8 characters.");           return; }
    if (!/[A-Za-z]/.test(pw))   { setError("Password must include at least one letter.");         return; }
    if (!/[0-9]/.test(pw))      { setError("Password must include at least one number.");         return; }
    if (!confirm)                { setError("Please confirm your password.");                      return; }
    if (pw !== confirm)          { setError("Passwords don't match.");                             return; }

    setLoading(true);
    try {
      const sb = createSupabaseBrowserClient();

      // Verify we actually have a live session from the recovery link
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        setError("Your reset link has expired. Please request a new one from the sign-in page.");
        return;
      }

      const { error: updateErr } = await sb.auth.updateUser({ password: pw });
      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      setDone(true);
      // Brief pause so the success state is visible, then go to dashboard
      setTimeout(() => router.replace("/dashboard"), 1800);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex justify-center mb-8">
          <HunterWordmark size="md" />
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-600/20 border border-green-600/40">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100">Password updated</h2>
            <p className="text-sm text-zinc-400">Taking you to your dashboard…</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-zinc-100 mb-1">Set a new password</h2>
            <p className="text-sm text-zinc-500 mb-6">
              You&apos;re here via a password reset link. Enter your new password below — no need to enter your old one.
            </p>

            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  New password <span className="text-zinc-600">(8+ chars, letter + number)</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setError(""); }}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showPw ? "Hide" : "Show"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Confirm password</label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <Button type="submit" loading={loading} className="w-full gap-2">
                <KeyRound className="h-4 w-4" />
                Set new password
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
