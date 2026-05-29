export interface OrgProfile {
  use_case?: string | null;
  priority_signals?: string[] | null;
  target_description?: string | null;
  org_description?: string | null;
}

export function isSafeUrl(raw: string): boolean {
  let parsed: URL;
  try { parsed = new URL(raw); } catch { return false; }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  const h = parsed.hostname.toLowerCase();

  if (/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(h)) return false;
  if (/^\d+\.\d+$/.test(h) || /^\d+\.\d+\.\d+$/.test(h)) return false;
  if (h === "localhost" || h === "0.0.0.0" || h === "::1") return false;
  if (/^127\./.test(h)) return false;
  if (/^10\./.test(h)) return false;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return false;
  if (/^192\.168\./.test(h)) return false;
  if (/^169\.254\./.test(h)) return false;
  if (h === "metadata.google.internal") return false;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;

  return true;
}

async function fetchPage(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Hunter-Enricher/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ─── Custom signal detection ──────────────────────────────────────────────────

function detectCustomSignals(html: string, org: OrgProfile): string[] {
  const found: string[] = [];
  const h = html.toLowerCase();
  const priorities = new Set(org.priority_signals ?? []);
  const useCase = (org.use_case ?? "").toLowerCase();

  // Established / maturity
  if (
    /(?:since|est\.?|established|founded)\s*(?:19|20)\d{2}/.test(h) ||
    /\b(?:1[0-9]|20)\+?\s*years?\s+(?:of\s+)?(?:experience|service|operation)/.test(h)
  ) {
    const yearMatch = h.match(/(?:since|est\.?|established|founded)\s*((?:19|20)\d{2})/);
    found.push(yearMatch ? `established ${yearMatch[1]}` : "established business");
  }

  // Expansion / growth
  if (/new\s+(?:branch|location|outlet|office)|now\s+open(?:ed)?|expanding|opening\s+soon|second\s+(?:branch|location)/.test(h)) {
    found.push("expanding/growing");
  }

  // Bulk / wholesale (relevant for distributors, agri, manufacturers)
  if (/wholesale|bulk\s+(?:order|purchase|supply)|minimum\s+order|\bmoq\b|trade\s+price|large\s+orders/.test(h)) {
    found.push("wholesale/bulk supplier");
  }

  // Budget / pricing
  if (priorities.has("budget") || priorities.has("no_digital")) {
    if (/affordable|best\s+price|competitive\s+pric|value\s+for\s+money|cost[\s-]effective/.test(h)) {
      found.push("budget/competitive pricing");
    } else if (/premium|luxury|exclusive|upscale|high[\s-]end/.test(h)) {
      found.push("premium positioning");
    }
  }

  // Geographic reach
  if (/nationwide|all\s+counties|across\s+kenya|(?:delivery|shipping)\s+(?:across|to all|countrywide)/.test(h)) {
    found.push("nationwide reach");
  }

  // Digital gaps (absence signals — scored later by AI but surfaced here)
  if (priorities.has("no_digital") || priorities.has("gap")) {
    const hasAnalytics = /gtag\(|google-analytics|googletagmanager|analytics\.js/.test(h);
    if (!hasAnalytics) found.push("no web analytics detected");
    const hasCrm = /hubspot|salesforce|zoho\s+crm|pipedrive|freshsales/.test(h);
    if (!hasCrm) found.push("no CRM detected");
  }

  // Reachability
  if (priorities.has("reachable")) {
    const hasWa = /wa\.me\/\d{10,}/.test(html);
    if (hasWa) found.push("WhatsApp contact found");
  }

  // Active hiring — relevant for recruiters
  if (
    useCase.includes("recruit") || useCase.includes("hr") || useCase.includes("staffing") ||
    priorities.has("growing")
  ) {
    if (/careers|vacancies|job\s+opening|apply\s+now|we(?:'re|\s+are)\s+hiring/.test(h)) {
      found.push("active hiring");
    }
  }

  // Agriculture / food / supply chain
  if (
    useCase.includes("agri") || useCase.includes("farm") || useCase.includes("food") ||
    useCase.includes("distributor") || useCase.includes("wholesale")
  ) {
    if (/farm|crop|harvest|produce|agri|fresh\s+(?:produce|food|fruit|veg)|food\s+processing/.test(h)) {
      found.push("agri/food business");
    }
    if (/organic\s+certified|kebs|haccp|iso\s*22000|gmp\s+certified|kenya\s+bureau/.test(h)) {
      found.push("certified produce");
    }
    if (/delivery|logistics|supply\s+chain|distributor|nationwide\s+delivery/.test(h)) {
      found.push("distribution network");
    }
  }

  // Finance / lending / insurance
  if (useCase.includes("financ") || useCase.includes("insur") || useCase.includes("lend") || useCase.includes("bank")) {
    if (/loan|credit|financing|interest\s+rate|mortgage|insurance\s+cover|premium\s+plan/.test(h)) {
      found.push("financial products listed");
    }
    if (/licensed|regulated|cma|ira kenya|central\s+bank/.test(h)) {
      found.push("regulated/licensed");
    }
  }

  // Digital / agency — detect tech gaps
  if (
    useCase.includes("agency") || useCase.includes("digital") ||
    useCase.includes("developer") || useCase.includes("software") || useCase.includes("tech")
  ) {
    const hasModernAnalytics = /gtag\(|googletagmanager/.test(h);
    if (!hasModernAnalytics) found.push("no analytics — acquisition gap");
    const hasPixel = /fbevents\.js|connect\.facebook\.net/.test(h);
    if (!hasPixel) found.push("no meta pixel");
  }

  // Manufacturer / production
  if (useCase.includes("manufactur") || useCase.includes("produc") || useCase.includes("factory")) {
    if (/factory|production\s+capacity|manufacturing|made\s+in\s+kenya|iso\s*9001/.test(h)) {
      found.push("manufacturing/production");
    }
    if (/oem|private\s+label|contract\s+manufactur/.test(h)) {
      found.push("contract manufacturing");
    }
  }

  return [...new Set(found)];
}

// ─── Tech / booking / chat detection (unchanged) ─────────────────────────────

function extractEmails(html: string): string[] {
  const all = html.match(/[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,64}\.[a-zA-Z]{2,}/g) ?? [];
  const blocked = ["@sentry", "@example", "@w3.org", "@schema", "@2x", ".png", ".jpg", ".gif", "@jquery"];
  return [...new Set(all.filter((e) => !blocked.some((b) => e.includes(b))))].slice(0, 5);
}

function detectTechStack(html: string): string[] {
  const stack: string[] = [];
  const checks: [string, string[]][] = [
    ["WordPress",        ["wp-content", "wp-includes", "wp-json"]],
    ["Wix",              ["wix.com", "_wix_", "wixstatic.com"]],
    ["Squarespace",      ["squarespace.com", "squarespace-cdn", "sqsp.net"]],
    ["Shopify",          ["shopify.com", "cdn.shopify", "myshopify.com"]],
    ["Next.js",          ["_next/static", "__NEXT_DATA__"]],
    ["Webflow",          ["webflow.com", "js.webflow.com"]],
    ["Elementor",        ["elementor-", "/elementor/"]],
    ["Bootstrap",        ["bootstrap.min.css", "bootstrap.bundle", "bootstrap.css"]],
    ["jQuery",           ["jquery.min.js", "jquery-", "/jquery.js"]],
    ["Google Analytics", ["gtag(", "google-analytics.com", "googletagmanager.com"]],
    ["Facebook Pixel",   ["fbevents.js", "connect.facebook.net"]],
  ];
  const h = html.toLowerCase();
  for (const [name, tokens] of checks) {
    if (tokens.some((t) => h.includes(t.toLowerCase()))) stack.push(name);
  }
  return stack;
}

function detectBookingSystem(html: string): boolean {
  const h = html.toLowerCase();
  const platforms = [
    "calendly.com", "cal.com", "acuityscheduling", "setmore", "simplybook",
    "booksy", "fresha.com", "appointy.com", "vagaro.com", "schedulicity",
    "mindbodyonline", "janeapp.com", "cliniko.com", "zoho.com/bookings",
    "square.site", "timely.is", "book.app",
  ];
  if (platforms.some((s) => h.includes(s))) return true;
  const phrases = [
    "book appointment", "book a consultation", "book online", "book now",
    "schedule appointment", "schedule a visit", "schedule a call",
    "make a booking", "request appointment", "reserve a slot",
    "online booking", "book a session",
  ];
  if (phrases.some((p) => h.includes(p))) return true;
  if (/wa\.me\/\d{10,}/.test(html) && /book|appointment|reserve|slot|schedule/i.test(html)) return true;
  return false;
}

function detectLiveChat(html: string): boolean {
  const h = html.toLowerCase();
  const platforms = [
    "intercom.io", "zendesk.com", "livechat.com", "tawk.to", "crisp.chat",
    "freshchat", "drift.com", "tidio.com", "smartsupp", "olark.com",
    "chatra.io", "purechat", "hubspot.com/conversations",
  ];
  if (platforms.some((s) => h.includes(s))) return true;
  if (/wa\.me\/\d{10,}/.test(html)) return true;
  if (h.includes("fb-customerchat") || h.includes("messenger.com/t/")) return true;
  return false;
}

function extractSocialLinks(html: string): Record<string, string> {
  const links: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ["facebook",  /https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|share)[^\s"'>?#]{3,}/i],
    ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'>?#]{2,}/i],
    ["twitter",   /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'>?#]{2,}/i],
    ["linkedin",  /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'>?#]+/i],
    ["youtube",   /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[^\s"'>?#]+/i],
    ["tiktok",    /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'>?#]+/i],
    ["whatsapp",  /https?:\/\/wa\.me\/\d{10,}/i],
  ];
  for (const [name, re] of patterns) {
    const m = html.match(re);
    if (m) links[name] = m[0];
  }
  return links;
}

// ─── Instagram bio fetch ─────────────────────────────────────────────────────

async function fetchInstagramBio(igUrl: string, signal: AbortSignal): Promise<string> {
  try {
    const html = await fetchPage(igUrl, signal);
    const m = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
           ?? html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/i);
    return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim() : "";
  } catch { return ""; }
}

// ─── Main export ─────────────────────────────────────────────────────────────

// Paths tried in order for booking/contact secondary page
const BOOKING_PATHS = ["/contact", "/book", "/booking", "/appointments", "/schedule"];

// Paths tried for About/Team contact discovery
const ABOUT_PATHS = [
  "/about", "/about-us", "/our-team", "/team", "/staff",
  "/management", "/doctors", "/our-doctors", "/lawyers", "/partners", "/people",
];

export interface EnrichResult {
  emails:           string[];
  techStack:        string[];
  hasBookingSystem: boolean;
  hasLiveChat:      boolean;
  socialLinks:      Record<string, string>;
  customSignals:    string[];
  aboutPageHtml:    string;   // raw HTML of the best About/Team page found (empty if none)
  instagramBio:     string;   // og:description from Instagram profile (empty if none)
}

export async function enrichWebsite(url: string, org?: OrgProfile): Promise<EnrichResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let html = "";
  let bookingHtml = "";
  let aboutPageHtml = "";

  try {
    html = await fetchPage(url, controller.signal);
    const base = new URL(url).origin;

    // Try booking/contact secondary pages
    for (const path of BOOKING_PATHS) {
      try {
        const extra = await fetchPage(base + path, controller.signal);
        if (extra.length > 500 && extra !== html) { bookingHtml = extra; break; }
      } catch { /* page doesn't exist */ }
    }

    // Try About/Team pages for contact discovery
    for (const path of ABOUT_PATHS) {
      try {
        const extra = await fetchPage(base + path, controller.signal);
        if (extra.length > 500 && extra !== html) { aboutPageHtml = extra; break; }
      } catch { /* page doesn't exist */ }
    }
  } finally {
    clearTimeout(timeout);
  }

  const combined = html + bookingHtml + aboutPageHtml;
  const socialLinks = extractSocialLinks(combined);

  // Fetch Instagram bio if we have the link
  let instagramBio = "";
  if (socialLinks.instagram && isSafeUrl(socialLinks.instagram)) {
    const igController = new AbortController();
    const igTimeout = setTimeout(() => igController.abort(), 5000);
    try {
      instagramBio = await fetchInstagramBio(socialLinks.instagram, igController.signal);
    } finally { clearTimeout(igTimeout); }
  }

  return {
    emails:           extractEmails(combined),
    techStack:        detectTechStack(combined),
    hasBookingSystem: detectBookingSystem(combined),
    hasLiveChat:      detectLiveChat(combined),
    socialLinks,
    customSignals:    org ? detectCustomSignals(combined, org) : [],
    aboutPageHtml,
    instagramBio,
  };
}
