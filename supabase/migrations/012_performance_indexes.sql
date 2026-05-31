-- Performance indexes: 30-day roadmap item
-- Prevents full-table scans on the two hottest query patterns

create index if not exists idx_scrape_jobs_org_status
  on hunter_scrape_jobs (org_id, status);

create index if not exists idx_leads_org_stage
  on hunter_leads (org_id, stage);

create index if not exists idx_leads_org_score
  on hunter_leads (org_id, score desc);
