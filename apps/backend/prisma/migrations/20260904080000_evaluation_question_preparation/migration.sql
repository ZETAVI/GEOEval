BEGIN;

CREATE TYPE "EvaluationQuestionPreparationStatus" AS ENUM (
  'PREPARING',
  'READY',
  'PLEASE_RETRY'
);

CREATE TABLE "evaluation_question_preparations" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "brand_id" UUID NOT NULL,
  "input_fingerprint" CHAR(64) NOT NULL,
  "brand_snapshot" JSONB NOT NULL,
  "status" "EvaluationQuestionPreparationStatus" NOT NULL DEFAULT 'PREPARING',
  "current_sequence" INTEGER NOT NULL DEFAULT 1,
  "instruction_id" TEXT NOT NULL,
  "instruction_version" TEXT NOT NULL,
  "instruction_hash" CHAR(64) NOT NULL,
  "instruction_content" TEXT NOT NULL,
  "output_contract_version" TEXT NOT NULL,
  "output_contract_schema" JSONB NOT NULL,
  "correlation_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "evaluation_question_preparations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evaluation_question_preparations_current_sequence_check"
    CHECK ("current_sequence" > 0)
);

CREATE TABLE "ai_question_generation_attempts" (
  "id" UUID NOT NULL,
  "preparation_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
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

  CONSTRAINT "ai_question_generation_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_question_generation_attempts_sequence_check"
    CHECK ("sequence" > 0),
  CONSTRAINT "ai_question_generation_attempts_attempt_number_check"
    CHECK ("attempt_number" BETWEEN 1 AND 3)
);

ALTER TABLE "evaluation_definitions"
  ADD COLUMN "question_preparation_id" UUID,
  ADD COLUMN "accepted_question_generation_attempt_id" UUID,
  ADD CONSTRAINT "evaluation_definitions_question_preparation_pair_check"
    CHECK (
      ("question_preparation_id" IS NULL AND "accepted_question_generation_attempt_id" IS NULL)
      OR
      ("question_preparation_id" IS NOT NULL AND "accepted_question_generation_attempt_id" IS NOT NULL)
    );

CREATE UNIQUE INDEX "evaluation_question_preparations_brand_id_input_fingerprint_key"
  ON "evaluation_question_preparations"("brand_id", "input_fingerprint");
CREATE UNIQUE INDEX "evaluation_question_preparations_id_account_id_brand_id_key"
  ON "evaluation_question_preparations"("id", "account_id", "brand_id");
CREATE INDEX "evaluation_question_preparations_status_updated_at_idx"
  ON "evaluation_question_preparations"("status", "updated_at");
CREATE INDEX "evaluation_question_preparations_account_id_brand_id_created_at_idx"
  ON "evaluation_question_preparations"("account_id", "brand_id", "created_at");

CREATE UNIQUE INDEX "ai_question_attempt_prep_sequence_number_key"
  ON "ai_question_generation_attempts"("preparation_id", "sequence", "attempt_number");
CREATE UNIQUE INDEX "ai_question_attempt_id_prep_key"
  ON "ai_question_generation_attempts"("id", "preparation_id");
CREATE INDEX "ai_question_generation_attempts_preparation_id_sequence_status_idx"
  ON "ai_question_generation_attempts"("preparation_id", "sequence", "status");

CREATE UNIQUE INDEX "evaluation_definitions_question_preparation_id_key"
  ON "evaluation_definitions"("question_preparation_id");
CREATE UNIQUE INDEX "evaluation_definitions_accepted_question_generation_attempt_id_key"
  ON "evaluation_definitions"("accepted_question_generation_attempt_id");
CREATE UNIQUE INDEX "eval_definition_preparation_owner_key"
  ON "evaluation_definitions"("question_preparation_id", "account_id", "brand_id");
CREATE UNIQUE INDEX "eval_definition_question_attempt_key"
  ON "evaluation_definitions"("accepted_question_generation_attempt_id", "question_preparation_id");

ALTER TABLE "evaluation_question_preparations"
  ADD CONSTRAINT "evaluation_question_preparations_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "evaluation_question_preparations_brand_id_account_id_fkey"
    FOREIGN KEY ("brand_id", "account_id") REFERENCES "brand_profiles"("id", "account_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_question_generation_attempts"
  ADD CONSTRAINT "ai_question_generation_attempts_preparation_id_fkey"
    FOREIGN KEY ("preparation_id") REFERENCES "evaluation_question_preparations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_definitions"
  ADD CONSTRAINT "eval_definition_preparation_owner_fkey"
    FOREIGN KEY ("question_preparation_id", "account_id", "brand_id")
    REFERENCES "evaluation_question_preparations"("id", "account_id", "brand_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "eval_definition_question_attempt_fkey"
    FOREIGN KEY ("accepted_question_generation_attempt_id", "question_preparation_id")
    REFERENCES "ai_question_generation_attempts"("id", "preparation_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
