CREATE TYPE "EvaluationAggregateAnalysisPurpose" AS ENUM (
  'OVERALL_SYNTHESIS',
  'BRAND_NAME_RESOLUTION',
  'REPORT_COMPOSITION'
);

ALTER TABLE "ai_synthesis_attempts"
ADD COLUMN "purpose" "EvaluationAggregateAnalysisPurpose" NOT NULL DEFAULT 'OVERALL_SYNTHESIS';

DROP INDEX "ai_synth_attempt_cycle_number_key";
CREATE UNIQUE INDEX "ai_synth_attempt_cycle_purpose_number_key"
ON "ai_synthesis_attempts"("cycle_id", "purpose", "attempt_number");

ALTER TABLE "evaluation_synthesis_exhaustions"
ADD COLUMN "purpose" "EvaluationAggregateAnalysisPurpose" NOT NULL DEFAULT 'OVERALL_SYNTHESIS';

CREATE TABLE "evaluation_brand_resolutions" (
  "id" UUID NOT NULL PRIMARY KEY,
  "run_id" UUID NOT NULL UNIQUE,
  "accepted_attempt_id" UUID NOT NULL UNIQUE,
  "semantic_contract_version" VARCHAR(60) NOT NULL,
  "semantic_payload" JSONB NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_brand_resolutions_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "evaluation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eval_brand_resolution_attempt_run_fkey"
    FOREIGN KEY ("accepted_attempt_id", "run_id")
    REFERENCES "ai_synthesis_attempts"("id", "run_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "eval_brand_resolution_attempt_run_key"
ON "evaluation_brand_resolutions"("accepted_attempt_id", "run_id");
