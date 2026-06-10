// Rule-based scoring and opener generation — no AI API required.

export interface LeadLike {
  name?: unknown;
  vertical?: unknown;
  city?: unknown;
  google_rating?: unknown;
  google_review_count?: unknown;
  website?: unknown;
  has_booking_system?: unknown;
  has_live_chat?: unknown;
  phone?: unknown;
  email?: unknown;
  pain_signals?: unknown;
  tech_stack?: unknown;
  digital_readiness_score?: unknown;
  reachability_score?: unknown;
  decision_maker_name?: unknown;
  decision_maker_title?: unknown;
  score?: unknown;
}

export interface OrgLike {
  business_name?: unknown;
  name?: unknown;
  sender_name?: unknown;
  org_description?: unknown;
  target_description?: unknown;
  priority_signals?: unknown;
  outreach_channel?: unknown;
}

export interface ScoreResult {
  score: number;
  reasoning: string;
  pain_signals: string[];
}

export interface OpenerResult {
  whatsapp: string;
  subject: string;
  email: string;
}

const VERTICAL_PAIN: Record<string, string> = {
  dental:        "Most dental clinics lose 20–30% of appointment slots to no-shows and don't follow up with patients automatically.",
  clinic:        "Clinics typically miss after-hours enquiries and have no automated patient follow-up — the first practice to respond wins.",
  hotel:         "Hotels lose direct bookings to OTAs and pay 15–25% commission they don't need to.",
  real_estate:   "Real estate agencies miss leads that come in outside office hours — usually the serious ones.",
  law_firm:      "Law firms rarely follow up on initial enquiries quickly, losing clients to whoever responds first.",
  gym:           "Gyms lose members silently — no automated re-engagement for people who stop showing up.",
  restaurant:    "Restaurants with no online booking system lose reservations to competitors who make it one tap.",
  minimart:      "Most dukas and mini-marts lose repeat customers because there's no way to browse stock or order remotely.",
  insurance:     "Insurance agents spend 60–70% of their week on cold prospecting. The ones who close consistently know who to call before the call.",
  sacco:         "SACCOs lose member interest between AGMs because there's no channel to communicate loan products between meetings.",
  school:        "Schools fill classroom capacity by word of mouth, which caps enrolment. The ones growing fastest have a structured way to reach parents before registration season.",
  logistics:     "Logistics companies win contracts because they respond first with a clear quote — most lose to whoever picked up the phone faster.",
  pharmacy:      "Pharmacies compete on price alone — the ones that win long-term own the customer relationship via WhatsApp or loyalty.",
  salon:         "Salons run on referrals with no way to re-activate clients who haven't booked in 60+ days — that's recoverable revenue sitting idle.",
  construction:  "Contractors win tenders by relationship, not visibility — a structured digital presence turns that into a reliable inbound pipeline.",
  agriculture:   "Smallholder agri-businesses miss bulk buyers because their supply and capacity are invisible outside their immediate network.",
  accounting:    "Accounting firms in Kenya lose SME clients at year-end because competitors market more aggressively during filing season.",
  consultancy:   "Consultancies grow by referral and stall when the network saturates — a structured outreach system turns expertise into a replicable sales motion.",
  it_company:    "Most IT firms in Kenya win clients through personal introductions and lose to competitors who followed up first.",
  digital_agency:"Digital agencies are hired by whoever has the most visible proof of results at the moment a client decides to spend.",
  auto_workshop: "Car owners are loyal to one mechanic — until they have a bad experience. Workshops that retain clients long-term have a proactive communication channel.",
  driving_school:"Driving school enrolment spikes at year-end. The ones that fill up first reached their waitlist before the rush — not during it.",
  security_firm: "Security contracts are won on trust and visibility before a client ever needs a proposal.",
  tutoring:      "Parents choose tutoring centres based on word-of-mouth and first impressions during intake season. The ones that fill up have structured parent communication year-round.",
  catering:      "Catering companies book their best events from clients they've already served — but most lose those relationships between events because there's no follow-up channel.",
  bakery:        "Artisan bakeries turn occasional buyers into weekly regulars through pre-order systems — without it, they compete on walk-in traffic alone.",
  print_shop:    "Print companies win corporate accounts before the tender. The relationship starts with a proactive sample delivery and personalised follow-up — not a cold quote.",
  car_dealer:    "Car dealers lose leads to competitors who respond to enquiries faster — the first to follow up wins the sale.",
  event_venue:   "Event venues lose bookings to whoever responds first with a clear availability and pricing — most enquiries go cold within 24 hours.",
  physio:        "Most physio clients drop out before full recovery because nobody follows up after the second session.",
  visa_agency:   "Visa agencies win repeat business from clients who feel looked after between applications — most lose referrals to competitors who followed up first.",
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function ruleBasedScore(lead: LeadLike, org: OrgLike | null): ScoreResult {
  let s = 0;
  const detected: string[] = [];

  const dr      = typeof lead.digital_readiness_score === "number" ? lead.digital_readiness_score : 40;
  const reach   = typeof lead.reachability_score      === "number" ? lead.reachability_score      : 40;
  const rating  = typeof lead.google_rating           === "number" ? lead.google_rating           : 0;
  const reviews = typeof lead.google_review_count     === "number" ? lead.google_review_count     : 0;
  const hasBook = lead.has_booking_system;
  const hasChat = lead.has_live_chat;
  const pains   = Array.isArray(lead.pain_signals) ? (lead.pain_signals as string[]) : [];
  const name    = typeof lead.name     === "string" ? lead.name     : "This business";
  const vertical= typeof lead.vertical === "string" ? lead.vertical : "business";
  const city    = typeof lead.city     === "string" ? lead.city     : "";

  // Digital readiness (0–100) → up to 20 pts
  s += Math.round(dr * 0.20);

  // Reachability (0–100) → up to 20 pts
  s += Math.round(reach * 0.20);

  // Google rating → up to 15 pts
  if      (rating >= 4.5) s += 15;
  else if (rating >= 4.0) s += 10;
  else if (rating >= 3.5) s += 5;

  // Review volume → up to 8 pts
  if      (reviews >= 200) { s += 8; detected.push(`${reviews} reviews`); }
  else if (reviews >= 50)  { s += 5; detected.push(`${reviews} reviews`); }
  else if (reviews >= 10)    s += 2;

  // Gap signals: no booking / no chat = high opportunity → up to 13 pts
  if (hasBook === false) { s += 8; detected.push("no booking system"); }
  if (hasChat === false) { s += 5; detected.push("no live chat"); }

  // Vertical gap signals from enrichment → up to 12 pts
  const gapSignals = pains.filter(x => x.startsWith("gap:"));
  s += Math.min(12, gapSignals.length * 6);
  for (const g of gapSignals.slice(0, 2)) detected.push(g.replace("gap: ", ""));

  // No website = low ceiling
  if (!lead.website) s = Math.min(s, 35);

  // Org priority signal match → up to 5 pts
  const priorities = Array.isArray(org?.priority_signals) ? (org!.priority_signals as string[]) : [];
  if (priorities.length > 0) {
    const leadStr = JSON.stringify(lead).toLowerCase();
    const match = priorities.find(p => leadStr.includes(p.toLowerCase()));
    if (match) { s += 5; detected.push(`matches: ${match}`); }
  }

  if (lead.email || lead.phone) detected.push("contact info available");

  const score = Math.min(100, Math.max(5, s));

  // Build reasoning
  const parts: string[] = [];
  if (rating > 0) {
    parts.push(`${name} is a ${vertical} in ${city} with a ${rating}★ Google rating (${reviews} reviews).`);
  } else {
    parts.push(`${name} is a ${vertical} in ${city}.`);
  }
  const oppSignals = detected.filter(d => d.includes("no ") || d.startsWith("gap"));
  if (oppSignals.length > 0) parts.push(`Opportunity signals: ${oppSignals.join(", ")}.`);
  parts.push(reach >= 60
    ? "Contact details available — outreach can proceed directly."
    : "Limited contact details found — manual research may be needed."
  );

  return { score, reasoning: parts.join(" "), pain_signals: [...new Set(detected)].slice(0, 4) };
}

// ─── Opener ───────────────────────────────────────────────────────────────────

export function buildRuleBasedOpener(lead: LeadLike, org: OrgLike | null): OpenerResult {
  const name     = typeof lead.name                 === "string" ? lead.name                 : "there";
  const vertical = typeof lead.vertical             === "string" ? lead.vertical             : "";
  const city     = typeof lead.city                 === "string" ? lead.city                 : "Nairobi";
  const rating   = typeof lead.google_rating        === "number" ? lead.google_rating        : null;
  const reviews  = typeof lead.google_review_count  === "number" ? lead.google_review_count  : 0;
  const hasBook  = lead.has_booking_system;
  const hasChat  = lead.has_live_chat;
  const pains    = Array.isArray(lead.pain_signals)  ? (lead.pain_signals  as string[]) : [];
  const tech     = Array.isArray(lead.tech_stack)    ? (lead.tech_stack    as string[]).join(", ") : "";
  const dmName   = typeof lead.decision_maker_name  === "string" ? lead.decision_maker_name  : null;
  const dmTitle  = typeof lead.decision_maker_title === "string" ? lead.decision_maker_title : null;

  const senderName = (org?.sender_name as string) || (org?.name as string) || "Ian";
  const bizName    = (org?.business_name as string) || (org?.name as string) || "DDi";
  const bizDesc    = (org?.org_description as string) || "AI automation for local businesses";

  const firstName  = dmName ? dmName.split(" ")[0] : name.split(" ")[0];
  const dmLine     = dmName ? `${dmName}${dmTitle ? `, ${dmTitle}` : ""}` : null;
  const vertPain   = (org?.target_description as string) || VERTICAL_PAIN[vertical] || `Many local businesses miss leads outside office hours.`;

  // Pick the strongest gap/signal
  let waObservation = "";
  let gapLabel = "";
  let ctaQuestion = "";
  let emailObs = "";
  let gapCost = vertPain;

  if (hasBook === false) {
    waObservation = `you have no online booking system`;
    gapLabel      = "no online booking";
    ctaQuestion   = "How are you managing appointment requests right now?";
    emailObs      = `${name} has no online booking system`;
  } else if (hasChat === false) {
    waObservation = `there's no live chat or WhatsApp button on your website`;
    gapLabel      = "no live contact channel";
    ctaQuestion   = "How do clients reach you after hours?";
    emailObs      = `${name} has no live chat or WhatsApp contact on the website`;
    gapCost       = "Businesses without a live contact channel miss 30–40% of after-hours enquiries.";
  } else if (pains.some(p => p.startsWith("gap:"))) {
    const topGap  = pains.find(p => p.startsWith("gap:"))!.replace("gap: ", "");
    waObservation = `we noticed a gap on your end: ${topGap}`;
    gapLabel      = topGap;
    ctaQuestion   = "Is that something you're looking to fix this quarter?";
    emailObs      = `${name} has a visibility gap: ${topGap}`;
  } else if (rating !== null && rating < 4.0) {
    waObservation = `you're currently at ${rating}★ on Google`;
    gapLabel      = `${rating}★ Google rating`;
    ctaQuestion   = "Would you want to address that before peak season?";
    emailObs      = `${name} is currently at ${rating}★ on Google (${reviews} reviews)`;
    gapCost       = "A rating below 4★ reduces click-through from Google Maps by up to 35%.";
  } else if (tech && !tech.includes("Google Analytics") && !tech.includes("Meta Pixel")) {
    waObservation = `you have no tracking or analytics on your site`;
    gapLabel      = "no analytics detected";
    ctaQuestion   = "Are you tracking where your clients come from?";
    emailObs      = `${name} has no analytics or ad tracking on the site`;
    gapCost       = "Without tracking, ad spend is guesswork — most businesses lose 20–30% of budget to channels that don't convert.";
  } else {
    waObservation = `you're one of the established ${vertical || "local"} businesses in ${city}`;
    gapLabel      = `growth opportunity in ${city}`;
    ctaQuestion   = "Are you open to a quick conversation about what's working for similar businesses here?";
    emailObs      = `${name} is an established ${vertical || "business"} in ${city}`;
  }

  // WhatsApp — under 40 words, no sign-off
  const whatsapp = `Hi ${firstName}, noticed ${waObservation}. ${ctaQuestion}`;

  // Email subject — 7 words max
  const subject = `${name}: ${gapLabel}`;

  // Email body — 5 sentences + sign-off
  const dmSalutation = dmLine ? `${dmLine} at ` : "";
  const email = [
    `${dmSalutation}${emailObs} — and that's costing you enquiries.`,
    gapCost,
    `${bizName} helps ${vertical || "local"} businesses in ${city} fix this with AI-powered systems, typically live within 2 weeks.`,
    `Our clients see a 30–40% reduction in missed enquiries in the first month.`,
    `Worth a 15-minute call this week?\n\n${senderName} | ${bizName}`,
  ].join(" ");

  return { whatsapp, subject, email };
}
