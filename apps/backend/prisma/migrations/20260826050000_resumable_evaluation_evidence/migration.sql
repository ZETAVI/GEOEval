ALTER TYPE "EvaluationSampleStatus" ADD VALUE 'EVIDENCE_ACCEPTED';
ALTER TYPE "EvaluationSampleStatus" ADD VALUE 'INTERPRETATION_ACCEPTED';
ALTER TYPE "EvaluationSampleStatus" ADD VALUE 'ACQUISITION_EXHAUSTED';
ALTER TYPE "EvaluationSampleStatus" ADD VALUE 'INTERPRETATION_EXHAUSTED';

CREATE TYPE "EvaluationRunStage" AS ENUM (
  'QUEUED',
  'PROCESSING_EVIDENCE',
  'READY_FOR_SYNTHESIS'
);

CREATE TYPE "EvaluationExecutionCycleStatus" AS ENUM (
  'ACTIVE',
  'READY_FOR_SYNTHESIS',
  'EXHAUSTED'
);

CREATE TYPE "AiExecutionPurpose" AS ENUM (
  'EVALUATION_ACQUISITION',
  'EVALUATION_INTERPRETATION'
);

CREATE TYPE "AiExecutionAttemptStatus" AS ENUM (
  'STARTED',
  'SUCCEEDED',
  'FAILED'
);

ALTER TABLE "evaluation_runs"
  ADD COLUMN "stage" "EvaluationRunStage" NOT NULL DEFAULT 'QUEUED';

CREATE TABLE "evaluation_execution_cycles" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "status" "EvaluationExecutionCycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evaluation_execution_cycles_pkey" PRIMARY KEY ("id")
);

INSERT INTO "evaluation_execution_cycles" (
  "id",
  "run_id",
  "sequence",
  "status",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  "id",
  1,
  'ACTIVE',
  "started_at",
  CURRENT_TIMESTAMP
FROM "evaluation_runs";

ALTER TABLE "evaluation_samples"
  ADD COLUMN "cycle_id" UUID,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "evaluation_samples" AS sample
SET "cycle_id" = cycle."id"
FROM "evaluation_execution_cycles" AS cycle
WHERE sample."run_id" = cycle."run_id" AND cycle."sequence" = 1;

ALTER TABLE "evaluation_samples"
  ALTER COLUMN "cycle_id" SET NOT NULL,
  ALTER COLUMN "updated_at" DROP DEFAULT;

CREATE TABLE "ai_execution_attempts" (
  "id" UUID NOT NULL,
  "cycle_id" UUID NOT NULL,
  "sample_id" UUID NOT NULL,
  "purpose" "AiExecutionPurpose" NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "status" "AiExecutionAttemptStatus" NOT NULL DEFAULT 'STARTED',
  "route_policy_id" TEXT NOT NULL,
  "provider_key" VARCHAR(80) NOT NULL,
  "requested_model" VARCHAR(120) NOT NULL,
  "request_payload" JSONB NOT NULL,
  "response_envelope" JSONB,
  "failure_class" VARCHAR(120),
  "retryable" BOOLEAN,
  "latency_ms" INTEGER,
  "usage" JSONB,
  "correlation_id" UUID NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "ai_execution_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_sample_evidence" (
  "id" UUID NOT NULL,
  "sample_id" UUID NOT NULL,
  "accepted_attempt_id" UUID NOT NULL,
  "answer_content" TEXT NOT NULL,
  "answer_format" VARCHAR(40) NOT NULL,
  "source_metadata" JSONB NOT NULL,
  "search_used" BOOLEAN NOT NULL,
  "returned_model" VARCHAR(120) NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_sample_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_sample_interpretations" (
  "id" UUID NOT NULL,
  "sample_id" UUID NOT NULL,
  "accepted_attempt_id" UUID NOT NULL,
  "mentioned" BOOLEAN NOT NULL,
  "position" INTEGER,
  "relevant_description" TEXT,
  "characteristics" JSONB NOT NULL,
  "objective_summary" TEXT NOT NULL,
  "structured_evidence" JSONB NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_sample_interpretations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_stage_exhaustions" (
  "id" UUID NOT NULL,
  "cycle_id" UUID NOT NULL,
  "sample_id" UUID NOT NULL,
  "purpose" "AiExecutionPurpose" NOT NULL,
  "last_attempt_id" UUID NOT NULL,
  "failure_class" VARCHAR(120) NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_stage_exhaustions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "product_outbox_events"
  ADD COLUMN "dispatched_at" TIMESTAMP(3),
  ADD COLUMN "completed_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "evaluation_execution_cycles_run_id_sequence_key"
  ON "evaluation_execution_cycles"("run_id", "sequence");
CREATE INDEX "evaluation_execution_cycles_status_updated_at_idx"
  ON "evaluation_execution_cycles"("status", "updated_at");

CREATE UNIQUE INDEX "ai_execution_attempts_sample_id_purpose_attempt_number_key"
  ON "ai_execution_attempts"("sample_id", "purpose", "attempt_number");
CREATE INDEX "ai_execution_attempts_cycle_id_purpose_status_idx"
  ON "ai_execution_attempts"("cycle_id", "purpose", "status");

CREATE UNIQUE INDEX "evaluation_sample_evidence_sample_id_key"
  ON "evaluation_sample_evidence"("sample_id");
CREATE UNIQUE INDEX "evaluation_sample_evidence_accepted_attempt_id_key"
  ON "evaluation_sample_evidence"("accepted_attempt_id");

CREATE UNIQUE INDEX "evaluation_sample_interpretations_sample_id_key"
  ON "evaluation_sample_interpretations"("sample_id");
CREATE UNIQUE INDEX "evaluation_sample_interpretations_accepted_attempt_id_key"
  ON "evaluation_sample_interpretations"("accepted_attempt_id");

CREATE UNIQUE INDEX "evaluation_stage_exhaustions_last_attempt_id_key"
  ON "evaluation_stage_exhaustions"("last_attempt_id");
CREATE UNIQUE INDEX "evaluation_stage_exhaustions_sample_id_purpose_key"
  ON "evaluation_stage_exhaustions"("sample_id", "purpose");
CREATE INDEX "evaluation_stage_exhaustions_cycle_id_purpose_idx"
  ON "evaluation_stage_exhaustions"("cycle_id", "purpose");

ALTER TABLE "evaluation_execution_cycles"
  ADD CONSTRAINT "evaluation_execution_cycles_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "evaluation_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_samples"
  ADD CONSTRAINT "evaluation_samples_cycle_id_fkey"
  FOREIGN KEY ("cycle_id") REFERENCES "evaluation_execution_cycles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_execution_attempts"
  ADD CONSTRAINT "ai_execution_attempts_cycle_id_fkey"
  FOREIGN KEY ("cycle_id") REFERENCES "evaluation_execution_cycles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_execution_attempts"
  ADD CONSTRAINT "ai_execution_attempts_sample_id_fkey"
  FOREIGN KEY ("sample_id") REFERENCES "evaluation_samples"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_sample_evidence"
  ADD CONSTRAINT "evaluation_sample_evidence_sample_id_fkey"
  FOREIGN KEY ("sample_id") REFERENCES "evaluation_samples"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_sample_evidence"
  ADD CONSTRAINT "evaluation_sample_evidence_accepted_attempt_id_fkey"
  FOREIGN KEY ("accepted_attempt_id") REFERENCES "ai_execution_attempts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_sample_interpretations"
  ADD CONSTRAINT "evaluation_sample_interpretations_sample_id_fkey"
  FOREIGN KEY ("sample_id") REFERENCES "evaluation_samples"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_sample_interpretations"
  ADD CONSTRAINT "evaluation_sample_interpretations_accepted_attempt_id_fkey"
  FOREIGN KEY ("accepted_attempt_id") REFERENCES "ai_execution_attempts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_stage_exhaustions"
  ADD CONSTRAINT "evaluation_stage_exhaustions_cycle_id_fkey"
  FOREIGN KEY ("cycle_id") REFERENCES "evaluation_execution_cycles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_stage_exhaustions"
  ADD CONSTRAINT "evaluation_stage_exhaustions_sample_id_fkey"
  FOREIGN KEY ("sample_id") REFERENCES "evaluation_samples"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_stage_exhaustions"
  ADD CONSTRAINT "evaluation_stage_exhaustions_last_attempt_id_fkey"
  FOREIGN KEY ("last_attempt_id") REFERENCES "ai_execution_attempts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
