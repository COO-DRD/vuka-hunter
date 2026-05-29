-- ═══════════════════════════════════════════════════════════════════════════════
-- 007: Billing — immutable payment ledger, state machine, idempotency, refunds
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN new.updated_at = now(); RETURN new; END;
$$;

-- ── 1. hunter_subscriptions ───────────────────────────────────────────────────
-- Source of truth for plan/status. Written only by webhook handler, never by
-- user actions directly, so state never drifts from what Stripe has confirmed.
CREATE TABLE IF NOT EXISTS hunter_subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  text        NOT NULL UNIQUE REFERENCES hunter_orgs(id) ON DELETE CASCADE,
  stripe_customer_id      text        UNIQUE,
  stripe_subscription_id  text        UNIQUE,
  plan                    text        NOT NULL DEFAULT 'trial'
                          CHECK (plan IN ('trial','starter','growth','enterprise')),
  status                  text        NOT NULL DEFAULT 'trialing'
                          CHECK (status IN ('trialing','active','past_due','cancelled','unpaid','paused')),
  seat_limit              smallint    NOT NULL DEFAULT 1,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  trial_end               timestamptz,
  cancel_at_period_end    boolean     NOT NULL DEFAULT false,
  cancelled_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  hunter_subscriptions               IS 'One row per org. Updated by webhooks only — never by user actions directly.';
COMMENT ON COLUMN hunter_subscriptions.cancel_at_period_end IS 'User cancelled but retains access until current_period_end';

CREATE TRIGGER hunter_subscriptions_updated_at
  BEFORE UPDATE ON hunter_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO hunter_subscriptions (org_id, plan, status, trial_end, seat_limit)
SELECT id, COALESCE(subscribed_plan,'trial'), COALESCE(subscription_status,'trialing'), trial_ends_at, seat_limit
FROM hunter_orgs
ON CONFLICT (org_id) DO NOTHING;

-- ── 2. hunter_payment_intents — one row per payment attempt ───────────────────
CREATE TABLE IF NOT EXISTS hunter_payment_intents (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   text        NOT NULL REFERENCES hunter_orgs(id) ON DELETE CASCADE,
  idempotency_key          text        NOT NULL UNIQUE,
  stripe_payment_intent_id text        UNIQUE,
  stripe_customer_id       text,
  amount                   integer     NOT NULL,   -- minor units (KES cents)
  currency                 text        NOT NULL DEFAULT 'kes',
  description              text,
  plan                     text,
  billing_period_start     timestamptz,
  billing_period_end       timestamptz,
  status                   text        NOT NULL DEFAULT 'initiated'
                           CHECK (status IN (
                             'initiated','authorized','captured',
                             'failed','voided','refund_pending',
                             'refunded','disputed','chargeback_loss'
                           )),
  failure_reason           text,
  metadata                 jsonb       NOT NULL DEFAULT '{}',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hunter_pi_org_idx    ON hunter_payment_intents(org_id);
CREATE INDEX IF NOT EXISTS hunter_pi_stripe_idx ON hunter_payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS hunter_pi_status_idx ON hunter_payment_intents(status);

COMMENT ON TABLE  hunter_payment_intents                 IS 'One row per payment attempt. idempotency_key prevents double-charges on WiFi timeout/retry.';
COMMENT ON COLUMN hunter_payment_intents.idempotency_key IS 'Client-generated UUID per checkout attempt. UNIQUE — retries find existing row, no duplicate charge.';
COMMENT ON COLUMN hunter_payment_intents.amount          IS 'Always in smallest currency unit. Never store money as float.';
COMMENT ON COLUMN hunter_payment_intents.status          IS 'Managed exclusively by fn_payment_state_transition. Do not write directly.';

CREATE TRIGGER hunter_payment_intents_updated_at
  BEFORE UPDATE ON hunter_payment_intents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. hunter_payment_events — immutable append-only ledger ───────────────────
-- NEVER UPDATE OR DELETE rows. Every payment event = new row.
CREATE TABLE IF NOT EXISTS hunter_payment_events (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             text        NOT NULL REFERENCES hunter_orgs(id) ON DELETE CASCADE,
  payment_intent_id  uuid        REFERENCES hunter_payment_intents(id) ON DELETE SET NULL,
  stripe_event_id    text        NOT NULL UNIQUE,   -- idempotency: ignore already-seen events
  event_type         text        NOT NULL
                     CHECK (event_type IN (
                       'payment.initiated','payment.authorized','payment.captured',
                       'payment.failed','payment.voided',
                       'payment.refund_requested','payment.refund_processed','payment.refund_failed',
                       'payment.dispute_created','payment.dispute_won','payment.dispute_lost',
                       'subscription.created','subscription.updated','subscription.cancelled',
                       'subscription.trial_ended','subscription.past_due','subscription.renewed'
                     )),
  amount             integer,
  currency           text,
  stripe_payload     jsonb       NOT NULL DEFAULT '{}',
  processed_at       timestamptz NOT NULL DEFAULT now()
  -- NO updated_at: this table is append-only
);

CREATE INDEX IF NOT EXISTS hunter_pe_org_idx        ON hunter_payment_events(org_id);
CREATE INDEX IF NOT EXISTS hunter_pe_pi_idx         ON hunter_payment_events(payment_intent_id);
CREATE INDEX IF NOT EXISTS hunter_pe_stripe_evt_idx ON hunter_payment_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS hunter_pe_type_idx       ON hunter_payment_events(event_type);
CREATE INDEX IF NOT EXISTS hunter_pe_processed_idx  ON hunter_payment_events(processed_at DESC);

COMMENT ON TABLE  hunter_payment_events                 IS 'IMMUTABLE append-only ledger. Never update or delete. Finance audit trail + dispute evidence.';
COMMENT ON COLUMN hunter_payment_events.stripe_event_id IS 'UNIQUE — makes webhook idempotent. Stripe retries are silently ignored.';
COMMENT ON COLUMN hunter_payment_events.stripe_payload  IS 'Full raw Stripe event stored for audit, replay, and chargeback evidence.';

CREATE OR REPLACE FUNCTION fn_block_payment_events_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'hunter_payment_events is an immutable ledger — UPDATE and DELETE are forbidden';
END;
$$;

CREATE TRIGGER trg_block_pe_update
  BEFORE UPDATE ON hunter_payment_events
  FOR EACH ROW EXECUTE FUNCTION fn_block_payment_events_mutation();
CREATE TRIGGER trg_block_pe_delete
  BEFORE DELETE ON hunter_payment_events
  FOR EACH ROW EXECUTE FUNCTION fn_block_payment_events_mutation();

-- ── 4. Payment state machine ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_payment_state_transition(
  p_payment_intent_id uuid,
  p_event_type        text
)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  current_status text;
  new_status     text;
BEGIN
  SELECT status INTO current_status FROM hunter_payment_intents
  WHERE id = p_payment_intent_id FOR UPDATE; -- row lock prevents concurrent races

  IF current_status IS NULL THEN RETURN 'not_found'; END IF;

  new_status := CASE
    WHEN current_status = 'initiated'      AND p_event_type = 'payment.authorized'       THEN 'authorized'
    WHEN current_status = 'initiated'      AND p_event_type = 'payment.captured'          THEN 'captured'
    WHEN current_status = 'initiated'      AND p_event_type = 'payment.failed'            THEN 'failed'
    WHEN current_status = 'authorized'     AND p_event_type = 'payment.captured'          THEN 'captured'
    WHEN current_status = 'authorized'     AND p_event_type = 'payment.voided'            THEN 'voided'
    WHEN current_status = 'authorized'     AND p_event_type = 'payment.failed'            THEN 'failed'
    WHEN current_status = 'captured'       AND p_event_type = 'payment.refund_requested'  THEN 'refund_pending'
    WHEN current_status = 'captured'       AND p_event_type = 'payment.dispute_created'   THEN 'disputed'
    WHEN current_status = 'refund_pending' AND p_event_type = 'payment.refund_processed'  THEN 'refunded'
    WHEN current_status = 'refund_pending' AND p_event_type = 'payment.refund_failed'     THEN 'captured'
    WHEN current_status = 'disputed'       AND p_event_type = 'payment.dispute_won'       THEN 'captured'
    WHEN current_status = 'disputed'       AND p_event_type = 'payment.dispute_lost'      THEN 'chargeback_loss'
    ELSE NULL -- invalid or out-of-order: no-op, no exception
  END;

  IF new_status IS NOT NULL THEN
    UPDATE hunter_payment_intents SET status = new_status WHERE id = p_payment_intent_id;
  END IF;

  RETURN COALESCE(new_status, 'no_op:' || current_status);
END;
$$;

-- ── 5. hunter_refund_requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hunter_refund_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              text        NOT NULL REFERENCES hunter_orgs(id) ON DELETE CASCADE,
  payment_intent_id   uuid        NOT NULL REFERENCES hunter_payment_intents(id),
  stripe_refund_id    text        UNIQUE,
  reason              text        NOT NULL
                      CHECK (reason IN (
                        'duplicate_charge','service_not_received',
                        'cancelled_within_window','wrong_plan',
                        'service_outage','fraud','other'
                      )),
  amount_requested    integer     NOT NULL,
  amount_approved     integer,
  currency            text        NOT NULL DEFAULT 'kes',
  status              text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','processing','processed','failed')),
  policy_eligible     boolean     NOT NULL DEFAULT false,
  auto_approved       boolean     NOT NULL DEFAULT false,
  requested_by        text        NOT NULL,
  reviewed_by         text,
  review_note         text,
  requested_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at         timestamptz,
  processed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS hunter_rr_org_idx    ON hunter_refund_requests(org_id);
CREATE INDEX IF NOT EXISTS hunter_rr_pi_idx     ON hunter_refund_requests(payment_intent_id);
CREATE INDEX IF NOT EXISTS hunter_rr_status_idx ON hunter_refund_requests(status);

COMMENT ON TABLE  hunter_refund_requests               IS 'Refund requests with policy eligibility and full approval trail.';
COMMENT ON COLUMN hunter_refund_requests.auto_approved IS 'duplicate_charge always auto-approved, bypasses manual review.';
COMMENT ON COLUMN hunter_refund_requests.amount_approved IS 'May be pro-rated if partial period was used.';

-- ── 6. Refund policy checker ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_check_refund_policy(
  p_org_id            text,
  p_payment_intent_id uuid,
  p_reason            text
)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_pi         hunter_payment_intents%ROWTYPE;
  v_days_since integer;
BEGIN
  SELECT * INTO v_pi FROM hunter_payment_intents
  WHERE id = p_payment_intent_id AND org_id = p_org_id;

  IF v_pi IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'payment_not_found');
  END IF;
  IF v_pi.status NOT IN ('captured','refund_pending') THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'payment_not_captured', 'status', v_pi.status);
  END IF;
  IF p_reason = 'duplicate_charge' THEN
    RETURN jsonb_build_object('eligible', true, 'auto_approved', true,
      'approved_amount', v_pi.amount, 'note', 'Duplicate charge — full refund auto-approved');
  END IF;

  v_days_since := EXTRACT(DAY FROM (now() - v_pi.created_at))::integer;
  RETURN jsonb_build_object(
    'eligible',       v_days_since <= 14,
    'auto_approved',  false,
    'days_since',     v_days_since,
    'approved_amount', CASE WHEN v_days_since <= 14 THEN v_pi.amount ELSE NULL END,
    'note', CASE WHEN v_days_since <= 14
      THEN '14-day refund window — eligible'
      ELSE 'Outside 14-day window — requires manual review'
    END
  );
END;
$$;

-- ── 7. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE hunter_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_payment_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members only" ON hunter_subscriptions
  FOR ALL USING (org_id = current_setting('app.org_id', true));
CREATE POLICY "org members only" ON hunter_payment_intents
  FOR ALL USING (org_id = current_setting('app.org_id', true));
CREATE POLICY "org members only" ON hunter_payment_events
  FOR ALL USING (org_id = current_setting('app.org_id', true));
CREATE POLICY "org members only" ON hunter_refund_requests
  FOR ALL USING (org_id = current_setting('app.org_id', true));
