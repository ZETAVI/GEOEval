-- AlterTable
ALTER TABLE "recharge_notification_receipts" ADD COLUMN     "retry_after" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "recharge_orders" ADD COLUMN     "native_cancel_requested_at" TIMESTAMPTZ(3),
ADD COLUMN     "native_close_attempt_id" UUID,
ADD COLUMN     "native_description" VARCHAR(127),
ADD COLUMN     "native_failure_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "native_generation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "native_lease_id" UUID,
ADD COLUMN     "native_lease_until" TIMESTAMPTZ(3),
ADD COLUMN     "native_next_action_at" TIMESTAMPTZ(3),
ADD COLUMN     "native_next_operation" VARCHAR(16),
ADD COLUMN     "native_notify_url" VARCHAR(256),
ADD COLUMN     "native_qr_attempt_id" UUID,
ADD COLUMN     "native_qr_expires_at" TIMESTAMPTZ(3),
ADD COLUMN     "native_qr_url" VARCHAR(2048),
ADD COLUMN     "native_review_reason" VARCHAR(64);

-- CreateTable
CREATE TABLE "recharge_operation_attempts" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "generation" INTEGER NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "request_sha256" VARCHAR(64) NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "result_kind" VARCHAR(16),
    "result_sha256" VARCHAR(64),
    "diagnostic_code" VARCHAR(64),
    "trade_state" VARCHAR(16),
    "verification_key_id" VARCHAR(128),
    "signed_at_seconds" BIGINT,
    "received_at" TIMESTAMPTZ(3),
    "body_sha256" VARCHAR(64),
    "payment_observation_id" UUID,
    "processing_state" VARCHAR(16),
    "processing_due_at" TIMESTAMPTZ(3),

    CONSTRAINT "recharge_operation_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recharge_operation_attempts_processing_state_processing_due_idx" ON "recharge_operation_attempts"("processing_state", "processing_due_at");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_operation_attempts_id_order_id_key" ON "recharge_operation_attempts"("id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_operation_attempts_order_id_generation_key" ON "recharge_operation_attempts"("order_id", "generation");

-- CreateIndex
CREATE INDEX "recharge_native_due_idx" ON "recharge_orders"("native_next_action_at");

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_native_qr_attempt_id_id_fkey" FOREIGN KEY ("native_qr_attempt_id", "id") REFERENCES "recharge_operation_attempts"("id", "order_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_native_close_attempt_id_id_fkey" FOREIGN KEY ("native_close_attempt_id", "id") REFERENCES "recharge_operation_attempts"("id", "order_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_operation_attempts" ADD CONSTRAINT "recharge_operation_attempts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "recharge_orders"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_operation_attempts" ADD CONSTRAINT "recharge_operation_attempts_payment_observation_id_fkey" FOREIGN KEY ("payment_observation_id") REFERENCES "recharge_payment_observations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Existing obligations can be queried/closed, but missing legacy initiation snapshots are never invented.
UPDATE recharge_orders SET native_next_operation='QUERY', native_next_action_at=CASE WHEN dispatch_state='MAY_EXIST' THEN CURRENT_TIMESTAMP ELSE expires_at END WHERE status IN ('PENDING_PAYMENT','CONFIRMING');
UPDATE recharge_notification_receipts SET retry_after=created_at;

ALTER TABLE recharge_orders ADD CONSTRAINT recharge_native_shape CHECK (
  native_generation >= 0 AND native_failure_count >= 0
  AND ((native_description IS NULL AND native_notify_url IS NULL) OR
    (native_description IS NOT NULL AND octet_length(native_description) BETWEEN 1 AND 127 AND native_notify_url IS NOT NULL AND native_notify_url LIKE 'https://%'))
  AND ((native_next_operation IS NULL AND native_next_action_at IS NULL) OR
    (native_next_operation IS NOT NULL AND native_next_operation IN ('INITIATE','QUERY','CLOSE') AND native_next_action_at IS NOT NULL))
  AND ((native_lease_id IS NULL AND native_lease_until IS NULL) OR (native_lease_id IS NOT NULL AND native_lease_until IS NOT NULL))
  AND ((native_qr_url IS NULL AND native_qr_expires_at IS NULL AND native_qr_attempt_id IS NULL) OR
    (native_qr_url IS NOT NULL AND native_qr_expires_at IS NOT NULL AND native_qr_attempt_id IS NOT NULL AND native_qr_expires_at <= expires_at))
);
ALTER TABLE recharge_operation_attempts ADD CONSTRAINT recharge_operation_shape CHECK (
  generation > 0 AND kind IN ('INITIATE','QUERY','CLOSE') AND request_sha256 ~ '^[a-f0-9]{64}$'
  AND ((finished_at IS NULL AND result_kind IS NULL AND result_sha256 IS NULL AND diagnostic_code IS NULL AND trade_state IS NULL
      AND verification_key_id IS NULL AND signed_at_seconds IS NULL AND received_at IS NULL AND body_sha256 IS NULL AND payment_observation_id IS NULL AND processing_state IS NULL AND processing_due_at IS NULL)
    OR (finished_at IS NOT NULL AND result_kind IS NOT NULL AND result_sha256 IS NOT NULL AND result_sha256 ~ '^[a-f0-9]{64}$'
      AND ((result_kind='UNRESOLVED' AND diagnostic_code IS NOT NULL AND verification_key_id IS NULL AND signed_at_seconds IS NULL AND received_at IS NULL AND body_sha256 IS NULL AND trade_state IS NULL)
        OR (result_kind IN ('QR','NOTPAY','CLOSED','SUCCESS','REVIEW') AND diagnostic_code IS NULL AND verification_key_id IS NOT NULL AND signed_at_seconds IS NOT NULL AND signed_at_seconds>=0 AND received_at IS NOT NULL AND body_sha256 IS NOT NULL AND body_sha256 ~ '^[a-f0-9]{64}$'
          AND ((kind='INITIATE' AND result_kind='QR' AND trade_state IS NULL)
            OR (kind='CLOSE' AND result_kind='CLOSED' AND trade_state IS NULL)
            OR (kind='QUERY' AND trade_state IS NOT NULL AND ((result_kind=trade_state AND trade_state IN ('NOTPAY','CLOSED','SUCCESS')) OR (result_kind='REVIEW' AND trade_state IN ('USERPAYING','REVOKED','PAYERROR','REFUND')))))))
      AND ((result_kind='SUCCESS' AND payment_observation_id IS NOT NULL AND processing_state IS NOT NULL AND ((processing_state='PENDING' AND processing_due_at IS NOT NULL) OR (processing_state IN ('APPLIED','REVIEW') AND processing_due_at IS NULL)))
        OR (result_kind<>'SUCCESS' AND payment_observation_id IS NULL AND processing_state IS NULL AND processing_due_at IS NULL))))
);

CREATE FUNCTION recharge_preserve_native_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.native_description,NEW.native_notify_url) IS DISTINCT FROM ROW(OLD.native_description,OLD.native_notify_url)
    OR NEW.native_generation < OLD.native_generation
    OR (OLD.native_cancel_requested_at IS NOT NULL AND NEW.native_cancel_requested_at IS DISTINCT FROM OLD.native_cancel_requested_at)
    OR (OLD.native_close_attempt_id IS NOT NULL AND NEW.native_close_attempt_id IS DISTINCT FROM OLD.native_close_attempt_id) THEN
    RAISE EXCEPTION 'Native request snapshot and cancellation are immutable' USING ERRCODE='23514';
  END IF;
  IF NEW.status='CLOSED' AND OLD.status<>'CLOSED' AND NEW.dispatch_state='MAY_EXIST' AND NOT EXISTS (
    SELECT 1 FROM recharge_operation_attempts a WHERE a.id=NEW.native_close_attempt_id AND a.order_id=NEW.id AND a.result_kind='CLOSED' AND a.kind IN ('QUERY','CLOSE') AND a.finished_at IS NOT NULL AND a.body_sha256 IS NOT NULL
  ) THEN RAISE EXCEPTION 'Dispatched recharge needs authenticated closure' USING ERRCODE='23514'; END IF;
  IF NEW.native_qr_attempt_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM recharge_operation_attempts a WHERE a.id=NEW.native_qr_attempt_id AND a.order_id=NEW.id AND a.kind='INITIATE' AND a.result_kind='QR'
  ) THEN RAISE EXCEPTION 'Native QR requires its authenticated attempt' USING ERRCODE='23514'; END IF;
  IF NEW.native_lease_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM recharge_operation_attempts a WHERE a.id=NEW.native_lease_id AND a.order_id=NEW.id AND a.generation=NEW.native_generation
  ) THEN RAISE EXCEPTION 'Native lease requires its own generation' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER recharge_native_order_guard BEFORE UPDATE ON recharge_orders FOR EACH ROW EXECUTE FUNCTION recharge_preserve_native_order();

CREATE FUNCTION recharge_preserve_operation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Native operations cannot be deleted' USING ERRCODE='23514'; END IF;
  IF ROW(NEW.id,NEW.order_id,NEW.generation,NEW.kind,NEW.request_sha256,NEW.started_at) IS DISTINCT FROM ROW(OLD.id,OLD.order_id,OLD.generation,OLD.kind,OLD.request_sha256,OLD.started_at)
    OR (OLD.finished_at IS NOT NULL AND ROW(NEW.finished_at,NEW.result_kind,NEW.result_sha256,NEW.diagnostic_code,NEW.trade_state,NEW.verification_key_id,NEW.signed_at_seconds,NEW.received_at,NEW.body_sha256,NEW.payment_observation_id)
      IS DISTINCT FROM ROW(OLD.finished_at,OLD.result_kind,OLD.result_sha256,OLD.diagnostic_code,OLD.trade_state,OLD.verification_key_id,OLD.signed_at_seconds,OLD.received_at,OLD.body_sha256,OLD.payment_observation_id))
    OR (OLD.processing_state IN ('APPLIED','REVIEW') AND ROW(NEW.processing_state,NEW.processing_due_at) IS DISTINCT FROM ROW(OLD.processing_state,OLD.processing_due_at)) THEN
    RAISE EXCEPTION 'Native request and completed result are immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER recharge_native_operation_guard BEFORE UPDATE OR DELETE ON recharge_operation_attempts FOR EACH ROW EXECUTE FUNCTION recharge_preserve_operation();

CREATE FUNCTION recharge_check_operation_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_observation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM recharge_payment_observations p WHERE p.id=NEW.payment_observation_id AND p.source_kind='QUERY' AND p.queried_order_id=NEW.order_id
  ) THEN RAISE EXCEPTION 'Native settlement requires its own query source' USING ERRCODE='23514'; END IF;
  IF NEW.processing_state='APPLIED' AND NOT EXISTS (
    SELECT 1 FROM recharge_orders o JOIN recharge_payment_observations p ON p.id=NEW.payment_observation_id
    WHERE o.id=NEW.order_id AND o.status='SUCCESSFUL'
      AND ROW(o.provider,o.merchant_id,o.app_id,o.merchant_order_no,o.provider_transaction_id,o.amount_fen,o.currency,o.paid_at)
        IS NOT DISTINCT FROM ROW(p.provider,p.merchant_id,p.app_id,p.merchant_order_no,p.transaction_id,p.order_total_fen,p.currency,p.success_at)
  ) THEN RAISE EXCEPTION 'Applied Native query requires successful recharge' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER recharge_native_operation_source AFTER INSERT OR UPDATE ON recharge_operation_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION recharge_check_operation_source();
