-- ═══════════════════════════════════════════════════════════════════════════════
-- 011: Enrichment v2 — vertical-aware intelligence fields
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE hunter_leads
  -- Contact intelligence
  ADD COLUMN IF NOT EXISTS phones_found          text[],
  ADD COLUMN IF NOT EXISTS phone_primary         text,

  -- Social intelligence (enriched OG data per platform)
  ADD COLUMN IF NOT EXISTS social_profiles       jsonb,

  -- Vertical-specific signals
  ADD COLUMN IF NOT EXISTS vertical_signals      text[],

  -- Business intelligence
  ADD COLUMN IF NOT EXISTS year_established      smallint,
  ADD COLUMN IF NOT EXISTS location_count        smallint DEFAULT 1,
  ADD COLUMN IF NOT EXISTS staff_signal          text,
  ADD COLUMN IF NOT EXISTS certifications        text[],
  ADD COLUMN IF NOT EXISTS has_online_payment    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_ssl               boolean DEFAULT false,

  -- Combined opportunity score
  ADD COLUMN IF NOT EXISTS opportunity_score     smallint CHECK (opportunity_score BETWEEN 0 AND 100),

  -- Track enrichment version so re-enrichment can be targeted
  ADD COLUMN IF NOT EXISTS enrichment_version    smallint DEFAULT 1;

COMMENT ON COLUMN hunter_leads.phones_found        IS 'All phone numbers found during enrichment';
COMMENT ON COLUMN hunter_leads.phone_primary       IS 'Best phone number to call (normalised Kenya format)';
COMMENT ON COLUMN hunter_leads.social_profiles     IS 'Enriched social data: {platform: {url, followers, posts, bio, activityLevel}}';
COMMENT ON COLUMN hunter_leads.vertical_signals    IS 'Vertical-specific intelligence signals detected during enrichment';
COMMENT ON COLUMN hunter_leads.year_established    IS 'Year the business was founded/established, if detectable';
COMMENT ON COLUMN hunter_leads.location_count      IS 'Number of locations/branches detected';
COMMENT ON COLUMN hunter_leads.staff_signal        IS 'Staff size signal (e.g. "6-20 employees")';
COMMENT ON COLUMN hunter_leads.certifications      IS 'Quality/regulatory certifications found (ISO, KEBS, NHIF, NCA, etc.)';
COMMENT ON COLUMN hunter_leads.has_online_payment  IS 'M-PESA, card payment, or online checkout detected';
COMMENT ON COLUMN hunter_leads.has_ssl             IS 'Website served over HTTPS';
COMMENT ON COLUMN hunter_leads.opportunity_score   IS '0-100 composite signal: reachability + pain gaps + social activity';
COMMENT ON COLUMN hunter_leads.enrichment_version  IS '1=original, 2=vertical-aware v2';

CREATE INDEX IF NOT EXISTS hunter_leads_opportunity_score_idx ON hunter_leads(org_id, opportunity_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS hunter_leads_year_established_idx  ON hunter_leads(org_id, year_established);
CREATE INDEX IF NOT EXISTS hunter_leads_phone_primary_idx     ON hunter_leads(org_id, phone_primary) WHERE phone_primary IS NOT NULL;
