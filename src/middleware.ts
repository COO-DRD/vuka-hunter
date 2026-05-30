import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/callback", "/auth/confirm", "/auth/verify-email", "/auth/new-password", "/api/webhooks", "/api/auth/resend-verification", "/api/workshop", "/terms", "/workshop"];

// Routes that only the org admin (account owner) may access.
// Corporate members with role='member' are blocked.
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

// Known headless / scraper user-agent fragments
const BOT_UA = [
  "python-httpx", "python-requests", "axios", "go-http-client",
  "curl/", "wget/", "scrapy", "crawler", "spider", "headlesschrome",
  "phantomjs", "selenium", "puppeteer", "playwright",
];

// In-memory rate limiter: ip → [timestamps]
// Evicts stale entries every 2 minutes to prevent unbounded growth.
const ipMap = new Map<string, number[]>();
const WINDOW_MS    = 60_000;
const MAX_API_RPM  = 60;
const MAX_AUTH_RPM = 15;  // tighter limit on /api/auth/* endpoints only
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

  // ── Public paths pass through — never rate-limit page navigations ────────
  // Auth pages (/sign-in, /sign-up, /auth/callback) must NEVER be rate-limited
  // at the page level: every page load would burn the quota, and blocking
  // /auth/callback means confirmation email clicks show a blank 429 screen.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    return addSecurityHeaders(res);
  }

  // ── Rate-limit API routes only ────────────────────────────────────────────
  // /api/auth/* gets a tighter cap (brute-force / credential-stuffing protection).
  // All other /api/* routes share the general cap.
  if (pathname.startsWith("/api/")) {
    const limit = pathname.startsWith("/api/auth/") ? MAX_AUTH_RPM : MAX_API_RPM;
    if (rateLimit(ip, limit)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }
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

  // ── Email confirmation gate ───────────────────────────────────────────────
  // Defence-in-depth: when Supabase email confirmations are enabled, unconfirmed
  // users can't get sessions at all — but guard here in case of edge cases.
  if (session && !session.user.email_confirmed_at) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please verify your email address to continue." }, { status: 403 });
    }
    const verifyUrl = new URL("/auth/verify-email", req.url);
    if (session.user.email) verifyUrl.searchParams.set("email", session.user.email);
    return NextResponse.redirect(verifyUrl);
  }

  // ── Corporate member role gate ────────────────────────────────────────────
  // Members (role='member') are blocked from admin-only routes.
  // This is a fast cookie-based check — the service-role check in each API
  // route is the authoritative enforcement.
  if (session && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    const userId = session.user?.id;
    if (userId) {
      // Check hunter_org_members via the anon client (no service key needed here;
      // RLS is intentionally bypassed in API routes, but for this middleware check
      // we use a simple anon query — the data is not sensitive).
      const { data: member } = await supabase
        .from("hunter_org_members")
        .select("role")
        .eq("user_id", userId)
        .eq("status", "active")
        .neq("org_id", userId)
        .maybeSingle();

      if (member?.role === "member") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Access restricted to organisation admin." }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard?blocked=1", req.url));
      }
    }
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
