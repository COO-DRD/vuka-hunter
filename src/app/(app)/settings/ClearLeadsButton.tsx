"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, CheckCircle } from "lucide-react";

type Phase = "idle" | "confirm" | "done";

export default function ClearLeadsButton() {
  const [phase, setPhase]     = useState<Phase>("idle");
  const [deleting, setDeleting] = useState(false);
  const [summary, setSummary]   = useState("");

  async function handleClear() {
    setDeleting(true);
    try {
      const res  = await fetch("/api/leads/clear", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setSummary(`${json.leadsDeleted} lead${json.leadsDeleted !== 1 ? "s" : ""} deleted.`);
      setPhase("done");
    } catch (err) {
      setSummary(String(err));
      setPhase("idle");
    } finally {
      setDeleting(false);
    }
  }

  if (phase === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <CheckCircle className="h-4 w-4 shrink-0" />
        {summary} Your workspace is clean — ready to start fresh.
      </div>
    );
  }

  if (phase === "confirm") {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/20 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            This will permanently delete <strong>all your leads and scrape history</strong> and reset your credit counter to zero. There is no undo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleClear}
            loading={deleting}
            className="bg-red-600 hover:bg-red-500 text-white text-xs"
          >
            Yes, delete everything
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPhase("idle")}
            className="text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setPhase("confirm")}
      className="gap-2 border-red-800 text-red-400 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700 text-xs"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Reset all leads
    </Button>
  );
}
