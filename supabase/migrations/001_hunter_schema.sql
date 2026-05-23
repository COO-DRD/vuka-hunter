-- Hunter SaaS — multi-tenant schema
-- Every row is isolated by org_id (Clerk org or user_id as org)

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─── Orgs ────────────────────────────────────────────────────────────────────
create table hunter_orgs (
  id            text primary key,          -- clerk org_id or user_id
  name          text not null,
  plan          text not null default 'free',   -- free | starter | pro | agency
  credits_total int  not null default 50,        -- leads allocated this cycle
  credits_used  int  not null default 0,
  stripe_customer_id   text,
  stripe_subscription_id text,
  created_at    timestamptz default now()
);

-- ─── Scrape Jobs ──────────────────────────────────────────────────────────────
create table hunter_scrape_jobs (
  id          uuid primary key default uuid_generate_v4(),
  org_id      text not null references hunter_orgs(id) on delete cascade,
  vertical    text not null,
  city        text not null,
  count       int  not null default 100,
  source      text not null default 'google_places',  -- google_places | osm
  status      text not null default 'queued',          -- queued | running | done | error
  progress    int  not null default 0,
  total       int  not null default 0,
  error       text,
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz default now()
);

-- ─── Leads ────────────────────────────────────────────────────────────────────
create table hunter_leads (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              text not null references hunter_orgs(id) on delete cascade,
  scrape_job_id       uuid references hunter_scrape_jobs(id) on delete set null,

  -- identity
  name                text not null,
  vertical            text,
  city                text,

  -- contact
  phone               text,
  email               text,
  website             text,
  address             text,

  -- google data
  google_rating       numeric(3,1),
  google_review_count int,
  google_maps_url     text,
  google_place_id     text,

  -- enrichment
  enriched_at         timestamptz,
  enrichment_status   text default 'pending',  -- pending | done | failed
  tech_stack          text[],
  has_booking_system  boolean,
  has_live_chat       boolean,
  social_links        jsonb default '{}',
  emails_found        text[],

  -- scoring
  score               int,
  score_reasoning     text,
  pain_signals        text[],
  scored_at           timestamptz,

  -- opener
  opener_text         text,
  opener_generated_at timestamptz,

  -- pipeline
  stage               text default 'new',  -- new | contacted | replied | qualified | won | lost
  notes               text,
  last_contacted_at   timestamptz,
  next_follow_up_at   timestamptz,

  -- meta
  imported_by         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index leads_org_id_idx           on hunter_leads(org_id);
create index leads_stage_idx            on hunter_leads(stage);
create index leads_score_idx            on hunter_leads(score desc nulls last);
create index leads_vertical_idx         on hunter_leads(vertical);
create index leads_enrichment_idx       on hunter_leads(enrichment_status);
create index leads_name_trgm            on hunter_leads using gin(name gin_trgm_ops);
create unique index leads_org_name_uniq  on hunter_leads(org_id, name);

-- ─── Outreach log ─────────────────────────────────────────────────────────────
create table hunter_outreach_log (
  id          uuid primary key default uuid_generate_v4(),
  org_id      text not null references hunter_orgs(id) on delete cascade,
  lead_id     uuid not null references hunter_leads(id) on delete cascade,
  channel     text not null,   -- email | linkedin | phone | whatsapp
  message     text,
  sent_by     text,
  sent_at     timestamptz default now()
);

-- ─── Credit transactions ──────────────────────────────────────────────────────
create table hunter_credit_transactions (
  id          uuid primary key default uuid_generate_v4(),
  org_id      text not null references hunter_orgs(id) on delete cascade,
  delta       int  not null,   -- positive = added, negative = consumed
  reason      text,            -- scrape | purchase | refund
  created_at  timestamptz default now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table hunter_orgs               enable row level security;
alter table hunter_scrape_jobs        enable row level security;
alter table hunter_leads              enable row level security;
alter table hunter_outreach_log       enable row level security;
alter table hunter_credit_transactions enable row level security;

-- Service role bypasses RLS (used by API routes with service key)
-- These policies cover direct client access (not used in this app, but safe to have)
create policy "org members only" on hunter_orgs
  for all using (id = current_setting('app.org_id', true));

create policy "org members only" on hunter_scrape_jobs
  for all using (org_id = current_setting('app.org_id', true));

create policy "org members only" on hunter_leads
  for all using (org_id = current_setting('app.org_id', true));

create policy "org members only" on hunter_outreach_log
  for all using (org_id = current_setting('app.org_id', true));

create policy "org members only" on hunter_credit_transactions
  for all using (org_id = current_setting('app.org_id', true));

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger leads_updated_at before update on hunter_leads
  for each row execute function set_updated_at();
