-- ═══════════════════════════════════════════════════════════════════════════════
-- 009: 4UNTER intelligence fields — enrichment scores, decision-maker, bulk outreach
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── New enrichment intel columns on hunter_leads ──────────────────────────────
ALTER TABLE hunter_leads
  ADD COLUMN IF NOT EXISTS whatsapp_number       text,
  ADD COLUMN IF NOT EXISTS decision_maker_name   text,
  ADD COLUMN IF NOT EXISTS decision_maker_title  text,
  ADD COLUMN IF NOT EXISTS digital_readiness_score smallint CHECK (digital_readiness_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS reachability_score    smallint CHECK (reachability_score BETWEEN 0 AND 100);

-- Opener columns may already exist on some deployments — guard with IF NOT EXISTS
ALTER TABLE hunter_leads
  ADD COLUMN IF NOT EXISTS opener_whatsapp text,
  ADD COLUMN IF NOT EXISTS opener_email    text,
  ADD COLUMN IF NOT EXISTS opener_subject  text;

COMMENT ON COLUMN hunter_leads.whatsapp_number          IS 'E.164 phone extracted from wa.me link on website';
COMMENT ON COLUMN hunter_leads.decision_maker_name      IS 'Primary decision-maker name from About page or contact extraction';
COMMENT ON COLUMN hunter_leads.decision_maker_title     IS 'Decision-maker job title';
COMMENT ON COLUMN hunter_leads.digital_readiness_score  IS '0–100: weighted score of website, analytics, booking, chat, social presence';
COMMENT ON COLUMN hunter_leads.reachability_score       IS '0–100: how many direct contact channels (phone, email, WhatsApp, LinkedIn) are available';

CREATE INDEX IF NOT EXISTS hunter_leads_digital_readiness_idx ON hunter_leads(org_id, digital_readiness_score DESC);
CREATE INDEX IF NOT EXISTS hunter_leads_reachability_idx      ON hunter_leads(org_id, reachability_score DESC);
CREATE INDEX IF NOT EXISTS hunter_leads_whatsapp_number_idx   ON hunter_leads(org_id, whatsapp_number) WHERE whatsapp_number IS NOT NULL;
