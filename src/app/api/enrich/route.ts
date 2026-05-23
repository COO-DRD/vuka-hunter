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

async function enrichWebsite(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Hunter-Enricher/1.0)" },
      redirect: "follow",
    });
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }
  return {
    emails: extractEmails(html),
    techStack: detectTechStack(html),
    hasBookingSystem: detectBookingSystem(html),
    hasLiveChat: detectLiveChat(html),
    socialLinks: extractSocialLinks(html),
  };
}

function extractEmails(html: string): string[] {
  const all = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  const blocked = ["@sentry", "@example", "@w3.org", "@schema", "@2x", ".png", ".jpg", ".gif"];
  return [...new Set(all.filter((e) => !blocked.some((b) => e.includes(b))))].slice(0, 5);
}

function detectTechStack(html: string): string[] {
  const stack: string[] = [];
  const checks: [string, string[]][] = [
    ["WordPress",        ["wp-content", "wp-includes"]],
    ["Wix",              ["wix.com", "_wix_"]],
    ["Squarespace",      ["squarespace.com", "squarespace-cdn"]],
    ["Shopify",          ["shopify.com", "cdn.shopify"]],
    ["Next.js",          ["_next/static", "__NEXT_DATA__"]],
    ["Webflow",          ["webflow.com"]],
    ["Bootstrap",        ["bootstrap.min.css"]],
    ["jQuery",           ["jquery.min.js"]],
    ["Google Analytics", ["gtag", "google-analytics.com"]],
  ];
  const h = html.toLowerCase();
  for (const [name, tokens] of checks) {
    if (tokens.some((t) => h.includes(t.toLowerCase()))) stack.push(name);
  }
  return stack;
}

function detectBookingSystem(html: string): boolean {
  const h = html.toLowerCase();
  return ["calendly", "cal.com", "acuityscheduling", "setmore", "simplybook", "booksy"].some((s) => h.includes(s));
}

function detectLiveChat(html: string): boolean {
  const h = html.toLowerCase();
  return ["intercom", "zendesk", "livechat", "tawk.to", "crisp.chat", "freshchat", "drift"].some((s) => h.includes(s));
}

function extractSocialLinks(html: string): Record<string, string> {
  const links: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ["facebook",  /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'>]+/i],
    ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'>]+/i],
    ["twitter",   /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'>]+/i],
    ["linkedin",  /https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'>]+/i],
  ];
  for (const [name, re] of patterns) {
    const m = html.match(re);
    if (m) links[name] = m[0];
  }
  return links;
}
