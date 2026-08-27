CREATE UNIQUE INDEX "evaluation_samples_id_cycle_id_key"
  ON "evaluation_samples"("id", "cycle_id");

CREATE UNIQUE INDEX "ai_execution_attempts_id_sample_id_key"
  ON "ai_execution_attempts"("id", "sample_id");
CREATE UNIQUE INDEX "evaluation_sample_evidence_accepted_attempt_id_sample_id_key"
  ON "evaluation_sample_evidence"("accepted_attempt_id", "sample_id");
CREATE UNIQUE INDEX "evaluation_sample_interpretations_accepted_attempt_id_sample_id_key"
  ON "evaluation_sample_interpretations"("accepted_attempt_id", "sample_id");
CREATE UNIQUE INDEX "evaluation_stage_exhaustions_last_attempt_id_sample_id_key"
  ON "evaluation_stage_exhaustions"("last_attempt_id", "sample_id");

ALTER TABLE "ai_execution_attempts"
  DROP CONSTRAINT "ai_execution_attempts_sample_id_fkey";
ALTER TABLE "evaluation_sample_evidence"
  DROP CONSTRAINT "evaluation_sample_evidence_accepted_attempt_id_fkey";
ALTER TABLE "evaluation_sample_interpretations"
  DROP CONSTRAINT "evaluation_sample_interpretations_accepted_attempt_id_fkey";
ALTER TABLE "evaluation_stage_exhaustions"
  DROP CONSTRAINT "evaluation_stage_exhaustions_sample_id_fkey";
ALTER TABLE "evaluation_stage_exhaustions"
  DROP CONSTRAINT "evaluation_stage_exhaustions_last_attempt_id_fkey";

ALTER TABLE "ai_execution_attempts"
  ADD CONSTRAINT "ai_execution_attempts_sample_id_cycle_id_fkey"
  FOREIGN KEY ("sample_id", "cycle_id")
  REFERENCES "evaluation_samples"("id", "cycle_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_sample_evidence"
  ADD CONSTRAINT "evaluation_sample_evidence_accepted_attempt_id_sample_id_fkey"
  FOREIGN KEY ("accepted_attempt_id", "sample_id")
  REFERENCES "ai_execution_attempts"("id", "sample_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_sample_interpretations"
  ADD CONSTRAINT "evaluation_sample_interpretations_accepted_attempt_id_sample_id_fkey"
  FOREIGN KEY ("accepted_attempt_id", "sample_id")
  REFERENCES "ai_execution_attempts"("id", "sample_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_stage_exhaustions"
  ADD CONSTRAINT "evaluation_stage_exhaustions_sample_id_cycle_id_fkey"
  FOREIGN KEY ("sample_id", "cycle_id")
  REFERENCES "evaluation_samples"("id", "cycle_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_stage_exhaustions"
  ADD CONSTRAINT "evaluation_stage_exhaustions_last_attempt_id_sample_id_fkey"
  FOREIGN KEY ("last_attempt_id", "sample_id")
  REFERENCES "ai_execution_attempts"("id", "sample_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
