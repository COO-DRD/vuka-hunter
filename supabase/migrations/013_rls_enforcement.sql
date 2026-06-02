-- ═══════════════════════════════════════════════════════════════════════════════
-- 013: RLS enforcement — immutable org_id, org-access guard, Clerk-JWT RLS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Prevent org_id from being changed on existing rows ────────────────────
-- Applies to all core tables. An UPDATE that tries to change org_id is rejected.
CREATE OR REPLACE FUNCTION fn_immutable_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'org_id is immutable — cannot reassign a row to a different org';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hunter_leads', 'hunter_events', 'hunter_scrape_jobs',
    'hunter_lead_contacts', 'hunter_lead_feedback',
    'hunter_payment_events', 'hunter_payment_intents'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_immutable_org_id ON %I;
       CREATE TRIGGER trg_immutable_org_id
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION fn_immutable_org_id();',
      t, t
    );
  END LOOP;
END;
$$;

-- ── 2. Explicit org-access guard function ────────────────────────────────────
-- Call this from application code (service role) when you need a hard DB-level
-- assertion that a lead belongs to the expected org before mutating it.
-- Raises an exception if the check fails — surfaces as a 500 if uncaught.
CREATE OR REPLACE FUNCTION fn_assert_org_access(p_lead_id uuid, p_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT org_id INTO v_owner FROM hunter_leads WHERE id = p_lead_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'lead not found: %', p_lead_id;
  END IF;
  IF v_owner <> p_org_id THEN
    RAISE EXCEPTION 'org access denied: lead % belongs to %, not %', p_lead_id, v_owner, p_org_id;
  END IF;
END;
$$;

-- ── 3. Row-level security policies (for Clerk-JWT path) ──────────────────────
-- These policies use auth.jwt() → 'sub' which equals the Clerk user ID.
-- They are INACTIVE until you configure Clerk JWKS in Supabase:
--   Dashboard → Authentication → Third-party Auth → Add provider → Custom (OIDC)
--   JWKS URL: https://clerk.yourdomain.com/.well-known/jwks.json
--   Issuer:   https://clerk.yourdomain.com
-- Once configured, switch API routes from service role client to anon client
-- with the user's Clerk JWT, and these policies will enforce isolation.

ALTER TABLE hunter_leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_scrape_jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_lead_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_lead_feedback  ENABLE ROW LEVEL SECURITY;

-- hunter_leads: owner can do everything; members resolve via fn_resolve_org_id
DROP POLICY IF EXISTS leads_org_isolation ON hunter_leads;
CREATE POLICY leads_org_isolation ON hunter_leads
  USING (
    org_id::text = fn_resolve_org_id(auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS events_org_isolation ON hunter_events;
CREATE POLICY events_org_isolation ON hunter_events
  USING (
    org_id::text = fn_resolve_org_id(auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS scrape_jobs_org_isolation ON hunter_scrape_jobs;
CREATE POLICY scrape_jobs_org_isolation ON hunter_scrape_jobs
  USING (
    org_id::text = fn_resolve_org_id(auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS lead_contacts_org_isolation ON hunter_lead_contacts;
CREATE POLICY lead_contacts_org_isolation ON hunter_lead_contacts
  USING (
    org_id::text = fn_resolve_org_id(auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS lead_feedback_org_isolation ON hunter_lead_feedback;
CREATE POLICY lead_feedback_org_isolation ON hunter_lead_feedback
  USING (
    org_id::text = fn_resolve_org_id(auth.jwt() ->> 'sub')
  );

-- NOTE: service role key bypasses ALL RLS policies.
-- Current API routes use service role → these policies have no effect today.
-- Migrate routes to user-scoped JWT client to activate them.
