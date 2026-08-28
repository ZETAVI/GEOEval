ALTER TABLE "evaluation_sample_interpretations"
  ADD COLUMN "semantic_contract_version" VARCHAR(40),
  ADD COLUMN "semantic_payload" JSONB;

UPDATE "evaluation_sample_interpretations"
SET
  "semantic_contract_version" = 's3-compatibility@1',
  "semantic_payload" = jsonb_build_object(
    'profile', 'S3_COMPATIBILITY',
    'migratedDescription', "relevant_description",
    'migratedCharacteristics', "characteristics",
    'migratedSummary', "objective_summary",
    'migratedStructuredEvidence', "structured_evidence",
    'highlightUnavailable', true
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "evaluation_sample_interpretations"
    WHERE "semantic_contract_version" IS NULL
       OR "semantic_payload" IS NULL
  ) THEN
    RAISE EXCEPTION 'S4a interpretation compatibility backfill was incomplete';
  END IF;
END $$;

ALTER TABLE "evaluation_sample_interpretations"
  ALTER COLUMN "semantic_contract_version" SET NOT NULL,
  ALTER COLUMN "semantic_payload" SET NOT NULL,
  ALTER COLUMN "characteristics" DROP NOT NULL,
  ALTER COLUMN "objective_summary" DROP NOT NULL,
  ALTER COLUMN "structured_evidence" DROP NOT NULL;

ALTER TABLE "evaluation_sample_interpretations"
  ADD CONSTRAINT "evaluation_sample_interpretations_position_positive_check"
  CHECK ("position" IS NULL OR "position" > 0),
  ADD CONSTRAINT "evaluation_sample_interpretations_nonmention_position_null_check"
  CHECK ("mentioned" OR "position" IS NULL);
