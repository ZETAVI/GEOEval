-- AlterTable
ALTER TABLE "point_accounts" ADD COLUMN     "reserved_funded_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reserved_ledger_slots" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "point_changes" ADD COLUMN     "actor_kind" VARCHAR(16) NOT NULL DEFAULT 'ACCOUNT',
ADD COLUMN     "recharge_order_id" UUID,
ALTER COLUMN "actor_account_id" DROP NOT NULL,
ALTER COLUMN "idempotency_key" DROP NOT NULL;

-- AlterTable
ALTER TABLE "recharge_payment_observations" ADD COLUMN     "queried_order_id" UUID,
ADD COLUMN     "query_key" VARCHAR(64),
ADD COLUMN     "source_kind" VARCHAR(16) NOT NULL DEFAULT 'NOTIFICATION',
ALTER COLUMN "notification_id" DROP NOT NULL,
ALTER COLUMN "trade_type" DROP NOT NULL,
ALTER COLUMN "payer_total_fen" DROP NOT NULL,
ALTER COLUMN "payer_currency" DROP NOT NULL,
ALTER COLUMN "notification_created_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "recharge_notification_receipts" ADD COLUMN     "applied_recharge_order_id" UUID,
ADD COLUMN     "review_reason" VARCHAR(64);

-- CreateTable
CREATE TABLE "recharge_orders" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "amount_yuan" INTEGER NOT NULL,
    "amount_fen" BIGINT NOT NULL,
    "funded_points" INTEGER NOT NULL,
    "provider" VARCHAR(16) NOT NULL,
    "merchant_id" VARCHAR(128) NOT NULL,
    "app_id" VARCHAR(128) NOT NULL,
    "merchant_order_no" VARCHAR(32) NOT NULL,
    "method" VARCHAR(32) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT',
    "dispatch_state" VARCHAR(16) NOT NULL DEFAULT 'UNSENT',
    "provider_transaction_id" VARCHAR(128),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "ledger_id" UUID,
    "paid_observation_id" UUID,
    "review_reason" VARCHAR(64),

    CONSTRAINT "recharge_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_credit_reservations" (
    "recharge_order_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "state" VARCHAR(16) NOT NULL DEFAULT 'HELD',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "recharge_credit_reservations_pkey" PRIMARY KEY ("recharge_order_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recharge_orders_ledger_id_key" ON "recharge_orders"("ledger_id");

-- CreateIndex
CREATE INDEX "recharge_orders_account_id_status_idx" ON "recharge_orders"("account_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_orders_account_id_idempotency_key_key" ON "recharge_orders"("account_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_orders_id_account_id_key" ON "recharge_orders"("id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_order_merchant_identity_key" ON "recharge_orders"("id", "provider", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_merchant_order_key" ON "recharge_orders"("provider", "merchant_id", "merchant_order_no");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_provider_transaction_key" ON "recharge_orders"("provider", "merchant_id", "provider_transaction_id");

-- CreateIndex
CREATE INDEX "recharge_credit_reservations_account_id_state_idx" ON "recharge_credit_reservations"("account_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "point_changes_recharge_order_id_key" ON "point_changes"("recharge_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_change_recharge_identity_key" ON "point_changes"("id", "recharge_order_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_payment_observations_query_key_key" ON "recharge_payment_observations"("query_key");

-- AddForeignKey
ALTER TABLE "point_changes" ADD CONSTRAINT "point_changes_recharge_owner_fkey" FOREIGN KEY ("recharge_order_id", "account_id") REFERENCES "recharge_orders"("id", "account_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_payment_observations" ADD CONSTRAINT "recharge_payment_observations_queried_order_id_fkey" FOREIGN KEY ("queried_order_id") REFERENCES "recharge_orders"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_notification_receipts" ADD CONSTRAINT "recharge_receipt_applied_owner_fkey" FOREIGN KEY ("applied_recharge_order_id", "provider", "merchant_id") REFERENCES "recharge_orders"("id", "provider", "merchant_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_order_settled_ledger_fkey" FOREIGN KEY ("ledger_id", "id", "account_id") REFERENCES "point_changes"("id", "recharge_order_id", "account_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_paid_observation_id_fkey" FOREIGN KEY ("paid_observation_id") REFERENCES "recharge_payment_observations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_credit_reservations" ADD CONSTRAINT "recharge_reservation_order_owner_fkey" FOREIGN KEY ("recharge_order_id", "account_id") REFERENCES "recharge_orders"("id", "account_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recharge_credit_reservations" ADD CONSTRAINT "recharge_credit_reservations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "point_accounts"("account_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Existing request-key uniqueness remains. Only system recharge credit may omit it.
ALTER TABLE point_accounts ADD CONSTRAINT point_accounts_recharge_capacity CHECK (
  reserved_funded_points >= 0 AND reserved_ledger_slots >= 0
  AND granted_balance::BIGINT + funded_balance + reserved_funded_points <= 2147483647
  AND revision::BIGINT + reserved_ledger_slots <= 2147483647
);
ALTER TABLE point_changes DROP CONSTRAINT point_changes_kind_link;
ALTER TABLE point_changes ADD CONSTRAINT point_changes_kind_link CHECK (
  (kind = 'ADMIN_ADJUSTMENT' AND publishing_order_id IS NULL AND recharge_order_id IS NULL)
  OR (kind = 'PUBLISHING_ORDER' AND publishing_order_id IS NOT NULL AND recharge_order_id IS NULL AND granted_delta <= 0 AND funded_delta <= 0 AND actor_account_id = account_id)
  OR (kind = 'RECHARGE' AND publishing_order_id IS NULL AND recharge_order_id IS NOT NULL AND granted_delta = 0 AND funded_delta > 0)
);
ALTER TABLE point_changes ADD CONSTRAINT point_changes_actor_and_request CHECK (
  (kind = 'RECHARGE' AND actor_kind = 'SYSTEM' AND actor_account_id IS NULL AND idempotency_key IS NULL)
  OR (kind IN ('ADMIN_ADJUSTMENT','PUBLISHING_ORDER') AND actor_kind = 'ACCOUNT' AND actor_account_id IS NOT NULL AND idempotency_key IS NOT NULL)
);
ALTER TABLE recharge_orders ADD CONSTRAINT recharge_order_contract CHECK (
  amount_yuan > 0 AND amount_fen = amount_yuan::BIGINT * 100 AND funded_points::BIGINT = amount_yuan::BIGINT * 10
  AND provider = 'WECHAT' AND method = 'WECHAT_NATIVE' AND currency = 'CNY'
  AND merchant_id ~ '^[0-9]{1,32}$' AND app_id ~ '^[A-Za-z0-9_-]{1,32}$'
  AND merchant_order_no ~ '^[A-Za-z0-9_-]{1,32}$'
  AND dispatch_state IN ('UNSENT','MAY_EXIST') AND isfinite(expires_at) AND isfinite(created_at) AND expires_at > created_at
  AND (review_reason IS NULL OR review_reason IN ('UNKNOWN_ORDER','FACT_MISMATCH','RECEIPT_CONFLICT','CLOSED_ORDER','TRANSACTION_REUSED','PAYMENT_CONFLICT'))
  AND (
    (status IN ('PENDING_PAYMENT','CONFIRMING') AND paid_at IS NULL AND closed_at IS NULL AND ledger_id IS NULL AND provider_transaction_id IS NULL AND paid_observation_id IS NULL)
    OR (status = 'CLOSED' AND closed_at IS NOT NULL AND isfinite(closed_at) AND paid_at IS NULL AND ledger_id IS NULL AND provider_transaction_id IS NULL AND paid_observation_id IS NULL)
    OR (status = 'SUCCESSFUL' AND paid_at IS NOT NULL AND isfinite(paid_at) AND closed_at IS NULL AND ledger_id IS NOT NULL AND paid_observation_id IS NOT NULL AND provider_transaction_id IS NOT NULL)
  )
);
ALTER TABLE recharge_credit_reservations ADD CONSTRAINT recharge_reservation_contract CHECK (
  points > 0 AND isfinite(created_at) AND (
    (state = 'HELD' AND completed_at IS NULL)
    OR (state IN ('CONSUMED','RELEASED') AND completed_at IS NOT NULL AND isfinite(completed_at))
  )
);
ALTER TABLE recharge_notification_receipts ADD CONSTRAINT recharge_receipt_processing_contract CHECK (
  (review_reason IS NULL OR review_reason IN ('UNKNOWN_ORDER','FACT_MISMATCH','RECEIPT_CONFLICT','CLOSED_ORDER','TRANSACTION_REUSED','PAYMENT_CONFLICT'))
  AND ((processed_at IS NULL AND applied_recharge_order_id IS NULL) OR (processed_at IS NOT NULL AND isfinite(processed_at) AND applied_recharge_order_id IS NOT NULL))
);

ALTER TABLE recharge_payment_observations DROP CONSTRAINT recharge_observation_protocol_check;
ALTER TABLE recharge_payment_observations ADD CONSTRAINT recharge_observation_protocol_check CHECK (
  provider = 'WECHAT' AND facts_version = 1 AND currency = 'CNY'
  AND (trade_type IS NULL OR trade_type = 'NATIVE') AND (payer_currency IS NULL OR payer_currency = 'CNY')
  AND length(merchant_id) > 0 AND length(app_id) > 0 AND length(merchant_order_no) > 0 AND length(transaction_id) > 0 AND length(verification_key_id) > 0
  AND facts_sha256 ~ '^[a-f0-9]{64}$' AND body_sha256 ~ '^[a-f0-9]{64}$'
  AND order_total_fen BETWEEN 1 AND 9007199254740991
  AND (payer_total_fen IS NULL OR payer_total_fen BETWEEN 0 AND order_total_fen)
  AND signed_at_seconds BETWEEN 0 AND 9007199254740991 AND isfinite(success_at) AND isfinite(received_at)
  AND (
    (source_kind = 'NOTIFICATION' AND notification_id IS NOT NULL AND length(notification_id) > 0
      AND notification_created_at IS NOT NULL AND isfinite(notification_created_at)
      AND trade_type IS NOT NULL AND payer_total_fen IS NOT NULL AND payer_currency IS NOT NULL
      AND query_key IS NULL AND queried_order_id IS NULL)
    OR (source_kind = 'QUERY' AND notification_id IS NULL AND notification_created_at IS NULL
      AND query_key IS NOT NULL AND query_key ~ '^[a-f0-9]{64}$' AND queried_order_id IS NOT NULL)
  )
);

CREATE FUNCTION recharge_preserve_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Recharge orders cannot be deleted' USING ERRCODE = '23514'; END IF;
  IF ROW(NEW.id,NEW.account_id,NEW.idempotency_key,NEW.amount_yuan,NEW.amount_fen,NEW.funded_points,NEW.provider,NEW.merchant_id,NEW.app_id,NEW.merchant_order_no,NEW.method,NEW.currency,NEW.created_at,NEW.expires_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.account_id,OLD.idempotency_key,OLD.amount_yuan,OLD.amount_fen,OLD.funded_points,OLD.provider,OLD.merchant_id,OLD.app_id,OLD.merchant_order_no,OLD.method,OLD.currency,OLD.created_at,OLD.expires_at)
    OR (OLD.dispatch_state = 'MAY_EXIST' AND NEW.dispatch_state <> OLD.dispatch_state)
    OR (OLD.status IN ('SUCCESSFUL','CLOSED') AND ROW(NEW.status,NEW.paid_at,NEW.closed_at,NEW.ledger_id,NEW.paid_observation_id,NEW.provider_transaction_id) IS DISTINCT FROM ROW(OLD.status,OLD.paid_at,OLD.closed_at,OLD.ledger_id,OLD.paid_observation_id,OLD.provider_transaction_id)) THEN
    RAISE EXCEPTION 'Recharge identity and terminal facts are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER recharge_order_immutable BEFORE UPDATE OR DELETE ON recharge_orders FOR EACH ROW EXECUTE FUNCTION recharge_preserve_order();

CREATE FUNCTION recharge_preserve_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Recharge reservation cannot be deleted' USING ERRCODE = '23514'; END IF;
  IF ROW(NEW.recharge_order_id,NEW.account_id,NEW.points,NEW.created_at) IS DISTINCT FROM ROW(OLD.recharge_order_id,OLD.account_id,OLD.points,OLD.created_at)
    OR (OLD.state <> 'HELD' AND ROW(NEW.state,NEW.completed_at) IS DISTINCT FROM ROW(OLD.state,OLD.completed_at)) THEN
    RAISE EXCEPTION 'Recharge reservation cannot be rewritten' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER recharge_reservation_immutable BEFORE UPDATE OR DELETE ON recharge_credit_reservations FOR EACH ROW EXECUTE FUNCTION recharge_preserve_reservation();

CREATE FUNCTION recharge_preserve_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.kind = 'RECHARGE' OR (TG_OP = 'UPDATE' AND NEW.kind = 'RECHARGE') THEN
    RAISE EXCEPTION 'Recharge ledger is append-only' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER recharge_ledger_immutable BEFORE UPDATE OR DELETE ON point_changes FOR EACH ROW EXECUTE FUNCTION recharge_preserve_ledger();

CREATE OR REPLACE FUNCTION recharge_preserve_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Recharge notification receipts cannot be deleted' USING ERRCODE = '23514'; END IF;
  IF ROW(NEW.provider,NEW.merchant_id,NEW.notification_id,NEW.canonical_facts_sha256,NEW.created_at) IS DISTINCT FROM ROW(OLD.provider,OLD.merchant_id,OLD.notification_id,OLD.canonical_facts_sha256,OLD.created_at)
    OR (OLD.has_conflict AND NOT NEW.has_conflict)
    OR (OLD.processed_at IS NOT NULL AND ROW(NEW.processed_at,NEW.applied_recharge_order_id) IS DISTINCT FROM ROW(OLD.processed_at,OLD.applied_recharge_order_id)) THEN
    RAISE EXCEPTION 'Recharge receipt identity and completed facts cannot be rewritten' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

-- Deferred checks protect the final transaction, not intermediate insert order.
CREATE FUNCTION recharge_check_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE wallet point_accounts%ROWTYPE; total BIGINT; slots BIGINT;
BEGIN
  SELECT * INTO wallet FROM point_accounts WHERE account_id = NEW.account_id;
  SELECT COALESCE(sum(points),0),count(*) INTO total,slots FROM recharge_credit_reservations WHERE account_id = NEW.account_id AND state = 'HELD';
  IF wallet.reserved_funded_points IS DISTINCT FROM total OR wallet.reserved_ledger_slots IS DISTINCT FROM slots THEN
    RAISE EXCEPTION 'Recharge reservation totals disagree' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER recharge_wallet_capacity AFTER INSERT OR UPDATE ON point_accounts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION recharge_check_capacity();
CREATE CONSTRAINT TRIGGER recharge_reservation_capacity AFTER INSERT OR UPDATE ON recharge_credit_reservations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION recharge_check_capacity();

CREATE FUNCTION recharge_check_order_graph() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o recharge_orders%ROWTYPE; r recharge_credit_reservations%ROWTYPE; l point_changes%ROWTYPE; p recharge_payment_observations%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'recharge_orders' THEN
    SELECT * INTO o FROM recharge_orders WHERE id = NEW.id;
  ELSE
    SELECT * INTO o FROM recharge_orders WHERE id = NEW.recharge_order_id;
  END IF;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO r FROM recharge_credit_reservations WHERE recharge_order_id = o.id;
  IF NOT FOUND OR r.points <> o.funded_points OR r.account_id <> o.account_id
    OR (o.status IN ('PENDING_PAYMENT','CONFIRMING') AND r.state <> 'HELD')
    OR (o.status = 'CLOSED' AND r.state <> 'RELEASED')
    OR (o.status = 'SUCCESSFUL' AND r.state <> 'CONSUMED') THEN
    RAISE EXCEPTION 'Recharge order and reservation disagree' USING ERRCODE = '23514';
  END IF;
  IF o.status = 'SUCCESSFUL' THEN
    SELECT * INTO l FROM point_changes WHERE id = o.ledger_id;
    SELECT * INTO p FROM recharge_payment_observations WHERE id = o.paid_observation_id;
    IF l.kind IS DISTINCT FROM 'RECHARGE' OR l.recharge_order_id IS DISTINCT FROM o.id OR l.funded_delta IS DISTINCT FROM o.funded_points
      OR ROW(p.provider,p.merchant_id,p.app_id,p.merchant_order_no,p.transaction_id,p.order_total_fen,p.currency,p.success_at)
        IS DISTINCT FROM ROW(o.provider,o.merchant_id,o.app_id,o.merchant_order_no,o.provider_transaction_id,o.amount_fen,o.currency,o.paid_at) THEN
      RAISE EXCEPTION 'Recharge settlement graph disagrees' USING ERRCODE = '23514';
    END IF;
  ELSIF EXISTS (SELECT 1 FROM point_changes WHERE recharge_order_id = o.id) THEN
    RAISE EXCEPTION 'Unsettled recharge has a ledger' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER recharge_order_graph AFTER INSERT OR UPDATE ON recharge_orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION recharge_check_order_graph();
CREATE CONSTRAINT TRIGGER recharge_reservation_graph AFTER INSERT OR UPDATE ON recharge_credit_reservations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION recharge_check_order_graph();
CREATE CONSTRAINT TRIGGER recharge_ledger_graph AFTER INSERT ON point_changes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.kind = 'RECHARGE') EXECUTE FUNCTION recharge_check_order_graph();

CREATE FUNCTION recharge_check_applied_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM recharge_orders o JOIN recharge_payment_observations p
      ON p.provider=NEW.provider AND p.merchant_id=NEW.merchant_id AND p.notification_id=NEW.notification_id AND p.facts_sha256=NEW.canonical_facts_sha256
    WHERE o.id = NEW.applied_recharge_order_id AND o.status = 'SUCCESSFUL'
      AND ROW(p.provider,p.merchant_id,p.app_id,p.merchant_order_no,p.transaction_id,p.order_total_fen,p.currency,p.success_at)
        IS NOT DISTINCT FROM ROW(o.provider,o.merchant_id,o.app_id,o.merchant_order_no,o.provider_transaction_id,o.amount_fen,o.currency,o.paid_at)
  ) THEN
    RAISE EXCEPTION 'Applied receipt requires successful recharge' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER recharge_receipt_applied AFTER INSERT OR UPDATE ON recharge_notification_receipts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.processed_at IS NOT NULL) EXECUTE FUNCTION recharge_check_applied_receipt();
