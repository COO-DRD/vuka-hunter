"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconKey, IconCircleCheck } from "@tabler/icons-react";

export default function ChangePasswordForm() {
  const { user } = useUser();
  const [current, setCurrent] = useState("");
  const [pw, setPw]           = useState("");
  const [confirm, setCon]     = useState("");
  const [loading, setLo]      = useState(false);
  const [error, setErr]       = useState("");
  const [done, setDone]       = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!current)                         { setErr("Enter your current password."); return; }
    if (!pw)                              { setErr("Enter a new password."); return; }
    if (pw.length < 8)                    { setErr("New password must be at least 8 characters."); return; }
    if (!/[A-Za-z]/.test(pw))            { setErr("Password must include at least one letter."); return; }
    if (!/[0-9]/.test(pw))               { setErr("Password must include at least one number."); return; }
    if (!confirm)                         { setErr("Please confirm your new password."); return; }
    if (pw !== confirm)                   { setErr("Passwords do not match."); return; }
    if (pw === current)                   { setErr("New password must be different from your current password."); return; }
    setLo(true);
    try {
      if (!user) { setErr("Session expired. Please sign in again."); return; }
      await user.updatePassword({ currentPassword: current, newPassword: pw });
      setDone(true);
      setCurrent(""); setPw(""); setCon("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      if (msg.toLowerCase().includes("current") || msg.toLowerCase().includes("incorrect") || msg.toLowerCase().includes("invalid")) {
        setErr("Current password is incorrect.");
      } else {
        setErr(msg);
      }
    } finally {
      setLo(false);
    }
  }

  if (done) {
    return (
      <div className="d-flex align-items-center gap-2 text-success small py-1">
        <IconCircleCheck size={16} stroke={1.5} />
        Password updated successfully.
      </div>
    );
  }

  return (
    <form onSubmit={handle}>
      <div className="mb-3">
        <label className="form-label text-muted small">Current password</label>
        <Input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Your current password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label text-muted small">New password</label>
        <Input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Min 8 characters"
          autoComplete="new-password"
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label text-muted small">Confirm new password</label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setCon(e.target.value)}
          placeholder="Repeat new password"
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="text-danger small mb-3">{error}</p>}
      <Button type="submit" loading={loading}>
        <IconKey size={14} stroke={1.5} className="me-2" />
        Update password
      </Button>
    </form>
  );
}
