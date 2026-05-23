"use client";
import { useState } from "react";
import { STAGES } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

export default function StageSelector({ leadId, currentStage }: { leadId: string; currentStage: string }) {
  const [stage, setStage]   = useState(currentStage);
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);

  const current = STAGES.find((s) => s.value === stage) ?? STAGES[0];

  async function changeStage(newStage: string) {
    setOpen(false);
    if (newStage === stage) return;
    setSaving(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setSaving(false);
    setStage(newStage);
    toast.success(`Stage → ${STAGES.find((s) => s.value === newStage)?.label}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={saving}
        className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        <span className={`h-2 w-2 rounded-full ${current.color}`} />
        {current.label}
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-36 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
          {STAGES.map((s) => (
            <button
              key={s.value}
              onClick={() => changeStage(s.value)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-800 transition-colors ${s.value === stage ? "text-zinc-100" : "text-zinc-400"}`}
            >
              <span className={`h-2 w-2 rounded-full ${s.color}`} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
