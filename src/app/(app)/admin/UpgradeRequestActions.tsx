"use client";

import { useState } from "react";
import { IconCheck, IconX, IconLoader2 } from "@tabler/icons-react";

interface Props {
  id: string;
  initialStatus: string;
}

export function UpgradeRequestActions({ id, initialStatus }: Props) {
  const [status,  setStatus]  = useState(initialStatus);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  if (status !== "pending") {
    return (
      <span className={`badge ${status === "approved" ? "bg-success-lt text-success" : "bg-danger-lt text-danger"}`}>
        {status}
      </span>
    );
  }

  async function act(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/upgrade-requests", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, action }),
      });
      if (res.ok) setStatus(action === "approve" ? "approved" : "rejected");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="d-flex align-items-center gap-1">
      <button
        onClick={() => act("approve")}
        disabled={!!loading}
        className="btn btn-ghost-success btn-sm gap-1"
      >
        {loading === "approve" ? <IconLoader2 size={12} className="animate-spin" /> : <IconCheck size={12} stroke={2} />}
        Approve
      </button>
      <button
        onClick={() => act("reject")}
        disabled={!!loading}
        className="btn btn-ghost-danger btn-sm gap-1"
      >
        {loading === "reject" ? <IconLoader2 size={12} className="animate-spin" /> : <IconX size={12} stroke={2} />}
        Reject
      </button>
    </div>
  );
}
