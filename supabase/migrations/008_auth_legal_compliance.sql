-- ═══════════════════════════════════════════════════════════════════════════════
-- 008: Auth hardening — email verification, KRA/address fields, legal consents
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Add identity/compliance fields to hunter_orgs ─────────────────────────
ALTER TABLE hunter_orgs
  ADD COLUMN IF NOT EXISTS kra_pin            text,
  ADD COLUMN IF NOT EXISTS operating_county   text,
  ADD COLUMN IF NOT EXISTS operating_address  text,
  ADD COLUMN IF NOT EXISTS email_verified_at  timestamptz;

COMMENT ON COLUMN hunter_orgs.kra_pin           IS 'Kenya Revenue Authority PIN — format A000000000Z (individual) or P000000000Z (company)';
COMMENT ON COLUMN hunter_orgs.operating_county  IS 'Kenya county of primary operations (one of 47 counties)';
COMMENT ON COLUMN hunter_orgs.operating_address IS 'Physical or postal address of operating premises';
COMMENT ON COLUMN hunter_orgs.email_verified_at IS 'Timestamp of first confirmed email auth — backfilled from Supabase on callback';

-- ── 2. hunter_legal_consents — immutable consent audit trail ──────────────────
-- NEVER UPDATE OR DELETE rows. Consent events are append-only.
-- Required by Kenya Data Protection Act 2019 s.30 (record-keeping obligation).
CREATE TABLE IF NOT EXISTS hunter_legal_consents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       text        NOT NULL REFERENCES hunter_orgs(id) ON DELETE CASCADE,
  consent_type text        NOT NULL
               CHECK (consent_type IN (
                 'terms_of_service',
                 'kenya_dpa_data_collection',
                 'kenya_dpa_third_party_enrichment',
                 'data_processing_agreement',
                 'kra_compliance_acknowledgment',
                 'marketing_communications'
               )),
  version      text        NOT NULL DEFAULT '1.0',
  accepted     boolean     NOT NULL,
  ip_address   text,
  user_agent   text,
  accepted_at  timestamptz NOT NULL DEFAULT now()
  -- NO updated_at: this table is append-only
);

CREATE INDEX IF NOT EXISTS hunter_lc_org_idx    ON hunter_legal_consents(org_id);
CREATE INDEX IF NOT EXISTS hunter_lc_type_idx   ON hunter_legal_consents(consent_type);
CREATE INDEX IF NOT EXISTS hunter_lc_time_idx   ON hunter_legal_consents(accepted_at DESC);

COMMENT ON TABLE  hunter_legal_consents               IS 'IMMUTABLE append-only consent ledger. Required by Kenya DPA 2019 s.30.';
COMMENT ON COLUMN hunter_legal_consents.consent_type  IS 'Category of consent given or withdrawn. See Kenya DPA 2019 s.30.';
COMMENT ON COLUMN hunter_legal_consents.version       IS 'Version of the consent text shown to the user at time of acceptance.';
COMMENT ON COLUMN hunter_legal_consents.ip_address    IS 'IP address of the accepting party at time of consent — evidence of geographic jurisdiction.';

-- Block mutations on the consent ledger
CREATE OR REPLACE FUNCTION fn_block_legal_consents_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'hunter_legal_consents is an immutable ledger — UPDATE and DELETE are forbidden (Kenya DPA 2019 s.30)';
END;
$$;

CREATE TRIGGER trg_block_lc_update
  BEFORE UPDATE ON hunter_legal_consents
  FOR EACH ROW EXECUTE FUNCTION fn_block_legal_consents_mutation();
CREATE TRIGGER trg_block_lc_delete
  BEFORE DELETE ON hunter_legal_consents
  FOR EACH ROW EXECUTE FUNCTION fn_block_legal_consents_mutation();

-- ── 3. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE hunter_legal_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members only" ON hunter_legal_consents
  FOR ALL USING (org_id = current_setting('app.org_id', true));
