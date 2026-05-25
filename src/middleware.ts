import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/callback", "/api/webhooks"];

// Known headless / scraper user-agent fragments
const BOT_UA = [
  "python-httpx", "python-requests", "axios", "go-http-client",
  "curl/", "wget/", "scrapy", "crawler", "spider", "headlesschrome",
  "phantomjs", "selenium", "puppeteer", "playwright",
];

// In-memory rate limiter: ip → [timestamps]
const ipMap = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_API_RPM = 60;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (ipMap.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  ipMap.set(ip, hits);
  return hits.length > MAX_API_RPM;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent")?.toLowerCase() ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  // ── Block known bots & headless browsers ──────────────────────────────────
  if (BOT_UA.some((b) => ua.includes(b))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── Rate-limit API routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/api/") && rateLimit(ip)) {
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && pathname !== "/" && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return addSecurityHeaders(res);
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  // Block indexing and archiving of the app
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  // Prevent clickjacking
  res.headers.set("X-Frame-Options", "DENY");
  // XSS protection
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Don't leak referrer
  res.headers.set("Referrer-Policy", "no-referrer");
  // Permissions policy — lock down unnecessary browser APIs
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
