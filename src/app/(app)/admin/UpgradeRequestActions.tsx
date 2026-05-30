"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";

interface Props {
  id: string;
  initialStatus: string;
}

export function UpgradeRequestActions({ id, initialStatus }: Props) {
  const [status,  setStatus]  = useState(initialStatus);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  if (status !== "pending") {
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        status === "approved"
          ? "bg-green-500/15 text-green-400"
          : "bg-red-500/15 text-red-400"
      }`}>
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
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => act("approve")}
        disabled={!!loading}
        className="flex items-center gap-1 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-700/40 px-2.5 py-1 text-[10px] font-semibold text-green-400 transition-colors disabled:opacity-50"
      >
        {loading === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Approve
      </button>
      <button
        onClick={() => act("reject")}
        disabled={!!loading}
        className="flex items-center gap-1 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-700/30 px-2.5 py-1 text-[10px] font-semibold text-red-400 transition-colors disabled:opacity-50"
      >
        {loading === "reject" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        Reject
      </button>
    </div>
  );
}
