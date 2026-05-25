import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/callback", "/api/webhooks", "/beta-feedback.html"];

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent")?.toLowerCase() ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  // ── Block known bots & headless browsers ──────────────────────────────────
  if (BOT_UA.some((b) => ua.includes(b))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── Tighter rate limit on auth endpoints (brute-force protection) ─────────
  const isAuthPath = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname.startsWith("/auth/");
  if (isAuthPath && rateLimit(ip, MAX_AUTH_RPM)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  // ── Rate-limit API routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/api/") && rateLimit(ip, MAX_API_RPM)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ── Public paths pass through ─────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    return addSecurityHeaders(res);
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
  res.headers.set("X-Robots-Tag",       "noindex, nofollow, noarchive, nosnippet");
  res.headers.set("X-Frame-Options",    "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy",    "no-referrer");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
