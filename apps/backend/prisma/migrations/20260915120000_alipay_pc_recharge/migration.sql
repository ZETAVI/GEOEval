-- Additive Alipay PC support. Existing WeChat facts and obligations remain valid.
ALTER TABLE recharge_payment_observations
  ALTER COLUMN notification_id TYPE VARCHAR(128),
  ALTER COLUMN transaction_id DROP NOT NULL,
  ALTER COLUMN success_at DROP NOT NULL,
  ALTER COLUMN signed_at_seconds DROP NOT NULL,
  ALTER COLUMN body_sha256 DROP NOT NULL,
  ADD COLUMN observation_state VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
  ADD COLUMN provider_state VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
  ADD COLUMN seller_transfer_at TIMESTAMPTZ(3),
  ADD COLUMN proof_kind VARCHAR(32) NOT NULL DEFAULT 'WECHAT_V3',
  ADD COLUMN sdk_version VARCHAR(32),
  ADD COLUMN request_sha256 VARCHAR(64),
  ADD COLUMN response_data_sha256 VARCHAR(64);

ALTER TABLE recharge_notification_receipts
  ALTER COLUMN notification_id TYPE VARCHAR(128);

ALTER TABLE recharge_orders
  ADD COLUMN cashier_attempt_id UUID,
  ADD COLUMN credit_confirmed_at TIMESTAMPTZ(3);

UPDATE recharge_orders o
SET credit_confirmed_at = COALESCE(
  (SELECT p.created_at FROM point_changes p WHERE p.id=o.ledger_id),
  o.paid_at,
  o.created_at
)
WHERE o.status='SUCCESSFUL';

ALTER TABLE recharge_operation_attempts
  ALTER COLUMN result_kind TYPE VARCHAR(32),
  ALTER COLUMN trade_state TYPE VARCHAR(32),
  ADD COLUMN proof_kind VARCHAR(32),
  ADD COLUMN sdk_version VARCHAR(32),
  ADD COLUMN request_proof_sha256 VARCHAR(64),
  ADD COLUMN response_data_sha256 VARCHAR(64);

UPDATE recharge_operation_attempts
SET proof_kind='WECHAT_V3'
WHERE verification_key_id IS NOT NULL;

ALTER TABLE recharge_orders ADD CONSTRAINT recharge_orders_cashier_attempt_id_id_fkey
  FOREIGN KEY (cashier_attempt_id,id) REFERENCES recharge_operation_attempts(id,order_id)
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE recharge_orders DROP CONSTRAINT recharge_order_contract;
ALTER TABLE recharge_orders ADD CONSTRAINT recharge_order_contract CHECK (
  amount_yuan > 0 AND amount_fen = amount_yuan::BIGINT * 100 AND funded_points::BIGINT = amount_yuan::BIGINT * 10
  AND ((provider='WECHAT' AND method='WECHAT_NATIVE') OR (provider='ALIPAY' AND method='ALIPAY_PC'))
  AND currency='CNY'
  AND merchant_id ~ '^[0-9]{1,32}$' AND app_id ~ '^[A-Za-z0-9_-]{1,32}$'
  AND merchant_order_no ~ '^[A-Za-z0-9_-]{1,32}$'
  AND dispatch_state IN ('UNSENT','MAY_EXIST') AND isfinite(expires_at) AND isfinite(created_at) AND expires_at > created_at
  AND (review_reason IS NULL OR review_reason IN ('UNKNOWN_ORDER','FACT_MISMATCH','RECEIPT_CONFLICT','CLOSED_ORDER','TRANSACTION_REUSED','PAYMENT_CONFLICT'))
  AND (
    (status IN ('PENDING_PAYMENT','CONFIRMING') AND paid_at IS NULL AND credit_confirmed_at IS NULL AND closed_at IS NULL AND ledger_id IS NULL AND provider_transaction_id IS NULL AND paid_observation_id IS NULL)
    OR (status='CLOSED' AND closed_at IS NOT NULL AND isfinite(closed_at) AND paid_at IS NULL AND credit_confirmed_at IS NULL AND ledger_id IS NULL AND provider_transaction_id IS NULL AND paid_observation_id IS NULL)
    OR (status='SUCCESSFUL' AND credit_confirmed_at IS NOT NULL AND isfinite(credit_confirmed_at) AND (paid_at IS NULL OR isfinite(paid_at)) AND closed_at IS NULL AND ledger_id IS NOT NULL AND paid_observation_id IS NOT NULL AND provider_transaction_id IS NOT NULL)
  )
);

ALTER TABLE recharge_payment_observations DROP CONSTRAINT recharge_observation_protocol_check;
ALTER TABLE recharge_payment_observations ADD CONSTRAINT recharge_observation_protocol_check CHECK (
  provider IN ('WECHAT','ALIPAY') AND currency='CNY'
  AND facts_sha256 ~ '^[a-f0-9]{64}$'
  AND length(merchant_id)>0 AND length(app_id)>0 AND length(merchant_order_no)>0
  AND length(verification_key_id)>0
  AND order_total_fen BETWEEN 1 AND 9007199254740991
  AND (payer_total_fen IS NULL OR payer_total_fen BETWEEN 0 AND order_total_fen)
  AND (payer_currency IS NULL OR payer_currency='CNY')
  AND isfinite(received_at)
  AND observation_state IN ('SUCCESS','NOTPAY','CLOSED_UNRESOLVED')
  AND (
    (observation_state='SUCCESS' AND transaction_id IS NOT NULL AND length(transaction_id)>0)
    OR (observation_state<>'SUCCESS' AND success_at IS NULL)
  )
  AND (
    (provider='WECHAT' AND facts_version=1 AND provider_state='SUCCESS'
      AND (trade_type IS NULL OR trade_type='NATIVE')
      AND observation_state='SUCCESS' AND success_at IS NOT NULL AND isfinite(success_at)
      AND seller_transfer_at IS NULL AND proof_kind='WECHAT_V3'
      AND signed_at_seconds BETWEEN 0 AND 9007199254740991
      AND body_sha256 ~ '^[a-f0-9]{64}$'
      AND sdk_version IS NULL AND request_sha256 IS NULL AND response_data_sha256 IS NULL)
    OR
    (provider='ALIPAY' AND facts_version=2 AND trade_type='ALIPAY_PC'
      AND provider_state IN ('TRADE_SUCCESS','TRADE_FINISHED','WAIT_BUYER_PAY','TRADE_CLOSED')
      AND signed_at_seconds IS NULL
      AND (success_at IS NULL OR isfinite(success_at))
      AND (seller_transfer_at IS NULL OR isfinite(seller_transfer_at))
      AND (
        (proof_kind='ALIPAY_FORM_RSA2' AND body_sha256 ~ '^[a-f0-9]{64}$'
          AND sdk_version IS NULL AND request_sha256 IS NULL AND response_data_sha256 IS NULL)
        OR
        (proof_kind='ALIPAY_V3_SDK' AND body_sha256 IS NULL AND sdk_version='4.14.0'
          AND request_sha256 ~ '^[a-f0-9]{64}$' AND response_data_sha256 ~ '^[a-f0-9]{64}$')
      ))
  )
  AND (
    (source_kind='NOTIFICATION' AND notification_id IS NOT NULL AND length(notification_id)>0
      AND octet_length(notification_id)<=128 AND notification_created_at IS NOT NULL AND isfinite(notification_created_at)
      AND (provider<>'WECHAT' OR (trade_type IS NOT NULL AND trade_type='NATIVE' AND payer_total_fen IS NOT NULL AND payer_currency IS NOT NULL AND payer_currency='CNY'))
      AND query_key IS NULL AND queried_order_id IS NULL)
    OR
    (source_kind='QUERY' AND observation_state='SUCCESS' AND notification_id IS NULL AND notification_created_at IS NULL
      AND query_key ~ '^[a-f0-9]{64}$' AND queried_order_id IS NOT NULL)
  )
);

ALTER TABLE recharge_notification_receipts DROP CONSTRAINT recharge_receipt_processing_contract;
ALTER TABLE recharge_notification_receipts ADD CONSTRAINT recharge_receipt_processing_contract CHECK (
  (review_reason IS NULL OR review_reason IN ('UNKNOWN_ORDER','FACT_MISMATCH','RECEIPT_CONFLICT','CLOSED_ORDER','TRANSACTION_REUSED','PAYMENT_CONFLICT'))
  AND ((processed_at IS NULL AND applied_recharge_order_id IS NULL)
    OR (processed_at IS NOT NULL AND isfinite(processed_at)))
);

ALTER TABLE recharge_operation_attempts DROP CONSTRAINT recharge_operation_shape;
ALTER TABLE recharge_operation_attempts ADD CONSTRAINT recharge_operation_shape CHECK (
  generation>0 AND kind IN ('INITIATE','QUERY','CLOSE') AND request_sha256 ~ '^[a-f0-9]{64}$'
  AND ((finished_at IS NULL AND result_kind IS NULL AND result_sha256 IS NULL AND diagnostic_code IS NULL AND trade_state IS NULL
      AND verification_key_id IS NULL AND signed_at_seconds IS NULL AND received_at IS NULL AND body_sha256 IS NULL
      AND proof_kind IS NULL AND sdk_version IS NULL AND request_proof_sha256 IS NULL AND response_data_sha256 IS NULL
      AND payment_observation_id IS NULL AND processing_state IS NULL AND processing_due_at IS NULL)
    OR (finished_at IS NOT NULL AND result_kind IS NOT NULL AND result_sha256 ~ '^[a-f0-9]{64}$'
      AND (
        (result_kind='UNRESOLVED' AND diagnostic_code IS NOT NULL AND verification_key_id IS NULL AND signed_at_seconds IS NULL
          AND received_at IS NULL AND body_sha256 IS NULL AND proof_kind IS NULL AND sdk_version IS NULL
          AND request_proof_sha256 IS NULL AND response_data_sha256 IS NULL AND trade_state IS NULL)
        OR
        (result_kind='CASHIER' AND kind='INITIATE' AND diagnostic_code IS NULL AND trade_state IS NULL
          AND verification_key_id IS NULL AND signed_at_seconds IS NULL AND received_at IS NULL AND body_sha256 IS NULL
          AND proof_kind IS NULL AND sdk_version IS NULL AND request_proof_sha256 IS NULL AND response_data_sha256 IS NULL)
        OR
        (result_kind IN ('QR','NOTPAY','CLOSED','SUCCESS','REVIEW') AND diagnostic_code IS NULL
          AND verification_key_id IS NOT NULL AND received_at IS NOT NULL
          AND (
            (proof_kind='WECHAT_V3' AND signed_at_seconds>=0 AND body_sha256 ~ '^[a-f0-9]{64}$'
              AND sdk_version IS NULL AND request_proof_sha256 IS NULL AND response_data_sha256 IS NULL)
            OR
            (proof_kind='ALIPAY_V3_SDK' AND signed_at_seconds IS NULL AND body_sha256 IS NULL AND sdk_version='4.14.0'
              AND request_proof_sha256 ~ '^[a-f0-9]{64}$' AND response_data_sha256 ~ '^[a-f0-9]{64}$')
          )
          AND ((kind='INITIATE' AND result_kind='QR' AND trade_state IS NULL)
            OR (kind='CLOSE' AND result_kind='CLOSED' AND trade_state IS NULL)
            OR (kind='QUERY' AND trade_state IS NOT NULL AND
              ((result_kind=trade_state AND trade_state IN ('NOTPAY','CLOSED','SUCCESS'))
                OR (result_kind='REVIEW' AND trade_state IN ('CLOSED_UNRESOLVED','USERPAYING','REVOKED','PAYERROR','REFUND')))))
      )
      AND ((result_kind='SUCCESS' AND payment_observation_id IS NOT NULL AND processing_state IS NOT NULL
          AND ((processing_state='PENDING' AND processing_due_at IS NOT NULL)
            OR (processing_state IN ('APPLIED','REVIEW') AND processing_due_at IS NULL)))
        OR (result_kind<>'SUCCESS' AND payment_observation_id IS NULL AND processing_state IS NULL AND processing_due_at IS NULL))))
));

CREATE OR REPLACE FUNCTION recharge_preserve_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Recharge orders cannot be deleted' USING ERRCODE = '23514'; END IF;
  IF ROW(NEW.id,NEW.account_id,NEW.idempotency_key,NEW.amount_yuan,NEW.amount_fen,NEW.funded_points,NEW.provider,NEW.merchant_id,NEW.app_id,NEW.merchant_order_no,NEW.method,NEW.currency,NEW.created_at,NEW.expires_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.account_id,OLD.idempotency_key,OLD.amount_yuan,OLD.amount_fen,OLD.funded_points,OLD.provider,OLD.merchant_id,OLD.app_id,OLD.merchant_order_no,OLD.method,OLD.currency,OLD.created_at,OLD.expires_at)
    OR (OLD.dispatch_state = 'MAY_EXIST' AND NEW.dispatch_state <> OLD.dispatch_state)
    OR (OLD.status IN ('SUCCESSFUL','CLOSED') AND ROW(NEW.status,NEW.paid_at,NEW.credit_confirmed_at,NEW.closed_at,NEW.ledger_id,NEW.paid_observation_id,NEW.provider_transaction_id) IS DISTINCT FROM ROW(OLD.status,OLD.paid_at,OLD.credit_confirmed_at,OLD.closed_at,OLD.ledger_id,OLD.paid_observation_id,OLD.provider_transaction_id)) THEN
    RAISE EXCEPTION 'Recharge identity and terminal facts are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION recharge_preserve_native_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW.native_description,NEW.native_notify_url) IS DISTINCT FROM ROW(OLD.native_description,OLD.native_notify_url)
      OR NEW.native_generation < OLD.native_generation
      OR (OLD.native_cancel_requested_at IS NOT NULL AND NEW.native_cancel_requested_at IS DISTINCT FROM OLD.native_cancel_requested_at)
      OR (OLD.native_close_attempt_id IS NOT NULL AND NEW.native_close_attempt_id IS DISTINCT FROM OLD.native_close_attempt_id)
      OR (OLD.cashier_attempt_id IS NOT NULL AND NEW.cashier_attempt_id IS DISTINCT FROM OLD.cashier_attempt_id) THEN
      RAISE EXCEPTION 'Payment request snapshot and cancellation are immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.status='CLOSED' AND NEW.dispatch_state='MAY_EXIST' AND (TG_OP='INSERT' OR OLD.status<>'CLOSED') AND NOT EXISTS (
    SELECT 1 FROM recharge_operation_attempts a WHERE a.id=NEW.native_close_attempt_id AND a.order_id=NEW.id
      AND a.result_kind='CLOSED' AND a.kind IN ('QUERY','CLOSE') AND a.finished_at IS NOT NULL
      AND ((a.proof_kind='WECHAT_V3' AND a.body_sha256 IS NOT NULL) OR (a.proof_kind='ALIPAY_V3_SDK' AND a.response_data_sha256 IS NOT NULL))
  ) THEN RAISE EXCEPTION 'Dispatched recharge needs authenticated closure' USING ERRCODE='23514'; END IF;
  IF NEW.native_qr_attempt_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM recharge_operation_attempts a WHERE a.id=NEW.native_qr_attempt_id AND a.order_id=NEW.id AND a.kind='INITIATE' AND a.result_kind='QR'
  ) THEN RAISE EXCEPTION 'Native QR requires its authenticated attempt' USING ERRCODE='23514'; END IF;
  IF NEW.cashier_attempt_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM recharge_operation_attempts a WHERE a.id=NEW.cashier_attempt_id AND a.order_id=NEW.id AND a.kind='INITIATE' AND a.result_kind='CASHIER'
  ) THEN RAISE EXCEPTION 'Cashier grant requires its durable attempt' USING ERRCODE='23514'; END IF;
  IF NEW.native_lease_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM recharge_operation_attempts a WHERE a.id=NEW.native_lease_id AND a.order_id=NEW.id AND a.generation=NEW.native_generation
  ) THEN RAISE EXCEPTION 'Payment lease requires its own generation' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION recharge_preserve_operation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment operations cannot be deleted' USING ERRCODE='23514'; END IF;
  IF ROW(NEW.id,NEW.order_id,NEW.generation,NEW.kind,NEW.request_sha256,NEW.started_at) IS DISTINCT FROM ROW(OLD.id,OLD.order_id,OLD.generation,OLD.kind,OLD.request_sha256,OLD.started_at)
    OR (OLD.finished_at IS NOT NULL AND ROW(NEW.finished_at,NEW.result_kind,NEW.result_sha256,NEW.diagnostic_code,NEW.trade_state,NEW.verification_key_id,NEW.signed_at_seconds,NEW.received_at,NEW.body_sha256,NEW.proof_kind,NEW.sdk_version,NEW.request_proof_sha256,NEW.response_data_sha256,NEW.payment_observation_id)
      IS DISTINCT FROM ROW(OLD.finished_at,OLD.result_kind,OLD.result_sha256,OLD.diagnostic_code,OLD.trade_state,OLD.verification_key_id,OLD.signed_at_seconds,OLD.received_at,OLD.body_sha256,OLD.proof_kind,OLD.sdk_version,OLD.request_proof_sha256,OLD.response_data_sha256,OLD.payment_observation_id))
    OR (OLD.processing_state IN ('APPLIED','REVIEW') AND ROW(NEW.processing_state,NEW.processing_due_at) IS DISTINCT FROM ROW(OLD.processing_state,OLD.processing_due_at)) THEN
    RAISE EXCEPTION 'Payment request and completed result are immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION recharge_check_order_graph() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o recharge_orders%ROWTYPE; r recharge_credit_reservations%ROWTYPE; l point_changes%ROWTYPE; p recharge_payment_observations%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'recharge_orders' THEN SELECT * INTO o FROM recharge_orders WHERE id=NEW.id;
  ELSE SELECT * INTO o FROM recharge_orders WHERE id=NEW.recharge_order_id; END IF;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO r FROM recharge_credit_reservations WHERE recharge_order_id=o.id;
  IF NOT FOUND OR r.points<>o.funded_points OR r.account_id<>o.account_id
    OR (o.status IN ('PENDING_PAYMENT','CONFIRMING') AND r.state<>'HELD')
    OR (o.status='CLOSED' AND r.state<>'RELEASED')
    OR (o.status='SUCCESSFUL' AND r.state<>'CONSUMED') THEN
    RAISE EXCEPTION 'Recharge order and reservation disagree' USING ERRCODE='23514';
  END IF;
  IF o.status='SUCCESSFUL' THEN
    SELECT * INTO l FROM point_changes WHERE id=o.ledger_id;
    SELECT * INTO p FROM recharge_payment_observations WHERE id=o.paid_observation_id;
    IF l.kind IS DISTINCT FROM 'RECHARGE' OR l.recharge_order_id IS DISTINCT FROM o.id OR l.funded_delta IS DISTINCT FROM o.funded_points
      OR p.observation_state IS DISTINCT FROM 'SUCCESS'
      OR ROW(p.provider,p.merchant_id,p.app_id,p.merchant_order_no,p.transaction_id,p.order_total_fen,p.currency,p.success_at)
        IS DISTINCT FROM ROW(o.provider,o.merchant_id,o.app_id,o.merchant_order_no,o.provider_transaction_id,o.amount_fen,o.currency,o.paid_at) THEN
      RAISE EXCEPTION 'Recharge settlement graph disagrees' USING ERRCODE='23514';
    END IF;
  ELSIF EXISTS (SELECT 1 FROM point_changes WHERE recharge_order_id=o.id) THEN
    RAISE EXCEPTION 'Unsettled recharge has a ledger' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION recharge_check_applied_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE state VARCHAR(32);
BEGIN
  SELECT p.observation_state INTO state FROM recharge_payment_observations p
  WHERE p.provider=NEW.provider AND p.merchant_id=NEW.merchant_id AND p.notification_id=NEW.notification_id AND p.facts_sha256=NEW.canonical_facts_sha256;
  IF NEW.applied_recharge_order_id IS NULL THEN
    IF state='SUCCESS' THEN RAISE EXCEPTION 'Successful receipt cannot be discarded' USING ERRCODE='23514'; END IF;
    RETURN NULL;
  END IF;
  IF state<>'SUCCESS' OR NOT EXISTS (
    SELECT 1 FROM recharge_orders o JOIN recharge_payment_observations p
      ON p.provider=NEW.provider AND p.merchant_id=NEW.merchant_id AND p.notification_id=NEW.notification_id AND p.facts_sha256=NEW.canonical_facts_sha256
    WHERE o.id=NEW.applied_recharge_order_id AND o.status='SUCCESSFUL'
      AND ROW(p.provider,p.merchant_id,p.app_id,p.merchant_order_no,p.transaction_id,p.order_total_fen,p.currency)
        IS NOT DISTINCT FROM ROW(o.provider,o.merchant_id,o.app_id,o.merchant_order_no,o.provider_transaction_id,o.amount_fen,o.currency)
      AND (p.success_at IS NULL OR o.paid_at IS NULL OR p.success_at=o.paid_at)
  ) THEN RAISE EXCEPTION 'Applied receipt requires successful recharge' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END; $$;
