-- ═══════════════════════════════════════════════════════════════════════════════
-- 006: Schema cleanup — fix type conflicts, remove duplicates, add multi-user
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Fix hunter_lead_contacts.org_id: uuid → text, FK to hunter_orgs ────────
ALTER TABLE hunter_lead_contacts DROP COLUMN org_id;
ALTER TABLE hunter_lead_contacts
  ADD COLUMN org_id text NOT NULL REFERENCES hunter_orgs(id) ON DELETE CASCADE;
CREATE INDEX hunter_lead_contacts_org_id_idx ON hunter_lead_contacts(org_id);

-- ── 2. Fix hunter_events.org_id: uuid → text, re-point FK to hunter_orgs ──────
ALTER TABLE hunter_events DROP CONSTRAINT hunter_events_org_id_fkey;
ALTER TABLE hunter_events ALTER COLUMN org_id TYPE text USING org_id::text;
ALTER TABLE hunter_events
  ADD CONSTRAINT hunter_events_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES hunter_orgs(id) ON DELETE CASCADE;

-- ── 3. Fix hunter_error_log.org_id: uuid → text, drop stale auth.users FK ─────
ALTER TABLE hunter_error_log DROP CONSTRAINT hunter_error_log_org_id_fkey;
ALTER TABLE hunter_error_log ALTER COLUMN org_id TYPE text USING org_id::text;

-- ── 4. Rename outreach_log.sent_by → sent_by_user_id ──────────────────────────
ALTER TABLE hunter_outreach_log RENAME COLUMN sent_by TO sent_by_user_id;

-- ── 5. Deprecate duplicate columns (kept for read compat, no longer written) ───
COMMENT ON COLUMN hunter_leads.contacted_at   IS 'DEPRECATED — use last_contacted_at';
COMMENT ON COLUMN hunter_leads.last_outcome   IS 'DEPRECATED — use hunter_lead_feedback.outcome';
COMMENT ON COLUMN hunter_leads.feedback_score IS 'DEPRECATED — use hunter_lead_feedback.quality_rating';
COMMENT ON COLUMN hunter_leads.emails_found   IS 'DEPRECATED — use hunter_lead_contacts table';
COMMENT ON COLUMN hunter_orgs.plan            IS 'DEPRECATED — use subscribed_plan + subscription_status';

-- ── 6. Document hunter_orgs columns ───────────────────────────────────────────
COMMENT ON COLUMN hunter_orgs.id                  IS 'auth.users.id of the org admin (= org identifier)';
COMMENT ON COLUMN hunter_orgs.account_type        IS 'individual | corporate';
COMMENT ON COLUMN hunter_orgs.subscription_status IS 'trialing | active | past_due | cancelled';
COMMENT ON COLUMN hunter_orgs.subscribed_plan     IS 'trial | starter | growth | enterprise';
COMMENT ON COLUMN hunter_orgs.trial_started_at    IS 'When the trial window opened';
COMMENT ON COLUMN hunter_orgs.trial_ends_at       IS 'now+7d (individual) or now+14d (corporate)';

-- ── 7. Add corporate multi-user columns to hunter_orgs ────────────────────────
ALTER TABLE hunter_orgs
  ADD COLUMN IF NOT EXISTS org_domain text,
  ADD COLUMN IF NOT EXISTS seat_limit smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS seats_used smallint NOT NULL DEFAULT 1;

COMMENT ON COLUMN hunter_orgs.org_domain IS 'Email domain for corporate auto-join (e.g. acme.co.ke)';
COMMENT ON COLUMN hunter_orgs.seat_limit IS 'Max active members: 1=individual, 5/15/30=corporate tiers';
COMMENT ON COLUMN hunter_orgs.seats_used IS 'Maintained by trigger on hunter_org_members; do not write directly';

UPDATE hunter_orgs SET seat_limit = 1 WHERE account_type = 'individual';
UPDATE hunter_orgs SET seat_limit = 5 WHERE account_type = 'corporate';

-- ── 8. Add created_by to hunter_leads ─────────────────────────────────────────
ALTER TABLE hunter_leads ADD COLUMN IF NOT EXISTS created_by text;
COMMENT ON COLUMN hunter_leads.created_by IS 'auth.users.id of the member who created/imported this lead';
UPDATE hunter_leads SET created_by = org_id WHERE created_by IS NULL;
CREATE INDEX IF NOT EXISTS hunter_leads_created_by_idx ON hunter_leads(created_by);

-- ── 9. hunter_org_members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hunter_org_members (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         text        NOT NULL REFERENCES hunter_orgs(id) ON DELETE CASCADE,
  user_id        text        NOT NULL,
  role           text        NOT NULL DEFAULT 'member'
                             CHECK (role IN ('admin', 'member')),
  status         text        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'invited', 'suspended')),
  display_name   text,
  last_active_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS hunter_org_members_org_id_idx  ON hunter_org_members(org_id);
CREATE INDEX IF NOT EXISTS hunter_org_members_user_id_idx ON hunter_org_members(user_id);

COMMENT ON TABLE  hunter_org_members          IS 'Team roster. Each row = one user in one org.';
COMMENT ON COLUMN hunter_org_members.role     IS 'admin: full access + team management; member: own dashboard only';
COMMENT ON COLUMN hunter_org_members.status   IS 'active | invited (not yet accepted) | suspended (blocked)';

INSERT INTO hunter_org_members (org_id, user_id, role, status, display_name)
SELECT id, id, 'admin', 'active', name FROM hunter_orgs
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ── 10. hunter_org_invites ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hunter_org_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      text        NOT NULL REFERENCES hunter_orgs(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('admin', 'member')),
  token       text        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by  text        NOT NULL,
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hunter_org_invites_org_id_idx ON hunter_org_invites(org_id);
CREATE INDEX IF NOT EXISTS hunter_org_invites_token_idx  ON hunter_org_invites(token);
CREATE UNIQUE INDEX IF NOT EXISTS hunter_org_invites_org_email_pending_idx
  ON hunter_org_invites(org_id, lower(email)) WHERE status = 'pending';

COMMENT ON TABLE  hunter_org_invites            IS 'Pending invitations. Token is emailed; expires_at enforces validity.';
COMMENT ON COLUMN hunter_org_invites.token      IS 'URL-safe secret sent in the invite link. Rotated on re-send.';

-- ── 11. hunter_lead_activity ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hunter_lead_activity (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     text        NOT NULL REFERENCES hunter_orgs(id) ON DELETE CASCADE,
  lead_id    uuid        REFERENCES hunter_leads(id) ON DELETE CASCADE,
  user_id    text        NOT NULL,
  action     text        NOT NULL
             CHECK (action IN (
               'discovered', 'imported', 'enriched', 'scored',
               'opener_generated', 'contacted', 'feedback_submitted',
               'stage_changed', 'note_added'
             )),
  metadata   jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hunter_lead_activity_org_id_idx     ON hunter_lead_activity(org_id);
CREATE INDEX IF NOT EXISTS hunter_lead_activity_user_id_idx    ON hunter_lead_activity(user_id);
CREATE INDEX IF NOT EXISTS hunter_lead_activity_lead_id_idx    ON hunter_lead_activity(lead_id);
CREATE INDEX IF NOT EXISTS hunter_lead_activity_created_at_idx ON hunter_lead_activity(created_at DESC);

COMMENT ON TABLE  hunter_lead_activity          IS 'Append-only audit log. Powers admin real-time oversight + member dashboards.';
COMMENT ON COLUMN hunter_lead_activity.action   IS 'discovered | enriched | scored | contacted | stage_changed | etc.';
COMMENT ON COLUMN hunter_lead_activity.metadata IS 'Context e.g. {channel} for contacted, {from,to} for stage_changed';

-- ── 12. Trigger: auto-maintain seats_used ─────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_org_seats_used()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_org_id text;
BEGIN
  target_org_id := COALESCE(NEW.org_id, OLD.org_id);
  UPDATE hunter_orgs
  SET seats_used = (
    SELECT COUNT(*) FROM hunter_org_members
    WHERE org_id = target_org_id AND status = 'active'
  )
  WHERE id = target_org_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_seats_used
AFTER INSERT OR UPDATE OF status OR DELETE ON hunter_org_members
FOR EACH ROW EXECUTE FUNCTION fn_sync_org_seats_used();

-- ── 13. RLS for new tables ─────────────────────────────────────────────────────
ALTER TABLE hunter_org_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_org_invites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_lead_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members only" ON hunter_org_members
  FOR ALL USING (org_id = current_setting('app.org_id', true));
CREATE POLICY "org members only" ON hunter_org_invites
  FOR ALL USING (org_id = current_setting('app.org_id', true));
CREATE POLICY "org members only" ON hunter_lead_activity
  FOR ALL USING (org_id = current_setting('app.org_id', true));
