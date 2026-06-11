"use client";

import { useState } from "react";
import {
  IconUsersGroup, IconUserPlus, IconMail, IconShieldCheck,
  IconBan, IconRefresh, IconTrash, IconCheck, IconLoader2, IconGlobe,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Member {
  user_id:         string;
  role:            string;
  status:          string;
  display_name?:   string | null;
  last_active_at?: string | null;
}

interface TeamPanelProps {
  members:    Member[];
  seatLimit:  number;
  seatsUsed:  number;
  orgDomain?: string | null;
}

export default function TeamPanel({ members: initialMembers, seatLimit, seatsUsed, orgDomain: initialDomain }: TeamPanelProps) {
  const [members,      setMembers]      = useState<Member[]>(initialMembers);
  const [inviteInput,  setInviteInput]  = useState("");
  const [inviting,     setInviting]     = useState(false);
  const [inviteMsg,    setInviteMsg]    = useState("");
  const [loading,      setLoading]      = useState<Record<string, boolean>>({});
  const [domain,       setDomain]       = useState(initialDomain ?? "");
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainMsg,    setDomainMsg]    = useState("");

  const activeCount = members.filter((m) => m.status === "active").length;
  const available   = seatLimit - activeCount;

  async function handleInvite() {
    const emails = inviteInput
      .split(/[,\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
      .slice(0, Math.max(0, available));

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
    <div>
      {/* Seat indicator */}
      <div className="alert alert-warning d-flex align-items-center gap-2 mb-4">
        <IconShieldCheck size={16} stroke={1.5} className="shrink-0" />
        <div className="flex-fill small fw-medium">
          {activeCount} / {seatLimit} seats active
        </div>
        {available > 0 && (
          <span className="text-muted small">{available} seat{available !== 1 ? "s" : ""} available</span>
        )}
      </div>

      {/* Member list */}
      <div className="list-group list-group-flush mb-4">
        {members.map((m) => {
          const isAdmin   = m.role === "admin";
          const suspended = m.status === "suspended";
          const isPending = loading[m.user_id];
          const initial   = (m.display_name ?? m.user_id)?.[0]?.toUpperCase() ?? "?";

          return (
            <div
              key={m.user_id}
              className={cn(
                "list-group-item d-flex align-items-center gap-3",
                suspended && "opacity-50"
              )}
            >
              <span
                className={`avatar avatar-sm rounded-circle text-white fw-bold`}
                style={{
                  background: isAdmin ? "var(--tblr-primary)" : "var(--tblr-secondary)",
                  fontSize: "0.7rem",
                }}
              >
                {initial}
              </span>
              <div className="flex-fill min-w-0">
                <div className="fw-medium small text-truncate">{m.display_name ?? "—"}</div>
                <div className="text-muted text-capitalize" style={{ fontSize: "0.7rem" }}>
                  {isAdmin ? "Admin" : "Member"}
                  {suspended ? " · Suspended" : ""}
                  {m.last_active_at
                    ? ` · Last active ${new Date(m.last_active_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
                    : ""}
                </div>
              </div>

              {!isAdmin && (
                <div className="d-flex align-items-center gap-1 shrink-0">
                  {isPending ? (
                    <IconLoader2 size={14} className="text-muted animate-spin" />
                  ) : suspended ? (
                    <button
                      onClick={() => handleAction(m.user_id, "reinstate")}
                      title="Reinstate"
                      className="btn btn-ghost-success btn-icon btn-sm"
                    >
                      <IconRefresh size={14} stroke={1.5} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(m.user_id, "suspend")}
                      title="Suspend"
                      className="btn btn-ghost-warning btn-icon btn-sm"
                    >
                      <IconBan size={14} stroke={1.5} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${m.display_name ?? "this member"} from your organisation?`)) {
                        handleAction(m.user_id, "remove");
                      }
                    }}
                    title="Remove"
                    className="btn btn-ghost-danger btn-icon btn-sm"
                  >
                    <IconTrash size={14} stroke={1.5} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="list-group-item text-muted small py-3">
            <IconUsersGroup size={16} stroke={1.5} className="me-2" />
            No members yet. Invite your team below.
          </div>
        )}
      </div>

      {/* Invite */}
      {available > 0 && (
        <div className="mb-4">
          <label className="form-label text-muted small d-flex align-items-center gap-1">
            <IconUserPlus size={14} stroke={1.5} />
            Invite members
            <span className="text-muted">(comma or newline-separated emails)</span>
          </label>
          <div className="input-group mb-1">
            <span className="input-group-text">
              <IconMail size={14} stroke={1.5} />
            </span>
            <Input
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="jane@company.com, john@company.com"
              className="form-control"
              onKeyDown={(e) => e.key === "Enter" && !inviting && handleInvite()}
            />
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteInput.trim()}
              className="btn btn-primary"
            >
              {inviting
                ? <IconLoader2 size={14} stroke={1.5} className="animate-spin" />
                : <IconCheck size={14} stroke={1.5} />
              }
              <span className="ms-1">Send</span>
            </button>
          </div>
          {inviteMsg && (
            <p className={`small mb-0 ${inviteMsg.includes("sent") ? "text-success" : "text-danger"}`}>
              {inviteMsg}
            </p>
          )}
        </div>
      )}

      {/* Domain auto-join */}
      <div className="border-top pt-4">
        <label className="form-label text-muted small d-flex align-items-center gap-1 mb-1">
          <IconGlobe size={14} stroke={1.5} />
          Domain auto-join
        </label>
        <div className="form-text mb-2">
          Anyone who signs up with this email domain will automatically join your organisation as a member,
          if a seat is available. Leave blank to disable.
        </div>
        <div className="input-group mb-1">
          <span className="input-group-text small text-muted">@</span>
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value.replace(/^@/, ""))}
            placeholder="company.co.ke"
            className="form-control font-monospace"
          />
          <button
            onClick={handleSaveDomain}
            disabled={savingDomain}
            className="btn btn-outline-secondary"
          >
            {savingDomain
              ? <IconLoader2 size={14} stroke={1.5} className="animate-spin" />
              : <IconCheck size={14} stroke={1.5} />
            }
            <span className="ms-1">Save</span>
          </button>
        </div>
        {domainMsg && (
          <p className={`small mb-0 ${domainMsg === "Domain saved." ? "text-success" : "text-danger"}`}>
            {domainMsg}
          </p>
        )}
      </div>
    </div>
  );
}
