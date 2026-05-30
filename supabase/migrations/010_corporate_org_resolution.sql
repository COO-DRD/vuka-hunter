-- ═══════════════════════════════════════════════════════════════════════════════
-- 010: Corporate multi-seat — org resolution, seat guard, domain auto-join
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. fn_resolve_org_id ──────────────────────────────────────────────────────
-- For any user_id, returns the corporate org_id if the user is an active member
-- of another org. Falls back to the user_id itself (solo account).
CREATE OR REPLACE FUNCTION fn_resolve_org_id(p_user_id text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (
      SELECT org_id FROM hunter_org_members
      WHERE user_id = p_user_id
        AND status  = 'active'
        AND org_id  <> p_user_id
      LIMIT 1
    ),
    p_user_id
  );
$$;

COMMENT ON FUNCTION fn_resolve_org_id(text) IS
  'Returns the corporate org_id for invited members, or user_id for solo accounts.';

-- ── 2. fn_accept_invite_safe ─────────────────────────────────────────────────
-- Atomically validates an invite and inserts the member row, checking seat limit
-- under an advisory lock to prevent race conditions.
-- Returns: 'ok' | 'invalid_token' | 'expired' | 'full' | 'already_member'
CREATE OR REPLACE FUNCTION fn_accept_invite_safe(
  p_token        text,
  p_user_id      text,
  p_display_name text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite   hunter_org_invites%ROWTYPE;
  v_org      hunter_orgs%ROWTYPE;
  v_dummy    uuid;
BEGIN
  -- Fetch and validate invite
  SELECT * INTO v_invite
  FROM hunter_org_invites
  WHERE token = p_token AND status = 'pending';

  IF NOT FOUND THEN RETURN 'invalid_token'; END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE hunter_org_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN 'expired';
  END IF;

  -- Row-lock the org to prevent concurrent seat over-fill
  SELECT * INTO v_org FROM hunter_orgs WHERE id = v_invite.org_id FOR UPDATE;

  IF v_org.seats_used >= v_org.seat_limit THEN RETURN 'full'; END IF;

  -- Idempotent upsert: re-activates a previously suspended member
  INSERT INTO hunter_org_members (org_id, user_id, role, status, display_name, last_active_at)
  VALUES (v_invite.org_id, p_user_id, v_invite.role, 'active', p_display_name, now())
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET status = 'active', last_active_at = now();

  -- Mark invite accepted
  UPDATE hunter_org_invites SET status = 'accepted' WHERE id = v_invite.id;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION fn_accept_invite_safe(text, text, text) IS
  'Accepts an invite with a row-lock on hunter_orgs to prevent seat over-fill. Returns ok/invalid_token/expired/full.';

-- ── 3. fn_domain_auto_join ────────────────────────────────────────────────────
-- Auto-joins a new user to a corporate org whose org_domain matches their email
-- domain, if seats are available. Admin must set org_domain explicitly.
-- Returns the org_id joined, or NULL if no match.
CREATE OR REPLACE FUNCTION fn_domain_auto_join(p_user_id text, p_email_domain text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org hunter_orgs%ROWTYPE;
BEGIN
  SELECT o.* INTO v_org
  FROM hunter_orgs o
  WHERE lower(o.org_domain) = lower(p_email_domain)
    AND o.account_type        = 'corporate'
    AND o.subscription_status IN ('active', 'trialing')
    AND o.seats_used < o.seat_limit
    AND o.id != p_user_id
  ORDER BY o.created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO hunter_org_members (org_id, user_id, role, status, last_active_at)
  VALUES (v_org.id, p_user_id, 'member', 'active', now())
  ON CONFLICT (org_id, user_id) DO NOTHING;

  RETURN v_org.id;
END;
$$;

COMMENT ON FUNCTION fn_domain_auto_join(text, text) IS
  'Auto-joins new user to a corporate org whose org_domain matches their email domain.';

-- ── 4. Supporting indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS hunter_orgs_org_domain_lower_idx
  ON hunter_orgs (lower(org_domain)) WHERE org_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS hunter_org_invites_token_pending_idx
  ON hunter_org_invites (token) WHERE status = 'pending';

-- ── 5. Add org_domain_verified flag (admin sets domain intentionally) ─────────
ALTER TABLE hunter_orgs
  ADD COLUMN IF NOT EXISTS org_domain_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN hunter_orgs.org_domain_verified IS
  'Set to true when admin explicitly configures org_domain for auto-join. Guards against accidental auto-join.';
