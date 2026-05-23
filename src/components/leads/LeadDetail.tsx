"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { scoreColor, scoreBg } from "@/lib/utils";
import {
  Zap, RefreshCw, Copy, Check, Star, Phone, Mail, Globe,
  MapPin, ExternalLink, CheckCircle, AlertCircle, Clock,
  MessageCircle, Send,
} from "lucide-react";
import { toast } from "sonner";
import StageSelector from "@/components/leads/StageSelector";

type Lead = Record<string, unknown>;
type Channel = "whatsapp" | "email";

function readSSE(
  res: Response,
  onToken: (t: string) => void,
  onDone: (payload: Record<string, unknown>) => void,
  onError: (msg: string) => void,
) {
  const reader  = res.body!.getReader();
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
          } catch { /* skip */ }
        }
      }
    } catch (err) { onError(String(err)); }
  })();
}

export default function LeadDetail({ lead }: { lead: Lead }) {
  // ── Score state ────────────────────────────────────────────────────────────
  const [score,        setScore]        = useState<number | null>((lead.score as number) ?? null);
  const [displayScore, setDisplayScore] = useState<number | null>((lead.score as number) ?? null);
  const [reasoning,    setReasoning]    = useState<string>((lead.score_reasoning as string) ?? "");
  const [liveReasoning,setLiveReasoning]= useState("");
  const [painSignals,  setPainSignals]  = useState<string[]>((lead.pain_signals as string[]) ?? []);
  const [scoring,      setScoring]      = useState(false);

  // ── Opener state ───────────────────────────────────────────────────────────
  const [waOpener,    setWaOpener]    = useState<string>((lead.opener_whatsapp as string) ?? (lead.opener_text as string) ?? "");
  const [emailOpener, setEmailOpener] = useState<string>((lead.opener_email   as string) ?? "");
  const [emailSubject,setEmailSubject]= useState<string>((lead.opener_subject as string) ?? "");
  const [liveRaw,     setLiveRaw]     = useState("");   // raw stream before parsing
  const [generating,  setGenerating]  = useState(false);

  // ── Outreach state ─────────────────────────────────────────────────────────
  const [channel,   setChannel]   = useState<Channel>("whatsapp");
  const [sending,   setSending]   = useState(false);
  const [sentWa,    setSentWa]    = useState(false);
  const [sentEmail, setSentEmail] = useState(false);
  const [copied,    setCopied]    = useState(false);

  // ── Other ──────────────────────────────────────────────────────────────────
  const [enriching, setEnriching] = useState(false);
  const [notes,     setNotes]     = useState<string>((lead.notes as string) ?? "");
  const [saving,    setSaving]    = useState(false);

  // ── Typed lead fields ──────────────────────────────────────────────────────
  const name        = lead.name        as string;
  const vertical    = lead.vertical    as string;
  const city        = lead.city        as string | null;
  const googleRating= lead.google_rating         as number | null;
  const reviewCount = lead.google_review_count   as number | null;
  const phone       = lead.phone       as string | null;
  const email       = (lead.email      as string | null) ?? (lead.emails_found as string[])?.[0] ?? null;
  const emailsFound = lead.emails_found           as string[] | null;
  const website     = lead.website     as string | null;
  const address     = lead.address     as string | null;
  const mapsUrl     = lead.google_maps_url        as string | null;
  const techStack   = lead.tech_stack  as string[] | null;
  const hasBooking  = lead.has_booking_system     as boolean | null;
  const hasChat     = lead.has_live_chat          as boolean | null;
  const enrichStatus= lead.enrichment_status      as string;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function animateScore(target: number) {
    let cur = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      setDisplayScore(cur);
      if (cur >= target) { setScore(target); clearInterval(iv); }
    }, 20);
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function doScore() {
    setScoring(true);
    setLiveReasoning(""); setReasoning(""); setPainSignals([]); setDisplayScore(null); setScore(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await new Promise<void>((resolve, reject) => {
        readSSE(res,
          (t) => setLiveReasoning((p) => p + t),
          (payload) => {
            setLiveReasoning(""); setReasoning(payload.reasoning as string);
            setPainSignals((payload.pain_signals as string[]) ?? []);
            animateScore(payload.score as number);
            toast.success(`Scored ${payload.score}/100`);
            resolve();
          },
          (msg) => { toast.error(msg); reject(new Error(msg)); },
        );
      });
    } catch (err) { if (err instanceof Error) toast.error(err.message); }
    finally { setScoring(false); }
  }

  async function doOpener() {
    setGenerating(true);
    setLiveRaw(""); setWaOpener(""); setEmailOpener(""); setEmailSubject("");
    try {
      const res = await fetch("/api/opener", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await new Promise<void>((resolve, reject) => {
        readSSE(res,
          (t) => setLiveRaw((p) => p + t),
          (payload) => {
            setLiveRaw("");
            setWaOpener(payload.whatsapp as string ?? "");
            setEmailOpener(payload.email   as string ?? "");
            setEmailSubject(payload.subject as string ?? "");
            toast.success("Openers ready");
            resolve();
          },
          (msg) => { toast.error(msg); reject(new Error(msg)); },
        );
      });
    } catch (err) { if (err instanceof Error) toast.error(err.message); }
    finally { setGenerating(false); }
  }

  async function doEnrich() {
    setEnriching(true);
    const res = await fetch("/api/enrich", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id }),
    });
    setEnriching(false);
    if (res.ok) toast.success("Enriched"); else toast.error("Enrichment failed");
  }

  async function saveNotes() {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    toast.success("Notes saved");
  }

  async function sendOutreach() {
    const message = channel === "whatsapp" ? waOpener : emailOpener;
    const subject = channel === "email" ? emailSubject : undefined;
    if (!message) { toast.error("Generate an opener first"); return; }

    setSending(true);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, channel, message, subject }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.actionUrl) {
        window.open(data.actionUrl, "_blank");
      }
      if (channel === "whatsapp") { setSentWa(true); toast.success("WhatsApp opened — tap Send"); }
      else                        { setSentEmail(true); toast.success("Email ready — tap Send"); }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function copyActive() {
    const text = channel === "whatsapp" ? waOpener : emailOpener;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Derived display ────────────────────────────────────────────────────────
  const activeReasoning = liveReasoning || reasoning;
  const scoreCardClass  = displayScore != null ? scoreBg(displayScore) : "border-zinc-800";
  const hasOpeners      = !!(waOpener || emailOpener);
  const isStreaming     = generating && !!liveRaw;

  // What to show in the message preview
  const previewText = isStreaming
    ? liveRaw
    : channel === "whatsapp" ? waOpener : emailOpener;

  const canSendWa    = channel === "whatsapp" && !!waOpener && !!phone;
  const canSendEmail = channel === "email"     && !!emailOpener && !!email;
  const canSend      = canSendWa || canSendEmail;

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-2">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-zinc-100 truncate">{name}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-zinc-400">
            <span>{vertical}</span>
            {city != null && <><span>·</span><span>{city}</span></>}
            {googleRating != null && (
              <span className="flex items-center gap-1">
                <span>·</span>
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                {googleRating} ({reviewCount?.toLocaleString()})
              </span>
            )}
          </div>
        </div>
        <StageSelector leadId={lead.id as string} currentStage={lead.stage as string} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Contact */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {phone != null && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-zinc-500 shrink-0" />
                <a href={`tel:${phone}`} className="text-sm text-zinc-300 hover:text-zinc-100">{phone}</a>
              </div>
            )}
            {(emailsFound != null && emailsFound.length > 0 || email != null) && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  {email != null && <p className="text-sm text-zinc-300 truncate">{email}</p>}
                  {emailsFound?.filter((e) => e !== email).map((e) => (
                    <p key={e} className="text-xs text-zinc-500 truncate">{e}</p>
                  ))}
                </div>
              </div>
            )}
            {website != null && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-zinc-500 shrink-0" />
                <a href={website} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-zinc-300 hover:text-zinc-100 truncate flex items-center gap-1">
                  {new URL(website).hostname}<ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
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
                Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* AI Score */}
        <Card className={`lg:col-span-1 border ${scoreCardClass} transition-colors duration-500`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI Score</CardTitle>
              {displayScore != null && (
                <span className={`text-2xl font-black tabular-nums ${scoreColor(displayScore)}`}>
                  {displayScore}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scoring && !activeReasoning && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Zap className="h-3.5 w-3.5 text-yellow-400 animate-pulse" /> Analysing…
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

        {/* Enrichment */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Enrichment</CardTitle>
              {enrichStatus === "done"   ? <CheckCircle className="h-4 w-4 text-green-400" />
               : enrichStatus === "failed" ? <AlertCircle className="h-4 w-4 text-red-400" />
               : <Clock className="h-4 w-4 text-zinc-500" />}
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
                      {techStack.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            ) : <p className="text-xs text-zinc-500">Not enriched yet</p>}
          </CardContent>
        </Card>

        {/* ── Outreach card ── */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle>Outreach</CardTitle>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={doEnrich} loading={enriching}>
                  <RefreshCw className="h-3.5 w-3.5" /> Enrich
                </Button>
                <Button variant="outline" size="sm" onClick={doScore} loading={scoring}>
                  <Zap className="h-3.5 w-3.5" /> Score
                </Button>
                <Button
                  size="sm"
                  onClick={doOpener}
                  loading={generating}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {hasOpeners ? "Regenerate" : "Generate Openers"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Channel tab selector */}
            {(hasOpeners || isStreaming) && (
              <div className="flex gap-1 mb-3 p-1 bg-zinc-900 rounded-lg w-fit">
                <button
                  onClick={() => setChannel("whatsapp")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    channel === "whatsapp"
                      ? "bg-green-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  {sentWa && <Check className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => setChannel("email")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    channel === "email"
                      ? "bg-blue-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                  {sentEmail && <Check className="h-3 w-3" />}
                </button>
              </div>
            )}

            {/* Email subject line */}
            {channel === "email" && emailSubject && (
              <div className="mb-2 px-3 py-2 bg-zinc-900 rounded-md border border-zinc-700">
                <span className="text-xs text-zinc-500 font-medium mr-2">Subject:</span>
                <span className="text-xs text-zinc-200">{emailSubject}</span>
              </div>
            )}

            {/* Message preview */}
            {(previewText || isStreaming) && (
              <div className="relative rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 mb-3">
                <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {previewText}
                  {isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-zinc-300 ml-0.5 animate-pulse" />
                  )}
                </p>
                {!isStreaming && previewText && (
                  <button
                    onClick={copyActive}
                    className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            )}

            {/* No opener yet */}
            {!hasOpeners && !isStreaming && (
              <div className="text-center py-8 text-zinc-600">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Generate openers to see WhatsApp and Email messages</p>
                <p className="text-xs mt-1 opacity-60">Enriching first gives smarter, more personalised messages</p>
              </div>
            )}

            {/* Send button + contact warning */}
            {hasOpeners && !isStreaming && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={sendOutreach}
                  loading={sending}
                  disabled={!canSend}
                  className={`${
                    channel === "whatsapp"
                      ? "bg-green-600 hover:bg-green-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  } text-white`}
                >
                  <Send className="h-3.5 w-3.5" />
                  {channel === "whatsapp" ? "Open in WhatsApp" : "Open in Mail"}
                </Button>

                {channel === "whatsapp" && !phone && (
                  <p className="text-xs text-amber-400">No phone number — enrich first or add manually</p>
                )}
                {channel === "email" && !email && (
                  <p className="text-xs text-amber-400">No email found — enrich first or add manually</p>
                )}
                {canSend && (
                  <p className="text-xs text-zinc-500">
                    {channel === "whatsapp"
                      ? "Opens WhatsApp with message pre-filled — you tap Send"
                      : "Opens Mail with subject & body — you tap Send"}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Call notes, follow-up reminders, context…"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <Button variant="outline" size="sm" onClick={saveNotes} loading={saving} className="mt-2">
              Save
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
