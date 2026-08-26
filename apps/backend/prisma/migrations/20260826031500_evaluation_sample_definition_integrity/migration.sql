ALTER TABLE "evaluation_samples"
  ADD COLUMN "definition_id" UUID;

UPDATE "evaluation_samples" AS sample
SET "definition_id" = run."definition_id"
FROM "evaluation_runs" AS run
WHERE sample."run_id" = run."id";

ALTER TABLE "evaluation_samples"
  ALTER COLUMN "definition_id" SET NOT NULL;

ALTER TABLE "evaluation_samples"
  DROP CONSTRAINT "evaluation_samples_run_id_fkey";

ALTER TABLE "evaluation_samples"
  DROP CONSTRAINT "evaluation_samples_question_id_fkey";

ALTER TABLE "evaluation_samples"
  ADD CONSTRAINT "evaluation_samples_run_id_definition_id_fkey"
  FOREIGN KEY ("run_id", "definition_id")
  REFERENCES "evaluation_runs"("id", "definition_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_samples"
  ADD CONSTRAINT "evaluation_samples_question_id_definition_id_fkey"
  FOREIGN KEY ("question_id", "definition_id")
  REFERENCES "evaluation_questions"("id", "definition_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
