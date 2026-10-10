CREATE TYPE "AiExecutionChannel" AS ENUM ('API', 'WEB');
ALTER TABLE "ai_execution_attempts"
  ADD COLUMN "execution_channel" "AiExecutionChannel" NOT NULL DEFAULT 'API',
  ADD COLUMN "execution_deadline_at" TIMESTAMP(3);
UPDATE "ai_execution_attempts" SET "execution_channel"='WEB'
  WHERE "request_payload"->>'taskKind'='BROWSER_EVALUATION_ACQUISITION';
ALTER TABLE "ai_execution_attempts"
  DROP CONSTRAINT "ai_exec_attempt_cycle_sample_purpose_number_key",
  ADD CONSTRAINT "ai_exec_attempt_cycle_sample_purpose_channel_number_key"
    UNIQUE ("cycle_id","sample_id","purpose","execution_channel","attempt_number");

ALTER TABLE "evaluation_execution_cycles"
  ADD COLUMN "sampling_started_at" TIMESTAMP(3),
  ADD COLUMN "sampling_fallback_due_at" TIMESTAMP(3),
  ADD COLUMN "sampling_deadline_at" TIMESTAMP(3),
  ADD COLUMN "sampling_closed_at" TIMESTAMP(3),
  ADD CONSTRAINT "evaluation_sampling_window_check" CHECK (
    ("sampling_started_at" IS NULL AND "sampling_fallback_due_at" IS NULL
      AND "sampling_deadline_at" IS NULL AND "sampling_closed_at" IS NULL)
    OR ("sampling_started_at" IS NOT NULL AND "sampling_fallback_due_at" IS NOT NULL
      AND "sampling_deadline_at" IS NOT NULL
      AND "sampling_fallback_due_at">"sampling_started_at"
      AND "sampling_deadline_at">"sampling_fallback_due_at"
      AND ("sampling_closed_at" IS NULL OR "sampling_closed_at">="sampling_started_at"))
  );

ALTER TABLE "evaluation_sampling_batches"
  ADD COLUMN "center_ref" VARCHAR(128),
  ADD COLUMN "caller_request_ref" VARCHAR(128),
  ADD COLUMN "request_fingerprint" CHAR(64),
  ADD COLUMN "request" JSONB,
  ADD CONSTRAINT "evaluation_sampling_batch_identity_key" UNIQUE ("id","cycle_id","run_id"),
  ADD CONSTRAINT "evaluation_sampling_batch_center_request_key" UNIQUE ("center_ref","caller_request_ref"),
  ADD CONSTRAINT "evaluation_sampling_batch_center_task_key" UNIQUE ("center_ref","external_task_id"),
  ADD CONSTRAINT "evaluation_sampling_batch_transport_check" CHECK (
    ("center_ref" IS NULL AND "caller_request_ref" IS NULL AND "request_fingerprint" IS NULL AND "request" IS NULL)
    OR ("center_ref" IS NOT NULL AND "caller_request_ref" IS NOT NULL AND "request_fingerprint" IS NOT NULL AND "request" IS NOT NULL)
  );

CREATE TABLE "evaluation_sampling_batch_items" (
  "id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "cycle_id" UUID NOT NULL,
  "sample_id" UUID NOT NULL,
  "attempt_id" UUID NOT NULL,
  "item_id" VARCHAR(128) NOT NULL,
  "state" "ExecutionCenterReceiptState" NOT NULL DEFAULT 'RESERVING',
  "snapshot" JSONB,
  "ready_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evaluation_sampling_batch_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evaluation_sampling_item_batch_fkey" FOREIGN KEY ("batch_id","cycle_id","run_id")
    REFERENCES "evaluation_sampling_batches"("id","cycle_id","run_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "evaluation_sampling_item_sample_fkey" FOREIGN KEY ("sample_id","run_id")
    REFERENCES "evaluation_samples"("id","run_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "evaluation_sampling_item_attempt_fkey" FOREIGN KEY ("attempt_id","cycle_id","sample_id","run_id")
    REFERENCES "ai_execution_attempts"("id","cycle_id","sample_id","run_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "evaluation_sampling_batch_items_attempt_id_key" ON "evaluation_sampling_batch_items"("attempt_id");
CREATE UNIQUE INDEX "evaluation_sampling_item_batch_sample_key" ON "evaluation_sampling_batch_items"("batch_id","sample_id");
CREATE UNIQUE INDEX "evaluation_sampling_item_batch_item_key" ON "evaluation_sampling_batch_items"("batch_id","item_id");
CREATE UNIQUE INDEX "evaluation_sampling_item_attempt_identity_key" ON "evaluation_sampling_batch_items"("attempt_id","cycle_id","sample_id","run_id");
CREATE INDEX "evaluation_sampling_batch_items_state_id_idx" ON "evaluation_sampling_batch_items"("state","id");

ALTER TABLE "evaluation_sample_evidence"
  ADD COLUMN "content" JSONB, ADD COLUMN "reading_text" TEXT, ADD COLUMN "images" JSONB;
ALTER TABLE "execution_center_inbox" ADD COLUMN "snapshot" JSONB;
