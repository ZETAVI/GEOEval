-- Additive opt-in execution-center transport state; old attempts remain intact.
ALTER TABLE "ai_execution_attempts"
  ADD COLUMN "execution_transport" VARCHAR(24) NOT NULL DEFAULT 'DIRECT',
  ADD CONSTRAINT "ai_execution_attempts_execution_transport_check"
    CHECK ("execution_transport" IN ('DIRECT', 'EXECUTION_CENTER'));

CREATE TYPE "ExecutionCenterReceiptState" AS ENUM ('RESERVING', 'WAITING', 'READY');

CREATE TABLE "execution_center_receipts" (
  "id" UUID NOT NULL,
  "attempt_id" UUID NOT NULL,
  "center_ref" VARCHAR(128) NOT NULL,
  "caller_request_ref" VARCHAR(128) NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_fingerprint" VARCHAR(64) NOT NULL,
  "request" JSONB NOT NULL,
  "deadline_at" TIMESTAMP(3) NOT NULL,
  "task_id" VARCHAR(128),
  "item_id" VARCHAR(128),
  "state" "ExecutionCenterReceiptState" NOT NULL DEFAULT 'RESERVING',
  "snapshot" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "ready_at" TIMESTAMP(3),
  CONSTRAINT "execution_center_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "execution_center_receipts_attempt_id_fkey"
    FOREIGN KEY ("attempt_id") REFERENCES "ai_execution_attempts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "execution_center_receipts_ready_snapshot_check"
    CHECK (("state" = 'READY') = ("snapshot" IS NOT NULL AND "ready_at" IS NOT NULL)),
  CONSTRAINT "execution_center_receipts_task_item_check"
    CHECK (("task_id" IS NULL) = ("item_id" IS NULL))
);
CREATE UNIQUE INDEX "execution_center_receipts_attempt_id_key"
  ON "execution_center_receipts"("attempt_id");
CREATE UNIQUE INDEX "exec_center_receipt_center_request_key"
  ON "execution_center_receipts"("center_ref", "caller_request_ref");
CREATE UNIQUE INDEX "exec_center_receipt_center_idempotency_key"
  ON "execution_center_receipts"("center_ref", "idempotency_key");
CREATE UNIQUE INDEX "exec_center_receipt_center_task_key"
  ON "execution_center_receipts"("center_ref", "task_id");
CREATE INDEX "exec_center_receipt_reconciliation_idx"
  ON "execution_center_receipts"("state", "id");

CREATE TABLE "execution_center_inbox" (
  "center_ref" VARCHAR(128) NOT NULL,
  "cursor" BIGINT NOT NULL,
  "event" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "execution_center_inbox_pkey" PRIMARY KEY ("center_ref", "cursor"),
  CONSTRAINT "execution_center_inbox_cursor_check" CHECK ("cursor" > 0)
);
CREATE TABLE "execution_center_cursors" (
  "center_ref" VARCHAR(128) NOT NULL,
  "cursor" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "execution_center_cursors_pkey" PRIMARY KEY ("center_ref"),
  CONSTRAINT "execution_center_cursors_cursor_check" CHECK ("cursor" >= 0)
);
