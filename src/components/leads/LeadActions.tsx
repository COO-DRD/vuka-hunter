"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, RefreshCw, Copy, Check } from "lucide-react";

interface Props {
  lead: Record<string, unknown>;
}

export default function LeadActions({ lead }: Props) {
  const [notes, setNotes]       = useState((lead.notes as string) ?? "");
  const [saving, setSaving]     = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [scoring, setScoring]   = useState(false);
  const [genOpener, setGenOpener] = useState(false);
  const [opener, setOpener]     = useState((lead.opener_text as string) ?? "");
  const [copied, setCopied]     = useState(false);

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
    if (res.ok) { toast.success("Enriched — reload to see data"); }
    else toast.error("Enrichment failed");
  }

  async function score() {
    setScoring(true);
    const res = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id }) });
    setScoring(false);
    if (res.ok) { toast.success("Scored — reload to see score"); }
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
      // Fallback for browsers that block clipboard API
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
    <div className="space-y-5">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={enrich} loading={enriching}>
          <RefreshCw className="h-3.5 w-3.5" /> Enrich
        </Button>
        <Button variant="outline" size="sm" onClick={score} loading={scoring}>
          <Zap className="h-3.5 w-3.5" /> Score with AI
        </Button>
        <Button variant="outline" size="sm" onClick={generateOpener} loading={genOpener}>
          <Zap className="h-3.5 w-3.5" /> Generate Opener
        </Button>
      </div>

      {/* Opener */}
      {opener && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-zinc-400">AI Opener</p>
            <button onClick={copyOpener} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{opener}</p>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Call notes, follow-up reminders…"
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
        <Button variant="outline" size="sm" onClick={saveNotes} loading={saving} className="mt-2">
          Save notes
        </Button>
      </div>
    </div>
  );
}
