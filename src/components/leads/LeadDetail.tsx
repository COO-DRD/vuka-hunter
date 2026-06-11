"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconBolt, IconRefresh, IconCopy, IconCheck, IconStar, IconPhone, IconMail, IconWorld,
  IconMapPin, IconExternalLink, IconCircleCheck, IconAlertCircle, IconClock,
  IconMessageCircle, IconSend, IconShieldCheck, IconShield, IconAward,
  IconLink, IconRobot,
} from "@tabler/icons-react";
import { toast } from "sonner";
import StageSelector from "@/components/leads/StageSelector";
import { LeadFeedbackPanel } from "@/components/leads/LeadFeedbackPanel";
import { CallGuide } from "@/components/leads/CallGuide";

type Lead = Record<string, unknown>;
type Channel = "whatsapp" | "email";

// ── SSE reader ─────────────────────────────────────────────────────────────────
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

// ── Score helpers (theme-aware) ────────────────────────────────────────────────
function scoreTextColor(s: number) {
  if (s >= 70) return "text-green-600";
  if (s >= 40) return "text-yellow-600";
  return "text-red-500";
}
function scoreBorderColor(s: number): string {
  if (s >= 70) return "#16a34a";
  if (s >= 40) return "#d97706";
  return "#dc2626";
}

// ── Business Intelligence panel ────────────────────────────────────────────────
const SIGNAL_LABELS: Record<string, string> = {
  "gap:no-booking":   "No booking system",
  "gap:no-live-chat": "No live chat",
  "gap:no-payment":   "No online payments",
  "gap:no-ssl":       "No SSL",
  "gap:no-email":     "No email found",
  "gap:no-whatsapp":  "No WhatsApp",
  "has:ssl":          "SSL secured",
  "has:website":      "Has website",
  "has:booking":      "Has booking",
  "has:live-chat":    "Has live chat",
  "has:payment":      "Has online payment",
  "has:whatsapp":     "Has WhatsApp",
  "has:social":       "Active social media",
  "has:instagram":    "Instagram presence",
  "has:facebook":     "Facebook page",
  "has:linkedin":     "LinkedIn profile",
};

const SOCIAL_LABELS: Record<string, string> = {
  facebook:  "Facebook",
  instagram: "Instagram",
  twitter:   "Twitter / X",
  linkedin:  "LinkedIn",
  tiktok:    "TikTok",
  youtube:   "YouTube",
  whatsapp:  "WhatsApp Business",
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-7 text-right" style={{ color: "var(--text-1)" }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="border-t my-3" style={{ borderColor: "var(--border)" }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>
      {children}
    </p>
  );
}

function IntelPanel({
  lead, onEnrich, enriching,
}: {
  lead: Lead;
  onEnrich: () => void;
  enriching: boolean;
}) {
  const enrichStatus     = lead.enrichment_status       as string | null;
  const enrichedAt       = lead.enriched_at             as string | null;
  const googleRating     = lead.google_rating           as number | null;
  const reviewCount      = lead.google_review_count     as number | null;
  const address          = lead.address                 as string | null;
  const mapsUrl          = lead.google_maps_url         as string | null;
  const website          = lead.website                 as string | null;
  const phone            = lead.phone                   as string | null;
  const emailsFound      = lead.emails_found            as string[] | null;
  const techStack        = lead.tech_stack              as string[] | null;
  const hasBooking       = lead.has_booking_system      as boolean | null;
  const hasChat          = lead.has_live_chat           as boolean | null;
  const hasPayment       = lead.has_online_payment      as boolean | null;
  const hasSsl           = lead.has_ssl                 as boolean | null;
  const socialLinks      = lead.social_links            as Record<string, string> | null;
  const digitalScore     = lead.digital_readiness_score as number | null;
  const opportunityScore = lead.opportunity_score       as number | null;
  const reachScore       = lead.reachability_score      as number | null;
  const phonesFound      = lead.phones_found            as string[] | null;
  const whatsappNum      = lead.whatsapp_number         as string | null;
  const verticalSignals  = lead.vertical_signals        as string[] | null;
  const painSignalsRaw   = lead.pain_signals            as string[] | null;
  const yearEstablished  = lead.year_established        as number | null;
  const locationCount    = lead.location_count          as number | null;
  const staffSignal      = lead.staff_signal            as string | null;
  const certifications   = lead.certifications          as string[] | null;
  const dmName           = lead.decision_maker_name     as string | null;
  const dmTitle          = lead.decision_maker_title    as string | null;
  const vertical         = lead.vertical                as string;

  const isDone = enrichStatus === "done";

  const allPhones = [
    ...(phonesFound ?? []),
    ...(phone && !(phonesFound ?? []).includes(phone) ? [phone] : []),
  ].filter(Boolean);

  const allEmails = emailsFound ?? [];

  const allSignals = [...(verticalSignals ?? []), ...(painSignalsRaw ?? [])];
  const gaps = allSignals
    .filter((s) => s.startsWith("gap:"))
    .map((s) => SIGNAL_LABELS[s] ?? s.replace("gap:", "").replace(/-/g, " "));
  const haves = allSignals
    .filter((s) => s.startsWith("has:"))
    .map((s) => SIGNAL_LABELS[s] ?? s.replace("has:", "").replace(/-/g, " "));

  const activeSocials = Object.entries(socialLinks ?? {})
    .filter(([, url]) => !!url)
    .map(([platform, url]) => ({ platform, label: SOCIAL_LABELS[platform] ?? platform, url }));

  const hostname = (url: string) => {
    try { return new URL(url).hostname; } catch { return url; }
  };

  const hasOpsData = yearEstablished || staffSignal || (locationCount ?? 0) > 1 || (certifications?.length ?? 0) > 0;
  const hasScores  = digitalScore != null || opportunityScore != null || reachScore != null;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
          Business Intelligence
        </h2>
        {enrichedAt && (
          <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
            {new Date(enrichedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      {/* Google profile card */}
      {googleRating != null && (
        <div className="rounded-lg p-3 mb-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <IconStar
                  key={i}
                  size={12}
                  fill={i <= Math.round(googleRating) ? "currentColor" : "none"}
                  className={i <= Math.round(googleRating) ? "text-yellow-400" : "text-stone-300"}
                />
              ))}
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{googleRating}</span>
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              ({reviewCount?.toLocaleString()} reviews)
            </span>
          </div>
          <p className="text-xs capitalize mb-1" style={{ color: "var(--text-2)" }}>{vertical}</p>
          {address && (
            <p className="text-[11px] flex items-start gap-1" style={{ color: "var(--text-3)" }}>
              <IconMapPin size={12} className="shrink-0 mt-0.5" />
              {address}
            </p>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 mt-1.5">
              Open in Google Maps <IconExternalLink size={10} />
            </a>
          )}
        </div>
      )}

      {/* Website */}
      {website && (
        <>
          <Divider />
          <SectionLabel>Website</SectionLabel>
          <div className="flex items-center gap-1.5">
            {hasSsl === true  && <IconShieldCheck size={14} className="text-green-500 shrink-0" />}
            {hasSsl === false && <IconShield size={14} className="text-red-400 shrink-0" />}
            {hasSsl == null   && <IconWorld size={14} className="shrink-0" style={{ color: "var(--text-3)" }} />}
            <a href={website} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-600 truncate flex items-center gap-1 min-w-0">
              {hostname(website)}
              <IconExternalLink size={10} className="shrink-0 opacity-60" />
            </a>
          </div>
        </>
      )}

      {/* Contact signals */}
      {(allPhones.length > 0 || allEmails.length > 0 || whatsappNum) && (
        <>
          <Divider />
          <SectionLabel>Contact Signals</SectionLabel>
          <div className="space-y-1.5">
            {allPhones.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <IconPhone size={12} className="shrink-0" style={{ color: "var(--text-3)" }} />
                <a href={`tel:${p}`} className="text-xs hover:underline" style={{ color: "var(--text-1)" }}>{p}</a>
              </div>
            ))}
            {whatsappNum && (
              <div className="flex items-center gap-1.5">
                <IconMessageCircle size={12} className="shrink-0 text-green-500" />
                <a
                  href={`https://wa.me/${whatsappNum.replace(/\D/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline"
                >
                  {whatsappNum}
                </a>
              </div>
            )}
            {allEmails.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <IconMail size={12} className="shrink-0" style={{ color: "var(--text-3)" }} />
                <a href={`mailto:${e}`} className="text-xs truncate hover:underline" style={{ color: "var(--text-1)" }}>{e}</a>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Social presence */}
      {activeSocials.length > 0 && (
        <>
          <Divider />
          <SectionLabel>Social Presence</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {activeSocials.map(({ platform, label, url }) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:opacity-80"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-2)" }}
              >
                <IconLink size={10} />
                {label}
              </a>
            ))}
          </div>
        </>
      )}

      {/* Decision maker */}
      {dmName && (
        <>
          <Divider />
          <SectionLabel>Key Contact</SectionLabel>
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
              style={{ background: "var(--brand)" }}
            >
              {dmName[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-1)" }}>{dmName}</p>
              {dmTitle && <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{dmTitle}</p>}
            </div>
          </div>
        </>
      )}

      {/* Operations */}
      {hasOpsData && (
        <>
          <Divider />
          <SectionLabel>Operations</SectionLabel>
          <div className="space-y-1">
            {yearEstablished && (
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: "var(--text-3)" }}>Established</span>
                <span style={{ color: "var(--text-1)" }}>
                  {yearEstablished}
                  <span style={{ color: "var(--text-3)" }}> ({new Date().getFullYear() - yearEstablished} yrs)</span>
                </span>
              </div>
            )}
            {staffSignal && (
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: "var(--text-3)" }}>Staff</span>
                <span style={{ color: "var(--text-1)" }}>{staffSignal}</span>
              </div>
            )}
            {(locationCount ?? 0) > 1 && (
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: "var(--text-3)" }}>Locations</span>
                <span style={{ color: "var(--text-1)" }}>{locationCount} branches</span>
              </div>
            )}
          </div>
          {certifications && certifications.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {certifications.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 text-[11px]"
                  style={{ color: "var(--text-2)" }}>
                  <IconAward size={10} className="text-amber-500" />
                  {c}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tech & capabilities */}
      {isDone && (
        <>
          <Divider />
          <SectionLabel>Capabilities</SectionLabel>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 mb-2">
            {([
              { label: "Booking system", value: hasBooking },
              { label: "Live chat",      value: hasChat },
              { label: "Online payment", value: hasPayment },
              { label: "SSL",            value: hasSsl },
            ] as { label: string; value: boolean | null }[]).map(({ label, value }) =>
              value != null ? (
                <div key={label} className="flex items-center gap-1.5 text-[11px]">
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${value ? "bg-green-500" : "bg-stone-300"}`} />
                  <span style={{ color: value ? "var(--text-1)" : "var(--text-3)" }}>{label}</span>
                </div>
              ) : null
            )}
          </div>
          {techStack && techStack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {techStack.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Intelligence scores */}
      {hasScores && (
        <>
          <Divider />
          <SectionLabel>Intelligence Scores</SectionLabel>
          <div className="space-y-2.5">
            {digitalScore != null && (
              <div>
                <p className="text-[11px] mb-1" style={{ color: "var(--text-2)" }}>Digital readiness</p>
                <ScoreBar value={digitalScore} color="bg-blue-500" />
              </div>
            )}
            {opportunityScore != null && (
              <div>
                <p className="text-[11px] mb-1" style={{ color: "var(--text-2)" }}>Opportunity</p>
                <ScoreBar value={opportunityScore} color="bg-amber-500" />
              </div>
            )}
            {reachScore != null && (
              <div>
                <p className="text-[11px] mb-1" style={{ color: "var(--text-2)" }}>Reachability</p>
                <ScoreBar value={reachScore} color="bg-green-500" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Gaps — sales opportunities */}
      {gaps.length > 0 && (
        <>
          <Divider />
          <SectionLabel>Gaps Found</SectionLabel>
          <div className="space-y-1.5">
            {gaps.map((g) => (
              <div key={g} className="flex items-center gap-1.5 text-[11px]">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                <span style={{ color: "var(--text-2)" }}>{g}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Haves */}
      {haves.length > 0 && (
        <>
          <Divider />
          <SectionLabel>Already Has</SectionLabel>
          <div className="space-y-1.5">
            {haves.map((h) => (
              <div key={h} className="flex items-center gap-1.5 text-[11px]">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                <span style={{ color: "var(--text-2)" }}>{h}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Enrich CTA if not yet done */}
      {!isDone && (
        <>
          <Divider />
          <div
            className="rounded-lg p-4 text-center"
            style={{ background: "var(--bg-elevated)", border: "1px dashed var(--border)" }}
          >
            <IconRobot size={28} className="mx-auto mb-2" style={{ color: "var(--text-3)" }} />
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-1)" }}>
              Enrich for full intel
            </p>
            <p className="text-[11px] mb-3" style={{ color: "var(--text-3)" }}>
              Website crawl reveals tech stack, emails, social profiles, staff signals & more
            </p>
            <Button size="sm" variant="outline" onClick={onEnrich} loading={enriching} className="w-full">
              <IconRefresh size={14} /> Enrich Now
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sequence day card ──────────────────────────────────────────────────────────
function SequenceDay({ day, label, wa, emailSubject, email }: {
  day: string; label: string; wa: string; emailSubject: string; email: string;
}) {
  const [tab,    setTab]    = useState<"whatsapp" | "email">("whatsapp");
  const [copied, setCopied] = useState(false);

  const content = tab === "whatsapp" ? wa : email;

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const el = document.createElement("textarea");
      el.value = content; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <div>
          <span className="text-xs font-bold" style={{ color: "var(--text-1)" }}>{day}</span>
          <span className="text-xs ml-2" style={{ color: "var(--text-3)" }}>{label}</span>
        </div>
        <div className="flex gap-1 p-0.5 rounded-md" style={{ background: "var(--bg-elevated)" }}>
          {(["whatsapp", "email"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${tab === t ? "bg-amber-500 text-black" : ""}`}
              style={tab !== t ? { color: "var(--text-3)" } : {}}
            >
              {t === "whatsapp" ? "WA" : "Email"}
            </button>
          ))}
        </div>
      </div>
      {tab === "email" && emailSubject && (
        <div className="px-3 py-2 border-b text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-3)" }}>
          Subject: <span style={{ color: "var(--text-1)" }}>{emailSubject}</span>
        </div>
      )}
      <div className="relative px-3 py-2.5">
        <p className="text-xs leading-relaxed whitespace-pre-wrap pr-7" style={{ color: "var(--text-2)" }}>
          {content || <span style={{ color: "var(--text-3)" }}>Not generated</span>}
        </p>
        {content && (
          <button onClick={copy} className="absolute top-2.5 right-2.5 transition-colors" style={{ color: "var(--text-3)" }}>
            {copied ? <IconCheck size={14} className="text-green-500" /> : <IconCopy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Referral copy button ───────────────────────────────────────────────────────
function ReferralCopyButton() {
  const [copied, setCopied] = useState(false);
  const url = (typeof window !== "undefined" ? window.location.origin : "https://4unter.dullugroup.co.ke") + "/sign-up";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors bg-amber-500 hover:bg-amber-400 text-black"
    >
      {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
      {copied ? "Copied!" : "Copy referral link"}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LeadDetail({ lead }: { lead: Lead }) {
  const router = useRouter();

  // ── Score state ────────────────────────────────────────────────────────────
  const [displayScore,  setDisplayScore]  = useState<number | null>((lead.score as number) ?? null);
  const [reasoning,     setReasoning]     = useState<string>((lead.score_reasoning as string) ?? "");
  const [liveReasoning, setLiveReasoning] = useState("");
  const [painSignals,   setPainSignals]   = useState<string[]>((lead.pain_signals as string[]) ?? []);
  const [scoring,       setScoring]       = useState(false);

  // ── Opener state ───────────────────────────────────────────────────────────
  const [waOpener,     setWaOpener]     = useState<string>((lead.opener_whatsapp as string) ?? (lead.opener_text as string) ?? "");
  const [emailOpener,  setEmailOpener]  = useState<string>((lead.opener_email   as string) ?? "");
  const [emailSubject, setEmailSubject] = useState<string>((lead.opener_subject as string) ?? "");
  const [liveRaw,      setLiveRaw]      = useState("");
  const [generating,   setGenerating]   = useState(false);

  // ── Outreach state ─────────────────────────────────────────────────────────
  const [channel,     setChannel]     = useState<Channel>("whatsapp");
  const [sentWa,      setSentWa]      = useState(false);
  const [sentEmail,   setSentEmail]   = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [contactedAt, setContactedAt] = useState<string | null>((lead.contacted_at as string) ?? null);
  const [lastOutcome, setLastOutcome] = useState<string | null>((lead.last_outcome as string) ?? null);

  // ── Other ──────────────────────────────────────────────────────────────────
  const [enriching,      setEnriching]      = useState(false);
  const [liveLead,       setLiveLead]       = useState<Lead>(lead);

  // ── Follow-up sequence ─────────────────────────────────────────────────────
  type Sequence = { day3wa: string; day3subject: string; day3email: string; day7wa: string; day7subject: string; day7email: string };
  const [sequence,       setSequence]       = useState<Sequence | null>(() => {
    const d3wa = lead.followup_day3_whatsapp      as string | null;
    const d3es = lead.followup_day3_email_subject as string | null;
    const d3em = lead.followup_day3_email         as string | null;
    const d7wa = lead.followup_day7_whatsapp      as string | null;
    const d7es = lead.followup_day7_email_subject as string | null;
    const d7em = lead.followup_day7_email         as string | null;
    if (d3wa || d7wa) return { day3wa: d3wa ?? "", day3subject: d3es ?? "", day3email: d3em ?? "", day7wa: d7wa ?? "", day7subject: d7es ?? "", day7email: d7em ?? "" };
    return null;
  });
  const [generatingSeq,  setGeneratingSeq]  = useState(false);

  // ── Referral nudge ─────────────────────────────────────────────────────────
  const [showReferral,   setShowReferral]   = useState(false);
  const [notes,     setNotes]     = useState<string>((lead.notes as string) ?? "");
  const [saving,    setSaving]    = useState(false);

  // ── Typed lead fields ──────────────────────────────────────────────────────
  const name        = lead.name                       as string;
  const vertical    = lead.vertical                   as string;
  const city        = lead.city                       as string | null;
  const googleRating= lead.google_rating              as number | null;
  const reviewCount = lead.google_review_count        as number | null;
  const phone       = lead.phone                      as string | null;
  const email       = (lead.email as string | null) ?? (lead.emails_found as string[])?.[0] ?? null;
  const emailsFound = lead.emails_found               as string[] | null;
  const website     = lead.website                    as string | null;
  const address     = lead.address                    as string | null;
  const mapsUrl     = lead.google_maps_url            as string | null;
  const enrichStatus= (liveLead.enrichment_status         as string) ?? "pending";

  const callGuideGaps = useMemo(() => {
    const vSig = liveLead.vertical_signals as string[] | null;
    const pSig = liveLead.pain_signals     as string[] | null;
    return [...(vSig ?? []), ...(pSig ?? [])].filter(s => s.startsWith("gap:"));
  }, [liveLead]);

  // ── Auto-generate opener on mount if none exists ───────────────────────────
  const autoGenRef = useRef(false);
  useEffect(() => {
    if (autoGenRef.current) return;
    autoGenRef.current = true;
    if (!(lead.opener_whatsapp || lead.opener_text)) doOpener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function animateScore(target: number) {
    let cur = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      setDisplayScore(cur);
      if (cur >= target) clearInterval(iv);
    }, 20);
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function doScore() {
    setScoring(true);
    setLiveReasoning(""); setReasoning(""); setPainSignals([]); setDisplayScore(null);
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
            setLiveReasoning("");
            setReasoning(payload.reasoning as string);
            setPainSignals((payload.pain_signals as string[]) ?? []);
            animateScore(payload.score as number);
            toast.success(`Scored ${payload.score}/100`);
            router.refresh();
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
            setWaOpener((payload.whatsapp as string) ?? "");
            setEmailOpener((payload.email   as string) ?? "");
            setEmailSubject((payload.subject as string) ?? "");
            toast.success("Openers ready");
            resolve();
          },
          (msg) => { toast.error(msg); reject(new Error(msg)); },
        );
      });
    } catch (err) { if (err instanceof Error) toast.error(err.message); }
    finally { setGenerating(false); }
  }

  async function doSequence() {
    setGeneratingSeq(true);
    try {
      const res  = await fetch("/api/opener/sequence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const json = await res.json();
      if (res.ok) {
        setSequence(json);
        toast.success("Follow-up sequence ready");
      } else {
        toast.error(json.error ?? "Sequence generation failed");
      }
    } catch {
      toast.error("Connection error — please retry");
    } finally {
      setGeneratingSeq(false);
    }
  }

  async function doEnrich() {
    setEnriching(true);
    try {
      const res  = await fetch("/api/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const json = await res.json();
      if (res.ok && json.enriched) {
        const e = json.enriched as Record<string, unknown>;
        const vSignals    = (e.verticalSignals as string[]) ?? [];
        const cSignals    = (e.customSignals   as string[]) ?? [];
        const painComputed = [...vSignals.filter((s) => s.startsWith("gap:")), ...cSignals];
        setLiveLead((prev) => ({
          ...prev,
          enrichment_status:       "done",
          enriched_at:             new Date().toISOString(),
          emails_found:            e.emails,
          email:                   (e.emails as string[])?.[0] ?? prev.email,
          tech_stack:              e.techStack,
          has_booking_system:      e.hasBookingSystem,
          has_live_chat:           e.hasLiveChat,
          has_online_payment:      e.hasOnlinePayment,
          has_ssl:                 e.hasSsl,
          social_links:            e.socialLinks,
          whatsapp_number:         (e.whatsappNumber as string | null) ?? null,
          digital_readiness_score: e.digitalReadinessScore,
          opportunity_score:       e.opportunityScore,
          phones_found:            (e.phones as string[])?.length > 0 ? e.phones : null,
          vertical_signals:        vSignals.length > 0 ? vSignals : null,
          pain_signals:            painComputed.length > 0 ? painComputed : null,
          year_established:        (e.yearEstablished as number | null) ?? null,
          location_count:          e.locationCount,
          staff_signal:            (e.staffSignal as string | null) ?? null,
          certifications:          (e.certifications as string[])?.length > 0 ? e.certifications : null,
        }));
        toast.success("Lead enriched");
        router.refresh();
      } else {
        setLiveLead((prev) => ({ ...prev, enrichment_status: "failed" }));
        toast.error((json as { error?: string }).error ?? "Enrichment failed");
      }
    } catch {
      toast.error("Enrichment failed — please retry");
    } finally {
      setEnriching(false);
    }
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

  function sendOutreach() {
    const message = channel === "whatsapp" ? waOpener : emailOpener;
    const subject = channel === "email" ? emailSubject : undefined;
    if (!message) { toast.error("Generate an opener first"); return; }

    let actionUrl: string | null = null;
    if (channel === "whatsapp" && phone) {
      const digits = phone.replace(/\D/g, "");
      let e164 = digits;
      if (digits.startsWith("0") && digits.length === 10) e164 = "254" + digits.slice(1);
      else if (digits.startsWith("7") && digits.length === 9) e164 = "254" + digits;
      actionUrl = `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
    } else if (channel === "email" && email) {
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      params.set("body", message);
      actionUrl = `mailto:${email}?${params.toString()}`;
    }

    if (!actionUrl) {
      toast.error(channel === "whatsapp" ? "No phone number" : "No email address");
      return;
    }

    window.location.href = actionUrl;

    const isFirstSend = !sentWa && !sentEmail;
    if (channel === "whatsapp") { setSentWa(true); toast.success("WhatsApp opened — tap Send"); }
    else                        { setSentEmail(true); toast.success("Mail app opened — tap Send"); }

    if (isFirstSend) setShowReferral(true);
    setContactedAt(new Date().toISOString());
    fetch("/api/outreach", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, channel, message, subject }),
    }).catch(() => {});
  }

  async function copyActive() {
    const text = channel === "whatsapp" ? waOpener : emailOpener;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeReasoning = liveReasoning || reasoning;
  const hasOpeners      = !!(waOpener || emailOpener);
  const isStreaming     = generating && !!liveRaw;
  const activeOpener    = channel === "whatsapp" ? waOpener : emailOpener;
  const canSend         = (channel === "whatsapp" && !!waOpener && !!phone)
                        || (channel === "email"    && !!emailOpener && !!email);

  const scoreStyle = displayScore != null
    ? { borderColor: scoreBorderColor(displayScore) }
    : {};

  return (
    <div className="flex min-h-full">

      {/* ── Left: main content ────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 p-4 md:p-6 pb-24 md:pb-6 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold truncate" style={{ color: "var(--text-1)" }}>
              {name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs" style={{ color: "var(--text-3)" }}>
              <span>{vertical}</span>
              {city && <><span>·</span><span>{city}</span></>}
              {googleRating != null && (
                <span className="flex items-center gap-1">
                  <span>·</span>
                  <IconStar size={12} fill="currentColor" className="text-yellow-400" />
                  {googleRating} ({reviewCount?.toLocaleString()})
                </span>
              )}
            </div>
          </div>
          <StageSelector leadId={lead.id as string} currentStage={lead.stage as string} />
        </div>

        {/* Top cards: Contact | AI Score | Enrichment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Contact */}
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {phone && (
                <div className="flex items-center gap-2">
                  <IconPhone size={16} className="shrink-0" style={{ color: "var(--text-3)" }} />
                  <a href={`tel:${phone}`} className="text-sm hover:underline" style={{ color: "var(--text-2)" }}>
                    {phone}
                  </a>
                </div>
              )}
              {(emailsFound?.length || email) && (
                <div className="flex items-start gap-2">
                  <IconMail size={16} className="shrink-0 mt-0.5" style={{ color: "var(--text-3)" }} />
                  <div className="min-w-0">
                    {email && <p className="text-sm truncate" style={{ color: "var(--text-2)" }}>{email}</p>}
                    {emailsFound?.filter((e) => e !== email).map((e) => (
                      <p key={e} className="text-xs truncate" style={{ color: "var(--text-3)" }}>{e}</p>
                    ))}
                  </div>
                </div>
              )}
              {website && (
                <div className="flex items-center gap-2">
                  <IconWorld size={16} className="shrink-0" style={{ color: "var(--text-3)" }} />
                  <a
                    href={website} target="_blank" rel="noopener noreferrer"
                    className="text-sm truncate flex items-center gap-1 hover:underline" style={{ color: "var(--text-2)" }}
                  >
                    {(() => { try { return new URL(website).hostname; } catch { return website; } })()}
                    <IconExternalLink size={12} className="opacity-50 shrink-0" />
                  </a>
                </div>
              )}
              {address && (
                <div className="flex items-start gap-2">
                  <IconMapPin size={16} className="shrink-0 mt-0.5" style={{ color: "var(--text-3)" }} />
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>{address}</span>
                </div>
              )}
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600">
                  View on Maps <IconExternalLink size={12} />
                </a>
              )}
            </CardContent>
          </Card>

          {/* AI Score */}
          <Card style={scoreStyle}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Score</CardTitle>
                {displayScore != null && (
                  <span className={`text-2xl font-black tabular-nums ${scoreTextColor(displayScore)}`}>
                    {displayScore}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {scoring && !activeReasoning && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-3)" }}>
                  <IconBolt size={14} className="text-yellow-400 animate-pulse" /> Analysing…
                </div>
              )}
              {activeReasoning && (
                <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-2)" }}>
                  {activeReasoning}
                  {scoring && (
                    <span className="inline-block w-0.5 h-3 ml-0.5 animate-pulse" style={{ background: "var(--text-2)" }} />
                  )}
                </p>
              )}
              {!scoring && painSignals.length > 0 && (
                <div>
                  <p className="text-xs mb-2 font-medium" style={{ color: "var(--text-3)" }}>Pain signals</p>
                  <div className="flex flex-wrap gap-1">
                    {painSignals.map((s) => <Badge key={s} variant="red" className="text-xs">{s}</Badge>)}
                  </div>
                </div>
              )}
              {!scoring && displayScore == null && !activeReasoning && (
                <div className="text-center py-4">
                  <IconBolt size={24} className="mx-auto mb-2" style={{ color: "var(--text-3)" }} />
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>Not scored yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Guide (replaces sparse Enrichment card after enrichment) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{enrichStatus === "done" ? "Call Guide" : "Enrichment"}</CardTitle>
                {enriching
                  ? <IconRefresh size={16} className="animate-spin" style={{ color: "var(--text-3)" }} />
                  : enrichStatus === "done"
                    ? <IconCircleCheck size={16} className="text-green-500" />
                    : enrichStatus === "failed"
                      ? <IconAlertCircle size={16} className="text-red-400" />
                      : <IconClock size={16} style={{ color: "var(--text-3)" }} />}
              </div>
            </CardHeader>
            <CardContent>
              {enriching ? (
                <div className="flex items-center gap-2 py-2 text-xs" style={{ color: "var(--text-3)" }}>
                  <IconRefresh size={14} className="animate-spin" /> Crawling website…
                </div>
              ) : enrichStatus === "done" ? (
                <CallGuide
                  vertical={vertical}
                  dmName={liveLead.decision_maker_name as string | undefined}
                  rawGaps={callGuideGaps}
                />
              ) : enrichStatus === "failed" ? (
                <div className="text-center py-4 space-y-2">
                  <IconAlertCircle size={20} className="mx-auto text-red-400" />
                  <p className="text-xs text-red-500">Enrichment failed</p>
                  <Button variant="ghost" size="sm" onClick={doEnrich} className="text-xs">
                    Retry
                  </Button>
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Not enriched yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Business Intelligence (non-xl: sidebar is hidden, show inline) ─ */}
        <div className="xl:hidden">
          <Card>
            <CardContent className="p-0">
              <IntelPanel lead={liveLead} onEnrich={doEnrich} enriching={enriching} />
            </CardContent>
          </Card>
        </div>

        {/* ── Outreach ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle>Outreach</CardTitle>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={doEnrich} loading={enriching}>
                  <IconRefresh size={14} /> Enrich
                </Button>
                <Button variant="outline" size="sm" onClick={doScore} loading={scoring}>
                  <IconBolt size={14} /> Score
                </Button>
                <Button
                  size="sm"
                  onClick={doOpener}
                  loading={generating}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                >
                  <IconBolt size={14} />
                  {hasOpeners ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>

            {/* Channel tabs */}
            {(hasOpeners || isStreaming) && (
              <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: "var(--bg-elevated)" }}>
                {([
                  { id: "whatsapp" as Channel, icon: <IconMessageCircle size={14} />, label: "WhatsApp", sent: sentWa,   active: "bg-green-600" },
                  { id: "email"    as Channel, icon: <IconMail           size={14} />, label: "Email",    sent: sentEmail, active: "bg-blue-600"  },
                ] as { id: Channel; icon: React.ReactNode; label: string; sent: boolean; active: string }[]).map(({ id, icon, label, sent, active }) => (
                  <button
                    key={id}
                    onClick={() => setChannel(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      channel === id ? `${active} text-white` : "hover:opacity-70"
                    }`}
                    style={channel !== id ? { color: "var(--text-3)" } : {}}
                  >
                    {icon} {label}
                    {sent && <IconCheck size={12} />}
                  </button>
                ))}
              </div>
            )}

            {/* Subject line — editable input */}
            {channel === "email" && (emailSubject || isStreaming) && (
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject line…"
                disabled={isStreaming}
                className="w-full mb-3 rounded-md border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border)",
                  color: "var(--text-1)",
                }}
              />
            )}

            {/* Message body */}
            {isStreaming ? (
              <div
                className="rounded-lg border p-4 mb-4"
                style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-1)" }}>
                  {liveRaw}
                  <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse" style={{ background: "var(--text-2)" }} />
                </p>
              </div>
            ) : activeOpener ? (
              <div className="relative mb-4">
                <textarea
                  value={activeOpener}
                  onChange={(e) =>
                    channel === "whatsapp" ? setWaOpener(e.target.value) : setEmailOpener(e.target.value)
                  }
                  rows={9}
                  className="w-full rounded-lg border px-4 py-3 pr-10 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-amber-500"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--border)",
                    color: "var(--text-1)",
                  }}
                />
                <button
                  onClick={copyActive}
                  className="absolute top-3 right-3 transition-colors"
                  style={{ color: "var(--text-3)" }}
                >
                  {copied
                    ? <IconCheck size={14} className="text-green-500" />
                    : <IconCopy size={14} />}
                </button>
              </div>
            ) : null}

            {/* Generating placeholder */}
            {!hasOpeners && !isStreaming && (
              <div className="text-center py-8" style={{ color: "var(--text-3)" }}>
                <IconMessageCircle size={32} className="mx-auto mb-2 opacity-40 animate-pulse" />
                <p className="text-sm">
                  {generating ? "Writing personalised messages…" : "Generating messages for this business…"}
                </p>
                <p className="text-xs mt-1 opacity-60">Enriching first gives smarter, more specific copy</p>
              </div>
            )}

            {/* Send button */}
            {hasOpeners && !isStreaming && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={sendOutreach}
                  disabled={!canSend}
                  className={`${
                    channel === "whatsapp" ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500"
                  } text-white`}
                >
                  <IconSend size={14} />
                  {channel === "whatsapp" ? "Open in WhatsApp" : "Open in Mail"}
                </Button>
                {channel === "whatsapp" && !phone && (
                  <p className="text-xs text-amber-500">No phone number — enrich first or add manually</p>
                )}
                {channel === "email" && !email && (
                  <p className="text-xs text-amber-500">No email found — enrich first or add manually</p>
                )}
                {canSend && (
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    {channel === "whatsapp"
                      ? "Opens WhatsApp with message pre-filled — you tap Send"
                      : "Opens Mail with subject & body — you tap Send"}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Call notes, follow-up reminders, context…"
              className="w-full rounded-md border px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--border)",
                color: "var(--text-1)",
              }}
            />
            <Button variant="outline" size="sm" onClick={saveNotes} loading={saving} className="mt-2">
              Save
            </Button>
          </CardContent>
        </Card>

        {/* ── Follow-up sequence ───────────────────────────────────────────── */}
        {hasOpeners && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle>Follow-up Sequence</CardTitle>
                {!sequence && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={doSequence}
                    loading={generatingSeq}
                  >
                    <IconBolt size={14} />
                    {generatingSeq ? "Generating…" : "Generate Day 3 & 7"}
                  </Button>
                )}
                {sequence && (
                  <Button size="sm" variant="outline" onClick={doSequence} loading={generatingSeq}>
                    <IconRefresh size={14} /> Regenerate
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!sequence && !generatingSeq && (
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  Hormozi says 3 touches minimum. Generate Day 3 (value-add) and Day 7 (final close) messages in one click.
                </p>
              )}
              {generatingSeq && (
                <div className="flex items-center gap-2 text-xs py-1" style={{ color: "var(--text-3)" }}>
                  <IconBolt size={14} className="animate-pulse text-amber-500" /> Writing follow-ups…
                </div>
              )}
              {sequence && (
                <div className="space-y-4">
                  {([
                    { day: "Day 3", label: "Value-add follow-up", wa: sequence.day3wa, emailSubject: sequence.day3subject, email: sequence.day3email },
                    { day: "Day 7", label: "Final close",          wa: sequence.day7wa, emailSubject: sequence.day7subject, email: sequence.day7email },
                  ] as { day: string; label: string; wa: string; emailSubject: string; email: string }[]).map(({ day, label, wa, emailSubject, email: em }) => (
                    <SequenceDay key={day} day={day} label={label} wa={wa} emailSubject={emailSubject} email={em} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Referral nudge (shown after first outreach) ───────────────────── */}
        {showReferral && (
          <div
            className="rounded-xl border px-4 py-4 flex items-start gap-3"
            style={{ background: "var(--brand-dim)", borderColor: "var(--brand-glow)" }}
          >
            <IconBolt size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-1)" }}>
                First message sent. Know someone else building pipeline?
              </p>
              <p className="text-xs mb-2" style={{ color: "var(--text-2)" }}>
                Send them to 4unter — you get a free month when they subscribe.
              </p>
              <ReferralCopyButton />
            </div>
            <button
              onClick={() => setShowReferral(false)}
              className="text-xs shrink-0"
              style={{ color: "var(--text-3)" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Outcome feedback ──────────────────────────────────────────────── */}
        <LeadFeedbackPanel
          leadId={lead.id as string}
          contactedAt={contactedAt}
          existingOutcome={lastOutcome}
          onSaved={(outcome) => setLastOutcome(outcome)}
        />
      </div>

      {/* ── Right: Business Intelligence (xl+ only) ────────────────────────── */}
      <div
        className="hidden xl:block w-80 shrink-0 sticky top-0 h-screen overflow-y-auto"
        style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-surface)" }}
      >
        <IntelPanel lead={liveLead} onEnrich={doEnrich} enriching={enriching} />
      </div>

    </div>
  );
}
