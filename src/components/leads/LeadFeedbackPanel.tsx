"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, TrendingUp, Minus, XCircle, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Outcome =
  | "converted" | "meeting" | "replied"
  | "no_response" | "not_interested"
  | "wrong_number" | "wrong_person" | "bad_lead";

interface OutcomeOption {
  value: Outcome;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "positive" | "neutral" | "signal";
  description: string;
}

const OPTIONS: OutcomeOption[] = [
  { value: "converted",      label: "Deal closed",       icon: CheckCircle2, group: "positive", description: "Became a paying client" },
  { value: "meeting",        label: "Meeting booked",    icon: TrendingUp,   group: "positive", description: "Call or meeting scheduled" },
  { value: "replied",        label: "They replied",      icon: ThumbsUp,     group: "positive", description: "Responded, still in conversation" },
  { value: "no_response",    label: "No response",       icon: Minus,        group: "neutral",  description: "Sent but heard nothing" },
  { value: "not_interested", label: "Not interested",    icon: Minus,        group: "neutral",  description: "Replied but declined" },
  { value: "wrong_number",   label: "Wrong number",      icon: XCircle,      group: "signal",   description: "Contact info was incorrect" },
  { value: "wrong_person",   label: "Wrong person",      icon: XCircle,      group: "signal",   description: "Not the decision maker" },
  { value: "bad_lead",       label: "Bad lead",          icon: XCircle,      group: "signal",   description: "Business doesn't match the criteria" },
];

const GROUP_LABELS = { positive: "Positive", neutral: "Neutral", signal: "Data issues" } as const;

const OUTCOME_COLORS: Record<string, string> = {
  converted:      "border-green-500/40 bg-green-500/10 text-green-400",
  meeting:        "border-amber-500/40 bg-amber-500/10 text-amber-400",
  replied:        "border-blue-500/40 bg-blue-500/10 text-blue-400",
  no_response:    "border-zinc-600/40 bg-zinc-800/60 text-zinc-400",
  not_interested: "border-zinc-600/40 bg-zinc-800/60 text-zinc-400",
  wrong_number:   "border-orange-500/40 bg-orange-500/10 text-orange-400",
  wrong_person:   "border-orange-500/40 bg-orange-500/10 text-orange-400",
  bad_lead:       "border-red-500/40 bg-red-500/10 text-red-400",
};

interface Props {
  leadId: string;
  contactedAt?: string | null;
  existingOutcome?: string | null;
  onSaved?: (outcome: Outcome) => void;
}

export function LeadFeedbackPanel({ leadId, contactedAt, existingOutcome, onSaved }: Props) {
  const [selected, setSelected]     = useState<Outcome | null>((existingOutcome as Outcome) ?? null);
  const [note, setNote]             = useState("");
  const [dataOk, setDataOk]         = useState<boolean | null>(null);
  const [contactOk, setContactOk]   = useState<boolean | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(!!existingOutcome);

  async function submit() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          outcome:         selected,
          contactAccurate: contactOk,
          dataAccurate:    dataOk,
          note:            note || null,
          contactedAt:     contactedAt ?? new Date().toISOString(),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSaved(true);
      onSaved?.(selected);
      toast.success("Outcome logged — Hunter learns from this");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const groups = (["positive", "neutral", "signal"] as const).map((g) => ({
    key: g,
    label: GROUP_LABELS[g],
    options: OPTIONS.filter((o) => o.group === g),
  }));

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>How did it go?</CardTitle>
          {saved && selected && (
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${OUTCOME_COLORS[selected]}`}>
              {OPTIONS.find((o) => o.value === selected)?.label}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Your feedback trains Hunter to score similar leads more accurately over time.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Outcome grid */}
        <div className="space-y-3">
          {groups.map(({ key, label, options }) => (
            <div key={key}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {options.map(({ value, label: optLabel, icon: Icon }) => {
                  const active = selected === value;
                  return (
                    <button
                      key={value}
                      onClick={() => { setSelected(value); setSaved(false); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        active
                          ? OUTCOME_COLORS[value]
                          : "border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {optLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Accuracy quick-checks — only show for data-signal outcomes or when something was selected */}
        {selected && (
          <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-800">
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-500">Was the contact info correct?</p>
              <div className="flex gap-2">
                {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
                  <button
                    key={l}
                    onClick={() => setContactOk(contactOk === v ? null : v)}
                    className={`px-3 py-1 rounded-md text-xs border transition-colors ${
                      contactOk === v
                        ? v ? "border-green-500/50 bg-green-500/10 text-green-400"
                            : "border-red-500/50 bg-red-500/10 text-red-400"
                        : "border-zinc-700 text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-500">Was this the right type of business?</p>
              <div className="flex gap-2">
                {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
                  <button
                    key={l}
                    onClick={() => setDataOk(dataOk === v ? null : v)}
                    className={`px-3 py-1 rounded-md text-xs border transition-colors ${
                      dataOk === v
                        ? v ? "border-green-500/50 bg-green-500/10 text-green-400"
                            : "border-red-500/50 bg-red-500/10 text-red-400"
                        : "border-zinc-700 text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Optional note */}
        {selected && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional: what happened? (helps Hunter understand context)"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
          />
        )}

        {selected && !saved && (
          <Button size="sm" onClick={submit} loading={saving} className="gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Log outcome
          </Button>
        )}

        {saved && (
          <p className="text-xs text-zinc-600">
            Logged. <button onClick={() => setSaved(false)} className="underline hover:text-zinc-400">Update</button>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
