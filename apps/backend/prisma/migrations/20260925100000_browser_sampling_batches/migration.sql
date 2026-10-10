CREATE TYPE "EvaluationSamplingBatchStatus" AS ENUM (
  'PENDING',
  'SUBMITTED',
  'COMPLETED'
);

CREATE TABLE "evaluation_sampling_batches" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "cycle_id" UUID NOT NULL,
  "platform_key" VARCHAR(40) NOT NULL,
  "account_alias" VARCHAR(120) NOT NULL,
  "question_set_version" VARCHAR(160) NOT NULL,
  "idempotency_key" CHAR(64) NOT NULL,
  "external_task_id" VARCHAR(160),
  "status" "EvaluationSamplingBatchStatus" NOT NULL DEFAULT 'PENDING',
  "expected_count" INTEGER NOT NULL,
  "sample_ids" JSONB NOT NULL,
  "acquired_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "late_count" INTEGER NOT NULL DEFAULT 0,
  "submitted_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evaluation_sampling_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evaluation_sampling_batches_counts_check" CHECK (
    "expected_count" BETWEEN 1 AND 4
    AND "acquired_count" >= 0
    AND "failed_count" >= 0
    AND "late_count" >= 0
    AND "acquired_count" + "failed_count" <= "expected_count"
    AND "late_count" <= "acquired_count"
  )
);

CREATE UNIQUE INDEX "evaluation_sampling_batches_cycle_id_platform_key_key"
  ON "evaluation_sampling_batches"("cycle_id", "platform_key");
CREATE UNIQUE INDEX "evaluation_sampling_batches_idempotency_key_key"
  ON "evaluation_sampling_batches"("idempotency_key");
CREATE INDEX "evaluation_sampling_batches_status_updated_at_idx"
  ON "evaluation_sampling_batches"("status", "updated_at");
CREATE INDEX "evaluation_sampling_batches_run_id_platform_key_idx"
  ON "evaluation_sampling_batches"("run_id", "platform_key");

ALTER TABLE "evaluation_sampling_batches"
  ADD CONSTRAINT "evaluation_sampling_batches_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "evaluation_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_sampling_batches"
  ADD CONSTRAINT "evaluation_sampling_batches_cycle_run_fkey"
  FOREIGN KEY ("cycle_id", "run_id")
  REFERENCES "evaluation_execution_cycles"("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
