"use client";
import { useState, useMemo } from "react";
import { RotateCcw, ChevronLeft } from "lucide-react";

type Stage = "call" | "qualify" | "pitch" | "close" | "objection" | "action" | "booked" | "exit";

type Node = {
  stage: Stage;
  title: string;
  script?: string;
  tip?: string;
  steps?: string[];
  options: Array<{ label: string; next: string; cls?: "green" | "red" | "amber" }>;
};

const STAGE_COLORS: Record<Stage, { badge: string; scriptBorder: string }> = {
  call:      { badge: "bg-blue-500/10 border-blue-400/30 text-blue-500",    scriptBorder: "#3b82f6" },
  qualify:   { badge: "bg-amber-500/10 border-amber-400/30 text-amber-500", scriptBorder: "#f59e0b" },
  pitch:     { badge: "bg-red-500/10 border-red-400/30 text-red-400",       scriptBorder: "#f87171" },
  close:     { badge: "bg-green-500/10 border-green-400/30 text-green-500", scriptBorder: "#22c55e" },
  objection: { badge: "bg-amber-500/10 border-amber-400/30 text-amber-500", scriptBorder: "#f59e0b" },
  action:    { badge: "bg-purple-500/10 border-purple-400/30 text-purple-400", scriptBorder: "#a78bfa" },
  booked:    { badge: "bg-green-500/10 border-green-400/30 text-green-500", scriptBorder: "#22c55e" },
  exit:      { badge: "bg-stone-400/10 border-stone-400/30 text-stone-400", scriptBorder: "#9ca3af" },
};

function buildNodes(lead: {
  vertical?: string;
  dmName?: string;
  rawGaps?: string[];
}): Record<string, Node> {
  const v    = lead.vertical ?? "business";
  const to   = lead.dmName ?? "the owner";
  const gaps = lead.rawGaps ?? [];

  const noBooking = gaps.some(g => g.includes("booking"));
  const noPayment = gaps.some(g => g.includes("payment"));
  const noChat    = gaps.some(g => g.includes("chat"));

  let painHook  = "the admin work slowing your team down";
  let pitchLine = "automate the repetitive work so your team only handles exceptions";
  if (noBooking) {
    painHook  = "managing bookings and appointments manually";
    pitchLine = "add an online booking system that fills your calendar automatically — no more phone tag";
  } else if (noPayment) {
    painHook  = "collecting payments manually";
    pitchLine = "add online payments so clients pay before they arrive";
  } else if (noChat) {
    painHook  = "following up with customers after each visit";
    pitchLine = "automate client follow-ups on WhatsApp so no one falls through the cracks";
  }

  return {
    open: {
      stage: "call", title: "Opening Line",
      script: `"Hi — is this ${to}? I'm calling about your ${v}. I help businesses like yours in Nairobi cut the admin work that eats into your day. Do you have 60 seconds?"`,
      tip: "Say it like you expected them to pick up. Pause after the question — let them respond.",
      options: [
        { label: "✅ Yes, speaking",             next: "qualify",    cls: "green" },
        { label: "👤 Gatekeeper / wrong person",  next: "gatekeeper" },
        { label: "⏰ Bad time right now",          next: "bad_time" },
        { label: "📵 No answer / hung up",         next: "no_answer",  cls: "red" },
      ],
    },
    qualify: {
      stage: "qualify", title: "Find the Pain",
      script: `"Quick question before anything else — what does your team spend the most time on that's repetitive? Things like ${painHook}, reporting, chasing documents?"`,
      tip: "Ask then go SILENT. Let them fill the gap. Whoever speaks first loses — and you already spoke.",
      options: [
        { label: "💡 They describe a real pain",       next: "pitch",              cls: "green" },
        { label: "😐 'We're fine, everything works'",  next: "obj_fine" },
        { label: "🚫 'Not interested'",                next: "obj_not_interested", cls: "red" },
        { label: "⏰ 'Too busy right now'",            next: "bad_time" },
      ],
    },
    pitch: {
      stage: "pitch", title: "The Pitch",
      script: `"That's exactly the problem we solve. We ${pitchLine}. Most ${v} businesses we work with save 15–20 hours a month in the first 30 days."`,
      tip: "Mirror their exact words back. If they said 'chasing invoices', say 'chasing invoices'. Don't switch to your language.",
      options: [
        { label: "➡️ Continue to the Ask", next: "cta", cls: "green" },
      ],
    },
    cta: {
      stage: "close", title: "Ask for the Meeting",
      script: `"I'm not going to sell you anything today. I just want 15 minutes on a call to show you exactly what this looks like for a ${v} business like yours. Tuesday or Wednesday — which works better?"`,
      tip: "Two specific days. Never 'when are you free?' — it puts the work on them and kills momentum.",
      options: [
        { label: "🎉 YES — they agree to a call",  next: "booked",            cls: "green" },
        { label: "💸 'Can't afford it right now'",  next: "obj_budget" },
        { label: "📧 'Send me information first'",  next: "obj_send_info",     cls: "amber" },
        { label: "🤔 'Let me think about it'",      next: "obj_think" },
        { label: "🚫 Hard no",                       next: "obj_not_interested", cls: "red" },
      ],
    },
    booked: {
      stage: "booked", title: "🎉 Call Booked!",
      steps: [
        "Confirm their email and send a calendar invite within 5 minutes of hanging up",
        "Ask: 'One thing — what's the single task taking most time? I'll build the demo around that.'",
        "Log in 4unter: stage → Contacted, note the booked time + their stated pain point",
        "WhatsApp: 'Great speaking! Calendar invite is on its way ✓'",
      ],
      options: [{ label: "🔄 Restart", next: "open", cls: "green" }],
    },
    gatekeeper: {
      stage: "qualify", title: "Gatekeeper",
      script: `"No problem — who handles the business decisions for the ${v}? I want to make sure I reach the right person."`,
      tip: "Get a name. Don't pitch the gatekeeper — save your energy for the decision maker.",
      options: [
        { label: "✅ Got the owner's name / contact", next: "open",          cls: "green" },
        { label: "🔒 No info — dead end",              next: "graceful_exit", cls: "red" },
      ],
    },
    bad_time: {
      stage: "qualify", title: "Bad Time",
      script: `"No problem at all — when's a better time? I'll call back at exactly that time."`,
      tip: "Always leave with a specific callback time. 'I'll call back' without a time = lost lead.",
      options: [
        { label: "📅 Got a specific callback time", next: "log_callback",  cls: "green" },
        { label: "🔒 No specific time given",        next: "graceful_exit", cls: "red" },
      ],
    },
    no_answer: {
      stage: "action", title: "No Answer",
      steps: [
        "Wait 2 hours and try again at a different time of day",
        "After a 2nd no answer, switch to WhatsApp instead",
        "WhatsApp: 'Hi — I called about automating your business admin. Good way to reach you?'",
        "Log the attempt in 4unter with the date and time tried",
      ],
      options: [{ label: "🔄 Restart", next: "open", cls: "green" }],
    },
    log_callback: {
      stage: "action", title: "Log the Callback",
      steps: [
        "Note the exact callback time in 4unter",
        "Set a phone alarm for 2 minutes before the agreed time",
        "WhatsApp: 'Hi [Name] — confirmed I'll call you [day] at [time].'",
        "Stage → Follow-up in 4unter",
      ],
      options: [{ label: "🔄 Start Next Call", next: "open", cls: "green" }],
    },
    obj_fine: {
      stage: "objection", title: "\"We're Fine\"",
      script: `"That's fair. Quick one before I go — what does your team currently do for ${painHook}? Just curious how you handle it."`,
      tip: "Pick something specific to their vertical. 'Everything is fine' is never fully true.",
      options: [
        { label: "💡 They open up",              next: "pitch",        cls: "green" },
        { label: "🔒 Genuinely fine — end call", next: "graceful_exit", cls: "red" },
      ],
    },
    obj_not_interested: {
      stage: "objection", title: "\"Not Interested\"",
      script: `"Completely understand. One last thing before I go — what's the biggest operational headache in your ${v} right now? Not pitching — just genuinely curious."`,
      tip: "Reframe from sales to research. People answer research questions far more openly.",
      options: [
        { label: "💡 They share a pain", next: "pitch",        cls: "green" },
        { label: "🔒 Hard no",            next: "graceful_exit", cls: "red" },
      ],
    },
    obj_budget: {
      stage: "objection", title: "\"Can't Afford It\"",
      script: `"The economy has been brutal — that's exactly why most clients came to us. Our entry package is KES 9,500/month. That's less than one day of a staff salary, and it saves 3–4 days of work. Can I show you the math in 15 minutes?"`,
      tip: "Never apologise for your price. Frame it as a comparison they already understand — staff cost.",
      options: [
        { label: "✅ 'That sounds reasonable'", next: "cta",          cls: "green" },
        { label: "💸 'Still too expensive'",     next: "obj_pilot" },
        { label: "🔒 No budget at all",          next: "graceful_exit", cls: "red" },
      ],
    },
    obj_pilot: {
      stage: "close", title: "The Pilot Offer",
      script: `"How about this — I build one automation for you, you run it for 30 days, and you tell me if it saved time. If it didn't, you've lost nothing but 15 minutes with me."`,
      tip: "A pilot closes the risk-averse buyer. Agree the specifics on the discovery call — not now.",
      options: [
        { label: "✅ They agree to a pilot", next: "booked",       cls: "green" },
        { label: "🔒 Still no",               next: "graceful_exit", cls: "red" },
      ],
    },
    obj_send_info: {
      stage: "objection", title: "\"Send Me Information\"",
      script: `"Of course. Before I do — is the biggest headache ${painHook}, client follow-ups, or something else? I want to send the right thing, not a generic brochure."`,
      tip: "Never send info without a diagnostic question first. Info without context = ignored email.",
      options: [
        { label: "💡 They specify a pain", next: "pitch",           cls: "green" },
        { label: "📄 'Just general info'", next: "action_send_info" },
      ],
    },
    action_send_info: {
      stage: "action", title: "Send Info + Follow Up",
      steps: [
        "Send a relevant one-pager or case study within 2 hours of the call",
        "Log in 4unter: stage → Contacted, notes: sent info on [topic]",
        "Set a 2-day reminder to follow up",
        "WhatsApp: 'Hi [Name] — checking the info I sent landed. Any questions?'",
      ],
      options: [{ label: "🔄 Start Next Call", next: "open", cls: "green" }],
    },
    obj_think: {
      stage: "objection", title: "\"Let Me Think About It\"",
      script: `"Of course. What would help you decide — is it about seeing results first, or understanding the investment better?"`,
      tip: "Diagnose before you respond. 'Think about it' means different things to different people.",
      options: [
        { label: "🧪 'Show me results first'",     next: "obj_pilot",    cls: "green" },
        { label: "💸 'It's the cost'",              next: "obj_budget" },
        { label: "📅 'Come back in a few months'",  next: "future_followup" },
      ],
    },
    future_followup: {
      stage: "action", title: "Future Follow-Up",
      steps: [
        "Lock in a specific month: 'I'll call you in the first week of August — agreed?'",
        "Log in 4unter: stage → Follow-up, note the agreed month",
        "WhatsApp: 'Great speaking! I'll touch base in [month] as agreed.'",
        "Set a calendar reminder for that month's first week",
      ],
      options: [{ label: "🔄 Start Next Call", next: "open", cls: "green" }],
    },
    graceful_exit: {
      stage: "exit", title: "Graceful Exit",
      script: `"Completely understand. Thanks for your time — if things ever change, you've got my number. Have a great day."`,
      tip: "End every call warmly. Today's 'no' is next quarter's 'yes' if you left a good impression.",
      steps: [
        "Log in 4unter: stage → Cold, note the objection type",
        "Tag for re-attempt in 60 days",
      ],
      options: [{ label: "🔄 Start Next Call", next: "open", cls: "green" }],
    },
  };
}

function optionClass(cls?: "green" | "red" | "amber") {
  const base = "w-full text-left px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all flex items-center justify-between gap-2 group";
  if (cls === "green") return `${base} border-green-500/25 hover:border-green-500/50 hover:bg-green-500/5 text-green-600`;
  if (cls === "red")   return `${base} border-red-400/25 hover:border-red-400/50 hover:bg-red-400/5 text-red-500`;
  if (cls === "amber") return `${base} border-amber-500/25 hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-600`;
  return base;
}

export function CallGuide({
  vertical,
  dmName,
  rawGaps,
}: {
  vertical?: string;
  dmName?: string;
  rawGaps?: string[];
}) {
  const [nodeKey, setNodeKey] = useState("open");
  const [history, setHistory] = useState<string[]>([]);

  const nodes = useMemo(
    () => buildNodes({ vertical, dmName, rawGaps }),
    [vertical, dmName, rawGaps],
  );

  const node  = nodes[nodeKey] ?? nodes["open"];
  const style = STAGE_COLORS[node.stage];

  function go(next: string) {
    setHistory(h => [...h, nodeKey]);
    setNodeKey(next);
  }

  function goBack() {
    setHistory(h => {
      const prev = [...h];
      const last = prev.pop();
      if (last) setNodeKey(last);
      return prev;
    });
  }

  return (
    <div className="space-y-2.5">
      {/* Stage badge + nav */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${style.badge}`}>
          {node.stage}
        </span>
        <div className="flex items-center gap-0.5">
          {history.length > 0 && (
            <button
              onClick={goBack}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-colors"
              style={{ color: "var(--text-3)" }}
            >
              <ChevronLeft className="h-2.5 w-2.5" /> Back
            </button>
          )}
          <button
            onClick={() => { setNodeKey("open"); setHistory([]); }}
            title="Restart"
            className="p-1 rounded transition-colors"
            style={{ color: "var(--text-3)" }}
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Node title */}
      <p className="text-xs font-bold leading-tight" style={{ color: "var(--text-1)" }}>
        {node.title}
      </p>

      {/* Script */}
      {node.script && (
        <div
          className="rounded-r-lg border-l-2 pl-2.5 pr-2 py-2 text-[11px] leading-relaxed italic"
          style={{
            borderLeftColor: style.scriptBorder,
            background: "var(--bg-elevated)",
            color: "var(--text-2)",
          }}
        >
          {node.script}
        </div>
      )}

      {/* Tip */}
      {node.tip && (
        <div
          className="rounded-lg px-2.5 py-1.5 text-[10px] leading-relaxed"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.18)",
            color: "#D4A24A",
          }}
        >
          💡 {node.tip}
        </div>
      )}

      {/* Action steps */}
      {node.steps && (
        <div className="space-y-1.5">
          {node.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "var(--text-2)" }}>
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold mt-0.5"
                style={{
                  background: "rgba(220,38,69,0.12)",
                  border: "1px solid rgba(220,38,69,0.25)",
                  color: "#DC2645",
                }}
              >
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      <div className="space-y-1 pt-0.5">
        {node.options.map((opt) => (
          <button
            key={opt.next}
            onClick={() => go(opt.next)}
            className={optionClass(opt.cls)}
            style={!opt.cls ? { borderColor: "var(--border)", color: "var(--text-2)" } : undefined}
          >
            <span>{opt.label}</span>
            <span
              className="text-[10px] opacity-40 group-hover:opacity-80 transition-all group-hover:translate-x-0.5"
              style={!opt.cls ? { color: "var(--text-3)" } : undefined}
            >
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
