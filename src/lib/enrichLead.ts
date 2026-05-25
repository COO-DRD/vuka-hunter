// Shared enrichment logic used by both /api/enrich (single) and /api/enrich/bulk

export function isSafeUrl(raw: string): boolean {
  let parsed: URL;
  try { parsed = new URL(raw); } catch { return false; }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  const h = parsed.hostname.toLowerCase();

  // Block non-dotted numeric/hex forms (e.g. 2130706433 = 127.0.0.1, 0x7f000001)
  if (/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(h)) return false;

  // Block short-form IPv4 (127.1, 192.168.1)
  if (/^\d+\.\d+$/.test(h) || /^\d+\.\d+\.\d+$/.test(h)) return false;

  // Loopback / unspecified
  if (h === "localhost" || h === "0.0.0.0" || h === "::1") return false;
  if (/^127\./.test(h)) return false;

  // Private IPv4
  if (/^10\./.test(h)) return false;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return false;
  if (/^192\.168\./.test(h)) return false;

  // Link-local + cloud metadata
  if (/^169\.254\./.test(h)) return false;
  if (h === "metadata.google.internal") return false;

  // Internal TLDs
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

export async function enrichWebsite(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let html = "";
  let extraHtml = "";

  try {
    html = await fetchPage(url, controller.signal);

    const base = new URL(url).origin;
    for (const path of ["/contact", "/book", "/booking", "/appointments", "/schedule"]) {
      try {
        const extra = await fetchPage(base + path, controller.signal);
        if (extra.length > 500 && extra !== html) { extraHtml = extra; break; }
      } catch { /* page doesn't exist */ }
    }
  } finally {
    clearTimeout(timeout);
  }

  const combined = html + extraHtml;
  return {
    emails:           extractEmails(combined),
    techStack:        detectTechStack(combined),
    hasBookingSystem: detectBookingSystem(combined),
    hasLiveChat:      detectLiveChat(combined),
    socialLinks:      extractSocialLinks(combined),
  };
}

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
    "chatra.io", "purechat", "hubspot.com/conversations", "re.marketing",
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
