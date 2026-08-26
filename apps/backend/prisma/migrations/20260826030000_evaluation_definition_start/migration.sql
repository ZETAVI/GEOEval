CREATE TYPE "EvaluationQuestionKind" AS ENUM (
  'BRAND_DIRECTED',
  'INDUSTRY_RECOMMENDATION',
  'CHARACTERISTIC_ONE',
  'CHARACTERISTIC_TWO'
);

CREATE TYPE "EvaluationRunStatus" AS ENUM (
  'EVALUATING',
  'COMPLETED',
  'PLEASE_RETRY'
);

CREATE TYPE "EvaluationSampleStatus" AS ENUM ('PENDING');

CREATE TABLE "evaluation_definitions" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "brand_id" UUID NOT NULL,
  "input_fingerprint" CHAR(64) NOT NULL,
  "brand_snapshot" JSONB NOT NULL,
  "question_generator_id" TEXT NOT NULL,
  "question_generator_version" TEXT NOT NULL,
  "question_generator_hash" CHAR(64) NOT NULL,
  "platform_policy" JSONB NOT NULL,
  "objectivity_profile_id" TEXT NOT NULL,
  "objectivity_profile_version" TEXT NOT NULL,
  "objectivity_profile_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_questions" (
  "id" UUID NOT NULL,
  "definition_id" UUID NOT NULL,
  "kind" "EvaluationQuestionKind" NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_runs" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "brand_id" UUID NOT NULL,
  "definition_id" UUID NOT NULL,
  "input_fingerprint" CHAR(64) NOT NULL,
  "status" "EvaluationRunStatus" NOT NULL DEFAULT 'EVALUATING',
  "correlation_id" UUID NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evaluation_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_samples" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "question_id" UUID NOT NULL,
  "platform_key" VARCHAR(40) NOT NULL,
  "platform_label" VARCHAR(80) NOT NULL,
  "status" "EvaluationSampleStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_samples_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_outbox_events" (
  "id" UUID NOT NULL,
  "business_key" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "correlation_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evaluation_definitions_brand_id_input_fingerprint_key"
  ON "evaluation_definitions"("brand_id", "input_fingerprint");
CREATE UNIQUE INDEX "evaluation_definitions_id_account_id_brand_id_key"
  ON "evaluation_definitions"("id", "account_id", "brand_id");
CREATE INDEX "evaluation_definitions_account_id_brand_id_created_at_idx"
  ON "evaluation_definitions"("account_id", "brand_id", "created_at");

CREATE UNIQUE INDEX "evaluation_questions_definition_id_kind_key"
  ON "evaluation_questions"("definition_id", "kind");
CREATE UNIQUE INDEX "evaluation_questions_definition_id_ordinal_key"
  ON "evaluation_questions"("definition_id", "ordinal");
CREATE UNIQUE INDEX "evaluation_questions_id_definition_id_key"
  ON "evaluation_questions"("id", "definition_id");

CREATE UNIQUE INDEX "evaluation_runs_definition_id_key"
  ON "evaluation_runs"("definition_id");
CREATE UNIQUE INDEX "evaluation_runs_id_definition_id_key"
  ON "evaluation_runs"("id", "definition_id");
CREATE UNIQUE INDEX "evaluation_runs_definition_id_account_id_brand_id_key"
  ON "evaluation_runs"("definition_id", "account_id", "brand_id");
CREATE UNIQUE INDEX "evaluation_runs_one_active_per_brand"
  ON "evaluation_runs"("brand_id") WHERE "status" = 'EVALUATING';
CREATE INDEX "evaluation_runs_account_id_brand_id_started_at_idx"
  ON "evaluation_runs"("account_id", "brand_id", "started_at");

CREATE UNIQUE INDEX "evaluation_samples_run_id_question_id_platform_key_key"
  ON "evaluation_samples"("run_id", "question_id", "platform_key");
CREATE INDEX "evaluation_samples_run_id_status_idx"
  ON "evaluation_samples"("run_id", "status");

CREATE UNIQUE INDEX "product_outbox_events_business_key_key"
  ON "product_outbox_events"("business_key");
CREATE INDEX "product_outbox_events_status_created_at_idx"
  ON "product_outbox_events"("status", "created_at");

ALTER TABLE "evaluation_definitions"
  ADD CONSTRAINT "evaluation_definitions_brand_id_account_id_fkey"
  FOREIGN KEY ("brand_id", "account_id")
  REFERENCES "brand_profiles"("id", "account_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_questions"
  ADD CONSTRAINT "evaluation_questions_definition_id_fkey"
  FOREIGN KEY ("definition_id") REFERENCES "evaluation_definitions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_runs"
  ADD CONSTRAINT "evaluation_runs_definition_id_account_id_brand_id_fkey"
  FOREIGN KEY ("definition_id", "account_id", "brand_id")
  REFERENCES "evaluation_definitions"("id", "account_id", "brand_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_samples"
  ADD CONSTRAINT "evaluation_samples_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "evaluation_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_samples"
  ADD CONSTRAINT "evaluation_samples_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "evaluation_questions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
