ALTER TYPE "EvaluationRunStage" ADD VALUE 'REPORT_ACCEPTED';
ALTER TYPE "EvaluationRunStage" ADD VALUE 'SYNTHESIS_EXHAUSTED';
ALTER TYPE "EvaluationExecutionCycleStatus" ADD VALUE 'COMPLETED';

CREATE UNIQUE INDEX "evaluation_execution_cycles_id_run_id_key"
  ON "evaluation_execution_cycles"("id", "run_id");

CREATE TABLE "ai_synthesis_attempts" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "cycle_id" UUID NOT NULL,
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
  CONSTRAINT "ai_synthesis_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_synthesis_attempt_number_positive_check"
    CHECK ("attempt_number" > 0)
);

CREATE TABLE "evaluation_syntheses" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "accepted_attempt_id" UUID NOT NULL,
  "semantic_contract_version" VARCHAR(60) NOT NULL,
  "semantic_payload" JSONB NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_syntheses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_reports" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "synthesis_id" UUID NOT NULL,
  "metric_policy_version" VARCHAR(60) NOT NULL,
  "document_contract_version" VARCHAR(60) NOT NULL,
  "public_document" JSONB NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_optimization_guidance" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "synthesis_id" UUID NOT NULL,
  "guidance_payload" JSONB NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_optimization_guidance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_synthesis_exhaustions" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "cycle_id" UUID NOT NULL,
  "last_attempt_id" UUID NOT NULL,
  "failure_class" VARCHAR(120) NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_synthesis_exhaustions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_synth_attempt_cycle_number_key"
  ON "ai_synthesis_attempts"("cycle_id", "attempt_number");
CREATE UNIQUE INDEX "ai_synth_attempt_id_run_key"
  ON "ai_synthesis_attempts"("id", "run_id");
CREATE INDEX "ai_synthesis_attempts_run_id_status_idx"
  ON "ai_synthesis_attempts"("run_id", "status");

CREATE UNIQUE INDEX "evaluation_syntheses_run_id_key"
  ON "evaluation_syntheses"("run_id");
CREATE UNIQUE INDEX "evaluation_syntheses_accepted_attempt_id_key"
  ON "evaluation_syntheses"("accepted_attempt_id");
CREATE UNIQUE INDEX "eval_synthesis_id_run_key"
  ON "evaluation_syntheses"("id", "run_id");
CREATE UNIQUE INDEX "eval_synthesis_attempt_run_key"
  ON "evaluation_syntheses"("accepted_attempt_id", "run_id");

CREATE UNIQUE INDEX "evaluation_reports_run_id_key"
  ON "evaluation_reports"("run_id");
CREATE UNIQUE INDEX "evaluation_reports_synthesis_id_key"
  ON "evaluation_reports"("synthesis_id");
CREATE UNIQUE INDEX "eval_report_synthesis_run_key"
  ON "evaluation_reports"("synthesis_id", "run_id");

CREATE UNIQUE INDEX "evaluation_optimization_guidance_run_id_key"
  ON "evaluation_optimization_guidance"("run_id");
CREATE UNIQUE INDEX "evaluation_optimization_guidance_synthesis_id_key"
  ON "evaluation_optimization_guidance"("synthesis_id");
CREATE UNIQUE INDEX "eval_guidance_synthesis_run_key"
  ON "evaluation_optimization_guidance"("synthesis_id", "run_id");

CREATE UNIQUE INDEX "evaluation_synthesis_exhaustions_cycle_id_key"
  ON "evaluation_synthesis_exhaustions"("cycle_id");
CREATE UNIQUE INDEX "evaluation_synthesis_exhaustions_last_attempt_id_key"
  ON "evaluation_synthesis_exhaustions"("last_attempt_id");
CREATE UNIQUE INDEX "eval_synth_exhaust_attempt_run_key"
  ON "evaluation_synthesis_exhaustions"("last_attempt_id", "run_id");
CREATE UNIQUE INDEX "eval_synth_exhaust_cycle_run_key"
  ON "evaluation_synthesis_exhaustions"("cycle_id", "run_id");
CREATE INDEX "evaluation_synthesis_exhaustions_run_id_idx"
  ON "evaluation_synthesis_exhaustions"("run_id");

ALTER TABLE "ai_synthesis_attempts"
  ADD CONSTRAINT "ai_synth_attempt_cycle_run_fkey"
  FOREIGN KEY ("cycle_id", "run_id")
  REFERENCES "evaluation_execution_cycles"("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_syntheses"
  ADD CONSTRAINT "evaluation_syntheses_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "evaluation_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_syntheses"
  ADD CONSTRAINT "eval_synthesis_attempt_run_fkey"
  FOREIGN KEY ("accepted_attempt_id", "run_id")
  REFERENCES "ai_synthesis_attempts"("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_reports"
  ADD CONSTRAINT "evaluation_reports_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "evaluation_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_reports"
  ADD CONSTRAINT "eval_report_synthesis_run_fkey"
  FOREIGN KEY ("synthesis_id", "run_id")
  REFERENCES "evaluation_syntheses"("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_optimization_guidance"
  ADD CONSTRAINT "evaluation_optimization_guidance_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "evaluation_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_optimization_guidance"
  ADD CONSTRAINT "eval_guidance_synthesis_run_fkey"
  FOREIGN KEY ("synthesis_id", "run_id")
  REFERENCES "evaluation_syntheses"("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_synthesis_exhaustions"
  ADD CONSTRAINT "eval_synth_exhaust_cycle_run_fkey"
  FOREIGN KEY ("cycle_id", "run_id")
  REFERENCES "evaluation_execution_cycles"("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_synthesis_exhaustions"
  ADD CONSTRAINT "eval_synth_exhaust_attempt_run_fkey"
  FOREIGN KEY ("last_attempt_id", "run_id")
  REFERENCES "ai_synthesis_attempts"("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
