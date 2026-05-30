"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, CheckCircle } from "lucide-react";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [pw, setPw]           = useState("");
  const [confirm, setCon]     = useState("");
  const [loading, setLo]      = useState(false);
  const [error, setErr]       = useState("");
  const [done, setDone]       = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!current)       { setErr("Enter your current password."); return; }
    if (!pw)            { setErr("Enter a new password."); return; }
    if (pw.length < 8)  { setErr("New password must be at least 8 characters."); return; }
    if (!/[A-Za-z]/.test(pw)) { setErr("Password must include at least one letter."); return; }
    if (!/[0-9]/.test(pw))    { setErr("Password must include at least one number."); return; }
    if (!confirm)       { setErr("Please confirm your new password."); return; }
    if (pw !== confirm) { setErr("Passwords do not match."); return; }
    if (pw === current) { setErr("New password must be different from your current password."); return; }
    setLo(true);
    try {
      const sb = createSupabaseBrowserClient();

      // Verify identity before allowing the change
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.email) { setErr("Session expired. Please sign in again."); return; }

      const { error: authErr } = await sb.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (authErr) { setErr("Current password is incorrect."); return; }

      const { error: updateErr } = await sb.auth.updateUser({ password: pw });
      if (updateErr) { setErr(updateErr.message); return; }

      setDone(true);
      setCurrent(""); setPw(""); setCon("");
    } catch {
      setErr("Something went wrong. Try again.");
    } finally {
      setLo(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400 py-1">
        <CheckCircle className="h-4 w-4 shrink-0" />
        Password updated successfully.
      </div>
    );
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Current password</label>
        <Input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Your current password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">New password</label>
        <Input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Min 8 characters"
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Confirm new password</label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setCon(e.target.value)}
          placeholder="Repeat new password"
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        <KeyRound className="h-3.5 w-3.5 mr-1.5" />
        Update password
      </Button>
    </form>
  );
}
