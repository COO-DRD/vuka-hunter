"use client";

import { useState } from "react";
import {
  Users, UserPlus, Mail, Shield, Ban, RefreshCw,
  Trash2, Check, X, Loader2, Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Member {
  user_id:       string;
  role:          string;
  status:        string;
  display_name?: string | null;
  last_active_at?: string | null;
}

interface TeamPanelProps {
  members:    Member[];
  seatLimit:  number;
  seatsUsed:  number;
  orgDomain?: string | null;
}

export default function TeamPanel({ members: initialMembers, seatLimit, seatsUsed, orgDomain: initialDomain }: TeamPanelProps) {
  const [members,    setMembers]    = useState<Member[]>(initialMembers);
  const [inviteInput, setInviteInput] = useState("");
  const [inviting,   setInviting]   = useState(false);
  const [inviteMsg,  setInviteMsg]  = useState("");
  const [loading,    setLoading]    = useState<Record<string, boolean>>({});
  const [domain,     setDomain]     = useState(initialDomain ?? "");
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainMsg,  setDomainMsg]  = useState("");

  const activeCount = members.filter((m) => m.status === "active").length;
  const available   = seatLimit - activeCount;

  async function handleInvite() {
    const emails = inviteInput
      .split(/[,\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
      .slice(0, Math.max(0, available - 0));

    if (!emails.length) { setInviteMsg("Enter at least one valid email address."); return; }
    if (available <= 0) { setInviteMsg("No seats available."); return; }

    setInviting(true);
    setInviteMsg("");
    try {
      const res  = await fetch("/api/auth/invite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ emails }),
      });
      const json = await res.json();
      if (!res.ok) { setInviteMsg(json.error ?? "Invite failed."); return; }
      const sent = (json.results ?? []).filter((r: { status: string }) => r.status === "invited").length;
      setInviteMsg(`${sent} invite${sent !== 1 ? "s" : ""} sent.`);
      setInviteInput("");
    } catch {
      setInviteMsg("Something went wrong. Check your connection.");
    } finally {
      setInviting(false);
    }
  }

  async function handleAction(userId: string, action: "suspend" | "reinstate" | "remove") {
    setLoading((l) => ({ ...l, [userId]: true }));
    try {
      if (action === "remove") {
        const res = await fetch(`/api/team/members/${userId}`, { method: "DELETE" });
        if (res.ok) setMembers((m) => m.filter((x) => x.user_id !== userId));
      } else {
        const res  = await fetch(`/api/team/members/${userId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action }),
        });
        const json = await res.json();
        if (res.ok) {
          setMembers((m) =>
            m.map((x) => x.user_id === userId ? { ...x, status: json.status } : x)
          );
        }
      }
    } finally {
      setLoading((l) => ({ ...l, [userId]: false }));
    }
  }

  async function handleSaveDomain() {
    setDomainMsg("");
    const trimmed = domain.trim().toLowerCase();
    if (trimmed && !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(trimmed)) {
      setDomainMsg("Enter a valid domain (e.g. company.co.ke) or leave blank to disable.");
      return;
    }
    setSavingDomain(true);
    try {
      const res  = await fetch("/api/settings/org-domain", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgDomain: domain.trim().toLowerCase() }),
      });
      const json = await res.json();
      setDomainMsg(res.ok ? "Domain saved." : (json.error ?? "Save failed."));
    } finally {
      setSavingDomain(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Seat indicator */}
      <div className="rounded-lg border border-amber-900/30 bg-amber-950/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-300 font-medium">
            {activeCount} / {seatLimit} seats active
          </span>
        </div>
        {available > 0 && (
          <span className="text-xs text-zinc-500">{available} seat{available !== 1 ? "s" : ""} available</span>
        )}
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {members.map((m) => {
          const isAdmin    = m.role === "admin";
          const suspended  = m.status === "suspended";
          const isPending  = loading[m.user_id];
          const initial    = (m.display_name ?? m.user_id)?.[0]?.toUpperCase() ?? "?";

          return (
            <div key={m.user_id} className={cn(
              "flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors",
              suspended
                ? "border-zinc-800/50 bg-zinc-900/20 opacity-60"
                : "border-zinc-800 bg-zinc-900/40"
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isAdmin ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-zinc-800 text-zinc-300"
                )}>
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">{m.display_name ?? "—"}</p>
                  <p className="text-[10px] text-zinc-600 capitalize">
                    {isAdmin ? "Admin" : "Member"}
                    {suspended ? " · Suspended" : ""}
                    {m.last_active_at
                      ? ` · Last active ${new Date(m.last_active_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
                      : ""}
                  </p>
                </div>
              </div>

              {!isAdmin && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 text-zinc-500 animate-spin" />
                  ) : suspended ? (
                    <button
                      onClick={() => handleAction(m.user_id, "reinstate")}
                      title="Reinstate"
                      className="rounded p-1.5 text-zinc-500 hover:text-green-400 hover:bg-zinc-800 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(m.user_id, "suspend")}
                      title="Suspend"
                      className="rounded p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${m.display_name ?? "this member"} from your organisation?`)) {
                        handleAction(m.user_id, "remove");
                      }
                    }}
                    title="Remove"
                    className="rounded p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <p className="text-xs text-zinc-600 py-2">No members yet. Invite your team below.</p>
        )}
      </div>

      {/* Invite */}
      {available > 0 && (
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Invite members
            <span className="text-zinc-600">(comma or newline-separated emails)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              <Input
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="jane@company.com, john@company.com"
                className="pl-9 text-xs"
                onKeyDown={(e) => e.key === "Enter" && !inviting && handleInvite()}
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteInput.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-3 py-2 text-xs font-medium text-white transition-colors"
            >
              {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Send
            </button>
          </div>
          {inviteMsg && (
            <p className={cn("text-xs", inviteMsg.includes("sent") ? "text-green-400" : "text-red-400")}>
              {inviteMsg}
            </p>
          )}
        </div>
      )}

      {/* Domain auto-join */}
      <div className="border-t border-zinc-800 pt-5 space-y-2">
        <label className="text-xs text-zinc-400 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" /> Domain auto-join
        </label>
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Anyone who signs up with this email domain will automatically join your organisation as a member, if a seat is available.
          Leave blank to disable.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 pointer-events-none">@</span>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value.replace(/^@/, ""))}
              placeholder="company.co.ke"
              className="pl-7 text-xs font-mono"
            />
          </div>
          <button
            onClick={handleSaveDomain}
            disabled={savingDomain}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors"
          >
            {savingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
        {domainMsg && (
          <p className={cn("text-xs", domainMsg === "Domain saved." ? "text-green-400" : "text-red-400")}>
            {domainMsg}
          </p>
        )}
      </div>
    </div>
  );
}
