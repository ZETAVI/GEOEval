-- Additive, unactivated receipt storage. Never drop accepted payment facts on rollback.
CREATE TABLE "recharge_payment_observations" (
  "id" UUID NOT NULL,
  "provider" VARCHAR(16) NOT NULL,
  "merchant_id" VARCHAR(128) NOT NULL,
  "notification_id" VARCHAR(36) NOT NULL,
  "facts_sha256" VARCHAR(64) NOT NULL,
  "facts_version" INTEGER NOT NULL,
  "app_id" VARCHAR(128) NOT NULL,
  "merchant_order_no" VARCHAR(128) NOT NULL,
  "transaction_id" VARCHAR(128) NOT NULL,
  "trade_type" VARCHAR(16) NOT NULL,
  "order_total_fen" BIGINT NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "payer_total_fen" BIGINT NOT NULL,
  "payer_currency" VARCHAR(3) NOT NULL,
  "success_at" TIMESTAMPTZ(3) NOT NULL,
  "notification_created_at" TIMESTAMPTZ(3) NOT NULL,
  "verification_key_id" VARCHAR(128) NOT NULL,
  "signed_at_seconds" BIGINT NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL,
  "body_sha256" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recharge_payment_observations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recharge_observation_protocol_check" CHECK (
    "provider" = 'WECHAT' AND "facts_version" = 1 AND "trade_type" = 'NATIVE'
    AND "currency" = 'CNY' AND "payer_currency" = 'CNY'
    AND length("merchant_id") > 0 AND length("notification_id") > 0
    AND length("app_id") > 0 AND length("merchant_order_no") > 0
    AND length("transaction_id") > 0 AND length("verification_key_id") > 0
    AND "facts_sha256" ~ '^[a-f0-9]{64}$' AND "body_sha256" ~ '^[a-f0-9]{64}$'
    AND "order_total_fen" BETWEEN 1 AND 9007199254740991
    AND "payer_total_fen" BETWEEN 0 AND "order_total_fen"
    AND "signed_at_seconds" BETWEEN 0 AND 9007199254740991
    AND isfinite("success_at") AND isfinite("notification_created_at") AND isfinite("received_at")
  )
);
CREATE UNIQUE INDEX "recharge_observation_facts_key" ON "recharge_payment_observations"("provider", "merchant_id", "notification_id", "facts_sha256");

CREATE TABLE "recharge_notification_receipts" (
  "provider" VARCHAR(16) NOT NULL,
  "merchant_id" VARCHAR(128) NOT NULL,
  "notification_id" VARCHAR(36) NOT NULL,
  "canonical_facts_sha256" VARCHAR(64) NOT NULL,
  "has_conflict" BOOLEAN NOT NULL DEFAULT false,
  "processed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recharge_notification_receipt_pkey" PRIMARY KEY ("provider", "merchant_id", "notification_id"),
  CONSTRAINT "recharge_receipt_canonical_fkey" FOREIGN KEY ("provider", "merchant_id", "notification_id", "canonical_facts_sha256") REFERENCES "recharge_payment_observations"("provider", "merchant_id", "notification_id", "facts_sha256") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "recharge_receipt_pending_idx" ON "recharge_notification_receipts"("has_conflict", "processed_at", "created_at");

CREATE FUNCTION recharge_preserve_observation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Recharge payment observations are append-only' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "recharge_observation_immutable" BEFORE UPDATE OR DELETE ON "recharge_payment_observations" FOR EACH ROW EXECUTE FUNCTION recharge_preserve_observation();

CREATE FUNCTION recharge_preserve_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Recharge notification receipts cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF ROW(NEW."provider", NEW."merchant_id", NEW."notification_id", NEW."canonical_facts_sha256", NEW."created_at") IS DISTINCT FROM ROW(OLD."provider", OLD."merchant_id", OLD."notification_id", OLD."canonical_facts_sha256", OLD."created_at")
    OR (OLD."has_conflict" AND NOT NEW."has_conflict")
    OR (OLD."processed_at" IS NOT NULL AND NEW."processed_at" IS DISTINCT FROM OLD."processed_at") THEN
    RAISE EXCEPTION 'Recharge receipt identity and completed facts cannot be rewritten' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "recharge_receipt_preserved" BEFORE UPDATE OR DELETE ON "recharge_notification_receipts" FOR EACH ROW EXECUTE FUNCTION recharge_preserve_receipt();
