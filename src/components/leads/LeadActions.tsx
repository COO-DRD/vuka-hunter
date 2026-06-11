"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IconBolt, IconRefresh, IconCopy, IconCheck } from "@tabler/icons-react";

interface Props {
  lead: Record<string, unknown>;
}

export default function LeadActions({ lead }: Props) {
  const [notes, setNotes]         = useState((lead.notes as string) ?? "");
  const [saving, setSaving]       = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [scoring, setScoring]     = useState(false);
  const [genOpener, setGenOpener] = useState(false);
  const [opener, setOpener]       = useState((lead.opener_text as string) ?? "");
  const [copied, setCopied]       = useState(false);

  async function saveNotes() {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    toast.success("Notes saved");
  }

  async function enrich() {
    setEnriching(true);
    const res = await fetch("/api/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id }) });
    setEnriching(false);
    if (res.ok) toast.success("Enriched — reload to see data");
    else toast.error("Enrichment failed");
  }

  async function score() {
    setScoring(true);
    const res = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id }) });
    setScoring(false);
    if (res.ok) toast.success("Scored — reload to see score");
    else toast.error("Scoring failed");
  }

  async function generateOpener() {
    setGenOpener(true);
    const res = await fetch("/api/opener", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id }) });
    const data = await res.json();
    setGenOpener(false);
    if (res.ok && data.opener) { setOpener(data.opener); toast.success("Opener generated"); }
    else toast.error("Opener generation failed");
  }

  async function copyOpener() {
    try {
      await navigator.clipboard.writeText(opener);
    } catch {
      const el = document.createElement("textarea");
      el.value = opener;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Action buttons */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={enrich} loading={enriching}>
          <IconRefresh size={14} stroke={1.5} className="me-1" /> Enrich
        </Button>
        <Button variant="outline" size="sm" onClick={score} loading={scoring}>
          <IconBolt size={14} stroke={1.5} className="me-1" /> Score with AI
        </Button>
        <Button variant="outline" size="sm" onClick={generateOpener} loading={genOpener}>
          <IconBolt size={14} stroke={1.5} className="me-1" /> Generate Opener
        </Button>
      </div>

      {/* Opener */}
      {opener && (
        <div className="card mb-4" style={{ borderColor: "var(--brand)" }}>
          <div className="card-header">
            <h4 className="card-title small mb-0">AI Opener</h4>
            <div className="card-options">
              <button onClick={copyOpener} className="btn btn-ghost-secondary btn-icon btn-sm">
                {copied
                  ? <IconCheck size={14} stroke={2} className="text-success" />
                  : <IconCopy size={14} stroke={1.5} />
                }
              </button>
            </div>
          </div>
          <div className="card-body">
            <p className="small mb-0 text-body" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{opener}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="form-label text-muted small">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Call notes, follow-up reminders…"
          className="form-control mb-2"
        />
        <Button variant="outline" size="sm" onClick={saveNotes} loading={saving}>
          Save notes
        </Button>
      </div>
    </div>
  );
}
