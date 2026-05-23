# Hunter SaaS — Setup Guide

## What this is
AI-powered lead scraper, enricher, scorer and outreach platform.
Built to be sold as standalone SaaS.

## Stack
- Next.js 16 (App Router)
- Supabase (Postgres + RLS)
- Clerk (auth + billing wall)
- Stripe (credit packs)
- Gemini (scoring + opener generation)
- Google Places API (lead scraping)
- OpenStreetMap Overpass (free fallback)

---

## 1. Supabase schema

Run `supabase/migrations/001_hunter_schema.sql` in the Supabase SQL editor:
- Project: gjxadcttrtoqtzddxyzs
- Dashboard → SQL Editor → paste and run

---

## 2. Environment variables

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://gjxadcttrtoqtzddxyzs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=   ← Project Settings → API → anon key
SUPABASE_SERVICE_ROLE_KEY=       ← Project Settings → API → service_role secret

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=   ← clerk.com → new app → API keys
CLERK_SECRET_KEY=

GOOGLE_PLACES_API_KEY=YOUR_GOOGLE_PLACES_API_KEY

GEMINI_API_KEY=    ← aistudio.google.com → Get API Key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=   ← stripe.com → Developers → API keys
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

---

## 3. Clerk setup

1. clerk.com → Create application → "Hunter"
2. Enable Email + Google sign-in
3. Copy publishable key + secret key into .env.local
4. Set redirect URLs: http://localhost:3001/sign-in, http://localhost:3001/dashboard

---

## 4. Run locally

```bash
npm install
npm run dev   # → http://localhost:3001
```

---

## 5. Deploy to Vercel

```bash
vercel --prod
```

Set all .env.local vars as Vercel environment variables (production).

---

## Feature status

| Feature | Status |
|---|---|
| Lead scraping (Google Places) | ✅ |
| Lead scraping (OpenStreetMap) | ✅ |
| CSV import | ✅ |
| Website enrichment | ✅ |
| AI scoring (Gemini) | ✅ |
| AI opener generation | ✅ |
| Drag-and-drop pipeline | ✅ |
| Multi-tenancy (RLS) | ✅ |
| Auth (Clerk) | ✅ |
| Billing UI skeleton | ✅ |
| Stripe credit packs | 🔜 |
| Email sending | 🔜 |
| API key issuance | 🔜 |
| Team/workspace sharing | 🔜 |

---

## Pricing (suggested)

| Plan | Credits/mo | Price |
|---|---|---|
| Free | 50 leads | $0 |
| Starter | 250 leads | $29/mo |
| Pro | 1,000 leads | $79/mo |
| Agency | 5,000 leads | $199/mo |

1 credit = 1 lead scraped. Enrichment and scoring are unlimited.
