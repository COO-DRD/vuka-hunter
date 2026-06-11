"use client";

import { useState, useTransition } from "react";
import { MODE_OPTIONS, type EnrichmentMode } from "@/lib/enrichmentModes";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
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
      <div className="row g-2">
        {MODE_OPTIONS.map((m) => {
          const isActive = selected === m.key;
          return (
            <div key={m.key} className="col-12 col-sm-6">
              <button
                onClick={() => select(m.key as EnrichmentMode)}
                disabled={isPending}
                className={cn(
                  "w-100 text-start d-flex flex-column gap-1 rounded border px-3 py-3 transition-colors",
                  isActive
                    ? "border-primary bg-yellow-lt"
                    : "border hover:border-primary"
                )}
                style={{ background: isActive ? "var(--brand-dim)" : undefined }}
              >
                <div className="d-flex align-items-center justify-content-between w-100">
                  <span className="fw-semibold small">{m.label}</span>
                  {isActive && <IconCheck size={14} stroke={2} className="text-primary" />}
                </div>
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>{m.description}</span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-2 small text-muted d-flex align-items-center gap-2" style={{ minHeight: 20 }}>
        {isPending && <IconLoader2 size={12} className="animate-spin" />}
        {!isPending && saved && <span className="text-success">Saved</span>}
        {!isPending && !saved && <span>This shapes how leads are scored and what outreach is generated.</span>}
      </div>
    </div>
  );
}
