"use client";

import { useState, useTransition } from "react";
import { MODE_OPTIONS, type EnrichmentMode } from "@/lib/enrichmentModes";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  current: string;
}

export default function EnrichmentModeSelector({ current }: Props) {
  const [selected, setSelected] = useState<string>(current || "general");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function select(key: EnrichmentMode) {
    if (key === selected) return;
    setSelected(key);
    setSaved(false);
    startTransition(async () => {
      await fetch("/api/settings/mode", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mode: key }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MODE_OPTIONS.map((m) => {
          const isActive = selected === m.key;
          return (
            <button
              key={m.key}
              onClick={() => select(m.key as EnrichmentMode)}
              disabled={isPending}
              className={cn(
                "relative flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
                isActive
                  ? "border-red-600/60 bg-red-600/10 text-zinc-100"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              )}
            >
              {isActive && (
                <Check className="absolute right-3 top-3 h-3.5 w-3.5 text-red-400" />
              )}
              <span className="text-sm font-semibold leading-tight">{m.label}</span>
              <span className="text-xs leading-snug opacity-70">{m.description}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500 h-4">
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {!isPending && saved && <span className="text-green-400">Saved</span>}
        {!isPending && !saved && (
          <span>This shapes how leads are scored and what outreach is generated.</span>
        )}
      </div>
    </div>
  );
}
