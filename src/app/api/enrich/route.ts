import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const { data: lead } = await db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", user.id).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!lead.website) {
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId);
    return NextResponse.json({ error: "No website to enrich from" }, { status: 400 });
  }

  try {
    const enriched = await enrichWebsite(lead.website);
    await db.from("hunter_leads").update({
      enrichment_status: "done",
      enriched_at: new Date().toISOString(),
      emails_found: enriched.emails,
      email: enriched.emails[0] ?? lead.email ?? null,
      tech_stack: enriched.techStack,
      has_booking_system: enriched.hasBookingSystem,
      has_live_chat: enriched.hasLiveChat,
      social_links: enriched.socialLinks,
    }).eq("id", leadId);

    return NextResponse.json({ ok: true, enriched });
  } catch (err) {
    await db.from("hunter_leads").update({ enrichment_status: "failed" }).eq("id", leadId);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
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

async function enrichWebsite(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let html = "";
  let extraHtml = "";

  try {
    html = await fetchPage(url, controller.signal);

    // Try contact/booking sub-pages — widgets often only appear there
    const base = new URL(url).origin;
    for (const path of ["/contact", "/book", "/booking", "/appointments", "/schedule"]) {
      try {
        const extra = await fetchPage(base + path, controller.signal);
        // Only count it if it's a real distinct page
        if (extra.length > 500 && extra !== html) { extraHtml = extra; break; }
      } catch { /* page doesn't exist — skip */ }
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
  const all = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
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

  // Named booking platforms (global + Kenya-common)
  const platforms = [
    "calendly.com", "cal.com", "acuityscheduling", "setmore", "simplybook",
    "booksy", "fresha.com", "appointy.com", "vagaro.com", "schedulicity",
    "mindbodyonline", "janeapp.com", "cliniko.com", "zoho.com/bookings",
    "square.site", "timely.is", "book.app",
  ];
  if (platforms.some((s) => h.includes(s))) return true;

  // Generic booking intent phrases in page text/links
  const phrases = [
    "book appointment", "book a consultation", "book online", "book now",
    "schedule appointment", "schedule a visit", "schedule a call",
    "make a booking", "request appointment", "reserve a slot",
    "online booking", "book a session",
  ];
  if (phrases.some((p) => h.includes(p))) return true;

  // WhatsApp link used in a booking/appointment context (very common in Kenya)
  if (/wa\.me\/\d{10,}/.test(html) && /book|appointment|reserve|slot|schedule/i.test(html)) return true;

  return false;
}

function detectLiveChat(html: string): boolean {
  const h = html.toLowerCase();

  // Dedicated chat platforms
  const platforms = [
    "intercom.io", "zendesk.com", "livechat.com", "tawk.to", "crisp.chat",
    "freshchat", "drift.com", "tidio.com", "smartsupp", "olark.com",
    "chatra.io", "purechat", "hubspot.com/conversations", "re.marketing",
  ];
  if (platforms.some((s) => h.includes(s))) return true;

  // WhatsApp floating chat button — the single most common chat tool in Kenya
  if (/wa\.me\/\d{10,}/.test(html)) return true;

  // Facebook Messenger chat plugin
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
