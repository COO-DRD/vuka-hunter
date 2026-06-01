import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/workshop",
  "/api/billing/configured",
  "/api/health",
  "/terms",
  "/workshop",
  "/",
]);

// Pages search engines are allowed to index
const isIndexableRoute = createRouteMatcher(["/", "/workshop", "/terms"]);

const ADMIN_ONLY_PATHS = [
  "/settings",
  "/upgrade",
  "/api/billing",
  "/api/auth/invite",
  "/api/leads/clear",
  "/api/settings",
  "/api/onboarding",
  "/api/team",
];

const BOT_UA = [
  "python-httpx", "python-requests", "axios", "go-http-client",
  "curl/", "wget/", "scrapy", "crawler", "spider", "headlesschrome",
  "phantomjs", "selenium", "puppeteer", "playwright",
];

const ipMap = new Map<string, number[]>();
const WINDOW_MS    = 60_000;
const MAX_API_RPM  = 60;
const MAX_AUTH_RPM = 15;
let lastEviction = Date.now();

function evictStale() {
  const now = Date.now();
  if (now - lastEviction < WINDOW_MS * 2) return;
  lastEviction = now;
  for (const [ip, hits] of ipMap) {
    if (hits.every((t) => now - t > WINDOW_MS)) ipMap.delete(ip);
  }
}

function rateLimit(ip: string, max: number): boolean {
  evictStale();
  const now  = Date.now();
  const hits = (ipMap.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  ipMap.set(ip, hits);
  return hits.length > max;
}

const CANONICAL_HOST = "4unter.dullugroup.co.ke";

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent")?.toLowerCase() ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  // Redirect vercel.app preview URLs to canonical domain
  const host = req.headers.get("host") ?? "";
  if (host.endsWith(".vercel.app") || host.endsWith(".vercel.app:443")) {
    const url = new URL(req.url);
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, { status: 301 });
  }

  // Block headless scrapers / automation
  if (BOT_UA.some((b) => ua.includes(b))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Rate-limit API routes
  if (pathname.startsWith("/api/")) {
    const limit = pathname.startsWith("/api/auth/") ? MAX_AUTH_RPM : MAX_API_RPM;
    if (rateLimit(ip, limit)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Corporate member role gate: members can't access admin-only paths
  if (ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    const { userId } = await auth();
    if (userId) {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      const { data: member } = await db
        .from("hunter_org_members")
        .select("role")
        .eq("user_id", userId)
        .eq("status", "active")
        .eq("role", "member")
        .maybeSingle();

      if (member) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Access restricted to organisation admin." },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/dashboard?blocked=1", req.url));
      }
    }
  }

  return addSecurityHeaders(NextResponse.next(), isIndexableRoute(req));
});

function addSecurityHeaders(res: NextResponse, allowIndex = false): NextResponse {
  res.headers.set(
    "X-Robots-Tag",
    allowIndex ? "index, follow" : "noindex, nofollow, noarchive, nosnippet",
  );
  res.headers.set("X-Frame-Options",         "DENY");
  res.headers.set("X-Content-Type-Options",  "nosniff");
  res.headers.set("Referrer-Policy",         "no-referrer");
  res.headers.set("Permissions-Policy",      "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Clerk loads JS from its CDN subdomain; Stripe and Cloudflare for payments/CAPTCHA
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.clerk.accounts.dev https://npm.clerk.dev https://*.4unter.dullugroup.co.ke https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      // img.clerk.com for Clerk user profile pictures; data: and https: for everything else
      "img-src 'self' data: blob: https://img.clerk.com https:",
      // api.clerk.com is Clerk's actual REST API — clerk.io was a wrong domain (different company)
      // challenges.cloudflare.com is needed for Clerk's Turnstile bot protection token exchange
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://maps.googleapis.com https://accounts.google.com https://api.stripe.com https://hooks.stripe.com https://*.clerk.accounts.dev https://api.clerk.com https://clerk.com https://challenges.cloudflare.com https://*.4unter.dullugroup.co.ke",
      // fonts.gstatic.com for Next.js Google Fonts (Geist); fonts.googleapis.com for the manifest
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://*.clerk.accounts.dev https://*.4unter.dullugroup.co.ke https://challenges.cloudflare.com",
      "worker-src blob: 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.clerk.accounts.dev",
    ].join("; ")
  );
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/).*)",
    "/(api|trpc)(.*)",
  ],
};
