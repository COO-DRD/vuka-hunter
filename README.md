# 4unter

AI-powered B2B lead intelligence for East Africa. Discover local businesses, enrich them with contact and website data, score every lead with Gemini AI, and generate personalised WhatsApp + email outreach — in minutes.

Built and open-sourced by [Ian Jillo (Dullu Digital)](https://dullugroup.co.ke).

## Features

- **Discover** — scrape local businesses from Google Places / OpenStreetMap across 36+ verticals and 27+ cities in Kenya, Uganda, Tanzania
- **Enrich** — crawl each website for emails, tech stack, booking systems, live chat, social links
- **Score** — Gemini 2.5 Flash ranks every lead 0–100 based on revenue signals
- **Outreach** — AI-generated WhatsApp + email openers, personalised per lead
- **Pipeline** — track leads from New → Contacted → Replied → Won

## Stack

- Next.js 16 (App Router)
- Supabase (Postgres + Auth)
- Clerk (authentication)
- Google Gemini API (AI scoring + outreach)
- Google Places API (lead discovery)
- Tabler UI (design system)
- Vercel (hosting)

## Getting started

```bash
git clone https://github.com/COO-DRD/vuka-hunter
cd vuka-hunter
npm install
cp .env.example .env.local
# fill in your keys (see .env.example)
npm run dev
```

Dev server runs on `http://localhost:3001`.

## Environment variables

See [`.env.example`](.env.example) for the full list. Required:

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console |
| `GEMINI_API_KEY` | Google AI Studio |
| `NEXT_PUBLIC_SITE_URL` | Your deployment URL |

## Database

Run the migrations in `supabase/migrations/` against your Supabase project.

## Adding a vertical

1. Add the protocol definition to `PROTOCOL` in `src/lib/protocol.ts`
2. Add the `{ value, label }` entry to `VERTICALS` in `src/lib/utils.ts`
3. Add a `verticalPain` entry in `VERTICAL_PAIN` in `src/app/api/opener/route.ts`

## License

[AGPL-3.0](LICENSE) — open source, attribution required, derivative works must also be open source.

Copyright (C) 2026 Ian Jillo (Dullu Digital)
