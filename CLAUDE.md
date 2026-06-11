# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠ Next.js 16 Warning

This runs **Next.js 16**, which has breaking changes from 14/15. Before touching any Next.js API (routing, caching, streaming, middleware, server actions), read the relevant doc in `node_modules/next/dist/docs/` first. Training data is stale for this version.

## Commands

```bash
npm run dev          # dev server on :3001 (not 3000)
npm run build        # production build — run this to verify before committing
npm run lint         # ESLint
```

No test suite exists yet.

## Architecture

**This is a B2B lead intelligence tool for the Kenyan market.** It scrapes local businesses from Google Places / OpenStreetMap, enriches leads by crawling their websites, scores them with Gemini AI, and generates outreach copy.

### The pipeline

```
Discover → Enrich → Score → Outreach
```

Each stage maps to an API route. They are independent and can be run in any order after scraping.

### Auth & tenancy

- Auth is **Supabase Auth** (email/password only — no OAuth).
- Tenancy is `org_id = user_id` (single-user workspaces; no team accounts yet).
- All API routes use the service role client (`createSupabaseServiceClient`). Org isolation is enforced with `.eq("org_id", user.id)` on every query.
- Middleware uses `getSession()` (cookie-only) for fast auth checks. Actual verification happens inside each API route via `getUser()`.

### Key files

| File | Purpose |
|---|---|
| `src/lib/protocol.ts` | Central source of truth for approved verticals and cities, minimum rating/review thresholds, blocklists, and Google Places query strings. |
| `src/lib/utils.ts` | `VERTICALS` and `CITIES` arrays that populate UI dropdowns — must stay in sync with `protocol.ts`. |
| `src/app/api/scrape/route.ts` | Starts a scrape job, runs it in `after()` (background after response), applies `passesProtocol()` filter before inserting leads. |
| `src/app/api/enrich/route.ts` | Crawls a lead's website, extracts emails, tech stack, booking systems, live chat, and social links. |
| `src/app/api/score/route.ts` | Calls Gemini 2.5 Flash via SSE, parses `SCORE: <n>` and `SIGNALS: <csv>` from the streamed response. |
| `src/app/api/opener/route.ts` | Generates WhatsApp + email outreach copy using Gemini SSE. Vertical-specific pain points are hardcoded in `VERTICAL_PAIN` map — update this when adding verticals. |
| `src/middleware.ts` | Auth redirect, bot blocking, in-memory rate limiting (60 RPM/IP). |

### Scrape job flow

1. `POST /api/scrape` creates a `hunter_scrape_jobs` row (status: queued) and returns the job ID immediately.
2. `after()` runs `runScrapeJob()` in the background — Vercel keeps the function alive post-response.
3. The client polls `GET /api/scrape/[jobId]/status` every 2 seconds.
4. Each lead is passed through `applyProtocol()` before insert. Leads that fail (low rating, blocked name, etc.) are silently discarded.
5. Unique constraint on `(org_id, name)` prevents duplicates.

### Supabase clients

- **`createSupabaseServerClient()`** — cookie-based, for server components and auth checks.
- **`createSupabaseServiceClient()`** — service role, use this in all API routes.
- **`createSupabaseBrowserClient()`** — anon key, for client components (auth sign-in/up only).

### Gemini integration

Both `score` and `opener` call the Gemini SSE endpoint directly via `fetch` — no SDK. The response is streamed back to the client as `text/event-stream`. Parse format: `data: {...}\n\n`. Score is extracted with `/SCORE:\s*(\d+)/` regex from the streamed text.

### Database schema (key tables)

- `hunter_orgs` — one row per user/org.
- `hunter_leads` — the core entity. Enrichment, scoring, and opener fields all live here.
- `hunter_scrape_jobs` — job tracking with `progress` / `total` for polling.

### Environment variables required

See `.env.example` for the full list.

### PWA

Configured via `@ducanh2912/next-pwa`. Service worker is disabled in dev (`NODE_ENV === 'development'`). Manifest at `public/manifest.json`. Start URL is `/dashboard`.

### Adding a new vertical

1. Add the protocol definition to `PROTOCOL` in `src/lib/protocol.ts` (minRating, minReviews, nameBlocklist, placeQuery, osmTags).
2. Add the `{ value, label }` entry to `VERTICALS` in `src/lib/utils.ts`.
3. Add a `verticalPain` entry in the `VERTICAL_PAIN` map in `src/app/api/opener/route.ts`.
