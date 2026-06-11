"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconTrash, IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";

type Phase = "idle" | "confirm" | "done";

export default function ClearLeadsButton() {
  const [phase, setPhase]       = useState<Phase>("idle");
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
      <div className="d-flex align-items-center gap-2 text-success small">
        <IconCircleCheck size={16} stroke={1.5} />
        {summary} Your workspace is clean — ready to start fresh.
      </div>
    );
  }

  if (phase === "confirm") {
    return (
      <div className="alert alert-danger">
        <div className="d-flex align-items-start gap-2 mb-3">
          <IconAlertTriangle size={16} stroke={1.5} className="shrink-0 mt-1" />
          <p className="mb-0 small">
            This will permanently delete <strong>all your leads and scrape history</strong> and reset your
            credit counter to zero. There is no undo.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="destructive" onClick={handleClear} loading={deleting}>
            Yes, delete everything
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPhase("idle")}>
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
      className="gap-2 text-danger border-danger"
    >
      <IconTrash size={14} stroke={1.5} />
      Reset all leads
    </Button>
  );
}
