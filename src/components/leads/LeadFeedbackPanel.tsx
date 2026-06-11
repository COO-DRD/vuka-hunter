"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  IconCircleCheck, IconTrendingUp, IconMinus, IconCircleX, IconThumbUp,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Outcome =
  | "converted" | "meeting" | "replied"
  | "no_response" | "not_interested"
  | "wrong_number" | "wrong_person" | "bad_lead";

interface OutcomeOption {
  value: Outcome;
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number; className?: string }>;
  group: "positive" | "neutral" | "signal";
  description: string;
}

const OPTIONS: OutcomeOption[] = [
  { value: "converted",      label: "Deal closed",     icon: IconCircleCheck, group: "positive", description: "Became a paying client" },
  { value: "meeting",        label: "Meeting booked",  icon: IconTrendingUp,  group: "positive", description: "Call or meeting scheduled" },
  { value: "replied",        label: "They replied",    icon: IconThumbUp,     group: "positive", description: "Responded, still in conversation" },
  { value: "no_response",    label: "No response",     icon: IconMinus,       group: "neutral",  description: "Sent but heard nothing" },
  { value: "not_interested", label: "Not interested",  icon: IconMinus,       group: "neutral",  description: "Replied but declined" },
  { value: "wrong_number",   label: "Wrong number",    icon: IconCircleX,     group: "signal",   description: "Contact info was incorrect" },
  { value: "wrong_person",   label: "Wrong person",    icon: IconCircleX,     group: "signal",   description: "Not the decision maker" },
  { value: "bad_lead",       label: "Bad lead",        icon: IconCircleX,     group: "signal",   description: "Business doesn't match the criteria" },
];

const OUTCOME_COLORS: Record<string, string> = {
  converted:      "border-success bg-success-lt text-success",
  meeting:        "border-warning bg-yellow-lt text-warning",
  replied:        "border-info bg-info-lt text-info",
  no_response:    "border text-secondary",
  not_interested: "border text-secondary",
  wrong_number:   "border-warning bg-yellow-lt text-warning",
  wrong_person:   "border-warning bg-yellow-lt text-warning",
  bad_lead:       "border-danger bg-danger-lt text-danger",
};

const GROUP_LABELS = { positive: "Positive", neutral: "Neutral", signal: "Data issues" } as const;

interface Props {
  leadId: string;
  contactedAt?: string | null;
  existingOutcome?: string | null;
  onSaved?: (outcome: Outcome) => void;
}

export function LeadFeedbackPanel({ leadId, contactedAt, existingOutcome, onSaved }: Props) {
  const [selected, setSelected]   = useState<Outcome | null>((existingOutcome as Outcome) ?? null);
  const [note, setNote]           = useState("");
  const [dataOk, setDataOk]       = useState<boolean | null>(null);
  const [contactOk, setContactOk] = useState<boolean | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(!!existingOutcome);

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
      toast.success("Outcome logged");
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
        <div className="d-flex align-items-center justify-content-between">
          <CardTitle>How did it go?</CardTitle>
          {saved && selected && (
            <span className={`badge ${OUTCOME_COLORS[selected]}`}>
              {OPTIONS.find((o) => o.value === selected)?.label}
            </span>
          )}
        </div>
        <p className="text-muted small mt-1 mb-0">
          Your feedback improves scoring accuracy for similar leads over time.
        </p>
      </CardHeader>
      <CardContent>
        {/* Outcome grid */}
        <div className="mb-4">
          {groups.map(({ key, label, options }) => (
            <div key={key} className="mb-3">
              <div className="text-muted mb-2" style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {label}
              </div>
              <div className="d-flex flex-wrap gap-2">
                {options.map(({ value, label: optLabel, icon: Icon }) => {
                  const active = selected === value;
                  return (
                    <button
                      key={value}
                      onClick={() => { setSelected(value); setSaved(false); }}
                      className={`btn btn-sm d-flex align-items-center gap-1 ${active ? OUTCOME_COLORS[value] : "btn-outline-secondary"}`}
                    >
                      <Icon size={13} stroke={1.5} />
                      {optLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Accuracy quick-checks */}
        {selected && (
          <div className="row g-3 pt-3 border-top mb-3">
            {[
              { label: "Was the contact info correct?", state: contactOk, setter: setContactOk },
              { label: "Was this the right type of business?", state: dataOk, setter: setDataOk },
            ].map(({ label, state, setter }) => (
              <div key={label} className="col-12 col-sm-6">
                <div className="text-muted small mb-2">{label}</div>
                <div className="d-flex gap-2">
                  {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
                    <button
                      key={l}
                      onClick={() => setter(state === v ? null : v)}
                      className={`btn btn-sm ${state === v ? (v ? "btn-success" : "btn-danger") : "btn-outline-secondary"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Optional note */}
        {selected && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional: what happened? (e.g. no online presence, wrong contact, different budget)"
            className="form-control mb-3 small"
          />
        )}

        {selected && !saved && (
          <Button size="sm" onClick={submit} loading={saving}>
            <IconCircleCheck size={14} stroke={1.5} className="me-1" />
            Log outcome
          </Button>
        )}

        {saved && (
          <p className="text-muted small mb-0">
            Logged.{" "}
            <button onClick={() => setSaved(false)} className="btn-link p-0 border-0 bg-transparent text-muted text-decoration-underline small">
              Update
            </button>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
