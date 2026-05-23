"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { scoreColor, scoreBg } from "@/lib/utils";
import {
  Zap, RefreshCw, Copy, Check, Star, Phone, Mail, Globe,
  MapPin, ExternalLink, CheckCircle, AlertCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";
import StageSelector from "@/components/leads/StageSelector";

type Lead = Record<string, unknown>;

function readSSE(
  res: Response,
  onToken: (t: string) => void,
  onDone: (payload: Record<string, unknown>) => void,
  onError: (msg: string) => void,
) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const data = JSON.parse(payload) as Record<string, unknown>;
            if (data.error) { onError(data.error as string); return; }
            if (data.t) onToken(data.t as string);
            if (data.done) onDone(data);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      onError(String(err));
    }
  })();
}

export default function LeadDetail({ lead }: { lead: Lead }) {
  const [score, setScore]             = useState<number | null>((lead.score as number) ?? null);
  const [displayScore, setDisplayScore] = useState<number | null>((lead.score as number) ?? null);
  const [reasoning, setReasoning]     = useState<string>((lead.score_reasoning as string) ?? "");
  const [liveReasoning, setLiveReasoning] = useState("");
  const [painSignals, setPainSignals] = useState<string[]>((lead.pain_signals as string[]) ?? []);
  const [scoring, setScoring]         = useState(false);

  const [opener, setOpener]           = useState<string>((lead.opener_text as string) ?? "");
  const [liveOpener, setLiveOpener]   = useState("");
  const [generatingOpener, setGeneratingOpener] = useState(false);

  const [enriching, setEnriching]     = useState(false);
  const [notes, setNotes]             = useState<string>((lead.notes as string) ?? "");
  const [saving, setSaving]           = useState(false);
  const [copied, setCopied]           = useState(false);

  function animateScore(target: number) {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const iv = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayScore(current);
      if (current >= target) { setScore(target); clearInterval(iv); }
    }, 20);
  }

  async function doScore() {
    setScoring(true);
    setLiveReasoning("");
    setReasoning("");
    setPainSignals([]);
    setDisplayScore(null);
    setScore(null);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }

      await new Promise<void>((resolve, reject) => {
        readSSE(
          res,
          (t) => setLiveReasoning((prev) => prev + t),
          (payload) => {
            const s = payload.score as number;
            const r = payload.reasoning as string;
            const ps = payload.pain_signals as string[];
            setLiveReasoning("");
            setReasoning(r);
            setPainSignals(ps ?? []);
            animateScore(s);
            toast.success(`Scored ${s}/100`);
            resolve();
          },
          (msg) => { toast.error(msg); reject(new Error(msg)); },
        );
      });
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
    } finally {
      setScoring(false);
    }
  }

  async function doOpener() {
    setGeneratingOpener(true);
    setLiveOpener("");
    setOpener("");

    try {
      const res = await fetch("/api/opener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }

      await new Promise<void>((resolve, reject) => {
        readSSE(
          res,
          (t) => setLiveOpener((prev) => prev + t),
          () => {
            setLiveOpener((prev) => { setOpener(prev); return ""; });
            resolve();
          },
          (msg) => { toast.error(msg); reject(new Error(msg)); },
        );
      });
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
    } finally {
      setGeneratingOpener(false);
    }
  }

  async function enrich() {
    setEnriching(true);
    const res = await fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id }),
    });
    setEnriching(false);
    if (res.ok) toast.success("Enriched — enrichment data saved");
    else toast.error("Enrichment failed");
  }

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

  async function copyOpener() {
    await navigator.clipboard.writeText(opener || liveOpener);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeReasoning = liveReasoning || reasoning;
  const activeOpener    = liveOpener || opener;
  const scoreCardClass  = displayScore != null ? scoreBg(displayScore) : "border-zinc-800";

  const name         = lead.name as string;
  const vertical     = lead.vertical as string;
  const city         = lead.city as string | null;
  const googleRating = lead.google_rating as number | null;
  const reviewCount  = lead.google_review_count as number | null;
  const phone        = lead.phone as string | null;
  const email        = lead.email as string | null;
  const emailsFound  = lead.emails_found as string[] | null;
  const website      = lead.website as string | null;
  const address      = lead.address as string | null;
  const mapsUrl      = lead.google_maps_url as string | null;
  const techStack    = lead.tech_stack as string[] | null;
  const hasBooking   = lead.has_booking_system as boolean | null;
  const hasChat      = lead.has_live_chat as boolean | null;
  const enrichStatus = lead.enrichment_status as string;

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
            <span>{vertical}</span>
            {city != null && <><span>·</span><span>{city}</span></>}
            {googleRating != null && (
              <><span>·</span>
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                {googleRating} ({reviewCount} reviews)
              </span></>
            )}
          </div>
        </div>
        <StageSelector leadId={lead.id as string} currentStage={lead.stage as string} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact card */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {phone != null && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-zinc-500 shrink-0" />
                  <a href={`tel:${phone}`} className="text-sm text-zinc-300 hover:text-zinc-100">{phone}</a>
                </div>
              )}
              {(emailsFound?.length != null && emailsFound.length > 0 || email != null) && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    {email != null && <p className="text-sm text-zinc-300">{email}</p>}
                    {emailsFound?.filter((e) => e !== email).map((e) => (
                      <p key={e} className="text-xs text-zinc-500">{e}</p>
                    ))}
                  </div>
                </div>
              )}
              {website != null && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-zinc-500 shrink-0" />
                  <a href={website} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-zinc-300 hover:text-zinc-100 truncate flex items-center gap-1">
                    {new URL(website).hostname}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                </div>
              )}
              {address != null && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-300">{address}</span>
                </div>
              )}
              {mapsUrl != null && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  View on Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Score card — updates live */}
        <Card className={`lg:col-span-1 border ${scoreCardClass} transition-colors duration-500`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI Score</CardTitle>
              {displayScore != null && (
                <span className={`text-2xl font-black tabular-nums transition-all duration-100 ${scoreColor(displayScore)}`}>
                  {displayScore}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scoring && !activeReasoning && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Zap className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
                Analysing lead…
              </div>
            )}

            {activeReasoning && (
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                {activeReasoning}
                {scoring && <span className="inline-block w-0.5 h-3 bg-zinc-400 ml-0.5 animate-pulse" />}
              </p>
            )}

            {!scoring && painSignals.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2 font-medium">Pain signals</p>
                <div className="flex flex-wrap gap-1">
                  {painSignals.map((s) => <Badge key={s} variant="red" className="text-xs">{s}</Badge>)}
                </div>
              </div>
            )}

            {!scoring && displayScore == null && !activeReasoning && (
              <div className="text-center py-4">
                <Zap className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Not scored yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enrichment card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Enrichment</CardTitle>
              {enrichStatus === "done" ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : enrichStatus === "failed" ? (
                <AlertCircle className="h-4 w-4 text-red-400" />
              ) : (
                <Clock className="h-4 w-4 text-zinc-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {enrichStatus === "done" ? (
              <div className="space-y-2">
                {hasBooking != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Booking system</span>
                    <Badge variant={hasBooking ? "green" : "red"}>{hasBooking ? "Yes" : "No"}</Badge>
                  </div>
                )}
                {hasChat != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Live chat</span>
                    <Badge variant={hasChat ? "green" : "red"}>{hasChat ? "Yes" : "No"}</Badge>
                  </div>
                )}
                {techStack != null && techStack.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Tech stack</p>
                    <div className="flex flex-wrap gap-1">
                      {techStack.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Not enriched yet</p>
            )}
          </CardContent>
        </Card>

        {/* Opener card — streams live */}
        {(activeOpener || generatingOpener) && (
          <Card className="lg:col-span-3 border-zinc-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Opener</CardTitle>
                {(opener || (!generatingOpener && liveOpener)) && (
                  <button onClick={copyOpener} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {activeOpener}
                {generatingOpener && (
                  <span className="inline-block w-0.5 h-4 bg-zinc-300 ml-0.5 animate-pulse" />
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions & Notes */}
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Actions &amp; Notes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={enrich} loading={enriching}>
                  <RefreshCw className="h-3.5 w-3.5" /> Enrich
                </Button>
                <Button variant="outline" size="sm" onClick={doScore} loading={scoring}>
                  <Zap className="h-3.5 w-3.5" /> Score with AI
                </Button>
                <Button variant="outline" size="sm" onClick={doOpener} loading={generatingOpener}>
                  <Zap className="h-3.5 w-3.5" /> Generate Opener
                </Button>
              </div>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
