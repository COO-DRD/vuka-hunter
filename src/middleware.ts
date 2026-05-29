import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/callback", "/auth/confirm", "/auth/verify-email", "/api/webhooks", "/api/auth/resend-verification", "/api/workshop", "/beta-feedback.html", "/terms", "/workshop"];

// Known headless / scraper user-agent fragments
const BOT_UA = [
  "python-httpx", "python-requests", "axios", "go-http-client",
  "curl/", "wget/", "scrapy", "crawler", "spider", "headlesschrome",
  "phantomjs", "selenium", "puppeteer", "playwright",
];

// In-memory rate limiter: ip → [timestamps]
// Evicts stale entries every 2 minutes to prevent unbounded growth.
const ipMap = new Map<string, number[]>();
const WINDOW_MS  = 60_000;
const MAX_API_RPM  = 60;
const MAX_AUTH_RPM = 10;  // tighter limit on auth endpoints
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

const CANONICAL_HOST = "hunter.dullugroup.co.ke";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent")?.toLowerCase() ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  // ── Redirect all *.vercel.app traffic to the canonical domain ────────────
  const host = req.headers.get("host") ?? "";
  if (host.endsWith(".vercel.app") || host.endsWith(".vercel.app:443")) {
    const url = new URL(req.url);
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, { status: 301 });
  }

  // ── Block known bots & headless browsers ──────────────────────────────────
  if (BOT_UA.some((b) => ua.includes(b))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── Tighter rate limit on auth endpoints (brute-force protection) ─────────
  const isAuthPath = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname.startsWith("/auth/");
  if (isAuthPath && rateLimit(ip, MAX_AUTH_RPM)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  // ── Public paths pass through (before rate limiter — webhooks must not be throttled) ─
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    return addSecurityHeaders(res);
  }

  // ── Rate-limit API routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/api/") && rateLimit(ip, MAX_API_RPM)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          ),
      },
    }
  );

  // getSession() is cookie-only (no network). Sufficient for page-level redirects.
  // All data access happens in API routes which call getUser() (server-verified).
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && pathname !== "/" && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return addSecurityHeaders(res);
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag",            "noindex, nofollow, noarchive, nosnippet");
  res.headers.set("X-Frame-Options",         "DENY");
  res.headers.set("X-Content-Type-Options",  "nosniff");
  res.headers.set("Referrer-Policy",         "no-referrer");
  res.headers.set("Permissions-Policy",      "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("Cross-Origin-Opener-Policy",   "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy",  "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy",  "require-corp");
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",        // Tailwind/inline styles
      "img-src 'self' data: https:",             // allow remote images (lead logos etc.)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://maps.googleapis.com https://accounts.google.com https://api.stripe.com https://hooks.stripe.com",
      "font-src 'self'",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
