-- S5 moves logical samples from execution-cycle ownership to run ownership.
-- Existing local S4 evidence is transformed in place while API and Worker are stopped.

CREATE TYPE "NotificationKind" AS ENUM (
  'EVALUATION_COMPLETED',
  'EVALUATION_RETRY_REQUIRED'
);

ALTER TABLE "ai_execution_attempts"
  ADD COLUMN "run_id" UUID;

ALTER TABLE "evaluation_stage_exhaustions"
  ADD COLUMN "run_id" UUID;

UPDATE "ai_execution_attempts" AS attempt
SET "run_id" = sample."run_id"
FROM "evaluation_samples" AS sample
WHERE attempt."sample_id" = sample."id";

UPDATE "evaluation_stage_exhaustions" AS exhaustion
SET "run_id" = sample."run_id"
FROM "evaluation_samples" AS sample
WHERE exhaustion."sample_id" = sample."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ai_execution_attempts"
    WHERE "run_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'S5 migration could not resolve run_id for every AI execution attempt';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "evaluation_stage_exhaustions"
    WHERE "run_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'S5 migration could not resolve run_id for every stage exhaustion';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ai_execution_attempts" AS attempt
    JOIN "evaluation_samples" AS sample
      ON sample."id" = attempt."sample_id"
    JOIN "evaluation_execution_cycles" AS cycle
      ON cycle."id" = attempt."cycle_id"
    WHERE sample."run_id" <> cycle."run_id"
  ) THEN
    RAISE EXCEPTION 'S5 migration found an AI attempt whose sample and cycle belong to different runs';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "evaluation_stage_exhaustions" AS exhaustion
    JOIN "evaluation_samples" AS sample
      ON sample."id" = exhaustion."sample_id"
    JOIN "evaluation_execution_cycles" AS cycle
      ON cycle."id" = exhaustion."cycle_id"
    WHERE sample."run_id" <> cycle."run_id"
  ) THEN
    RAISE EXCEPTION 'S5 migration found a stage exhaustion whose sample and cycle belong to different runs';
  END IF;
END
$$;

ALTER TABLE "ai_execution_attempts"
  ALTER COLUMN "run_id" SET NOT NULL;

ALTER TABLE "evaluation_stage_exhaustions"
  ALTER COLUMN "run_id" SET NOT NULL;

ALTER TABLE "evaluation_samples"
  ADD CONSTRAINT "evaluation_samples_id_run_key" UNIQUE ("id", "run_id");

ALTER TABLE "ai_execution_attempts"
  ADD CONSTRAINT "ai_exec_attempt_exhaustion_identity_key"
  UNIQUE ("id", "cycle_id", "sample_id", "run_id");

ALTER TABLE "ai_execution_attempts"
  ADD CONSTRAINT "ai_exec_attempt_cycle_run_fkey"
  FOREIGN KEY ("cycle_id", "run_id")
  REFERENCES "evaluation_execution_cycles" ("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_execution_attempts"
  ADD CONSTRAINT "ai_exec_attempt_sample_run_fkey"
  FOREIGN KEY ("sample_id", "run_id")
  REFERENCES "evaluation_samples" ("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_stage_exhaustions"
  ADD CONSTRAINT "eval_stage_exhaust_cycle_run_fkey"
  FOREIGN KEY ("cycle_id", "run_id")
  REFERENCES "evaluation_execution_cycles" ("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_stage_exhaustions"
  ADD CONSTRAINT "eval_stage_exhaust_sample_run_fkey"
  FOREIGN KEY ("sample_id", "run_id")
  REFERENCES "evaluation_samples" ("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_stage_exhaustions"
  ADD CONSTRAINT "eval_stage_exhaust_attempt_identity_fkey"
  FOREIGN KEY ("last_attempt_id", "cycle_id", "sample_id", "run_id")
  REFERENCES "ai_execution_attempts" ("id", "cycle_id", "sample_id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_execution_attempts"
  DROP CONSTRAINT "ai_execution_attempts_cycle_id_fkey",
  DROP CONSTRAINT "ai_execution_attempts_sample_id_cycle_id_fkey";

ALTER TABLE "evaluation_stage_exhaustions"
  DROP CONSTRAINT "evaluation_stage_exhaustions_cycle_id_fkey",
  DROP CONSTRAINT "evaluation_stage_exhaustions_sample_id_cycle_id_fkey",
  DROP CONSTRAINT "evaluation_stage_exhaustions_last_attempt_id_sample_id_fkey";

DROP INDEX "ai_execution_attempts_sample_id_purpose_attempt_number_key";
DROP INDEX "evaluation_stage_exhaustions_sample_id_purpose_key";
DROP INDEX "evaluation_stage_exhaustions_last_attempt_id_key";
DROP INDEX "evaluation_stage_exhaustions_last_attempt_id_sample_id_key";

ALTER TABLE "ai_execution_attempts"
  ADD CONSTRAINT "ai_exec_attempt_cycle_sample_purpose_number_key"
  UNIQUE ("cycle_id", "sample_id", "purpose", "attempt_number"),
  ADD CONSTRAINT "ai_execution_attempts_attempt_number_positive_check"
  CHECK ("attempt_number" > 0);

ALTER TABLE "evaluation_stage_exhaustions"
  ADD CONSTRAINT "eval_stage_exhaust_cycle_sample_purpose_key"
  UNIQUE ("cycle_id", "sample_id", "purpose"),
  ADD CONSTRAINT "eval_stage_exhaust_attempt_identity_key"
  UNIQUE ("last_attempt_id", "cycle_id", "sample_id", "run_id");

ALTER TABLE "evaluation_samples"
  DROP CONSTRAINT "evaluation_samples_cycle_id_fkey";

DROP INDEX "evaluation_samples_id_cycle_id_key";

ALTER TABLE "evaluation_samples"
  DROP COLUMN "cycle_id";

ALTER TABLE "evaluation_execution_cycles"
  ADD CONSTRAINT "evaluation_execution_cycles_sequence_positive_check"
  CHECK ("sequence" > 0);

CREATE UNIQUE INDEX "evaluation_execution_cycles_one_non_terminal_per_run_key"
ON "evaluation_execution_cycles" ("run_id")
WHERE "status" IN ('ACTIVE', 'READY_FOR_SYNTHESIS');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "recipient_account_id" UUID NOT NULL,
  "source_event_id" UUID NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "summary" VARCHAR(320) NOT NULL,
  "target" JSONB NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_source_event_id_key" UNIQUE ("source_event_id"),
  CONSTRAINT "notifications_recipient_account_id_fkey"
    FOREIGN KEY ("recipient_account_id")
    REFERENCES "accounts" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notifications_recipient_account_id_created_at_id_idx"
ON "notifications" ("recipient_account_id", "created_at", "id");

CREATE INDEX "notifications_recipient_account_id_read_at_idx"
ON "notifications" ("recipient_account_id", "read_at");
