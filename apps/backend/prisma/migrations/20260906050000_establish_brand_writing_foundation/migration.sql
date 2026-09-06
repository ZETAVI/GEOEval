BEGIN;

DO $$
DECLARE
  invalid_brand_ids TEXT;
BEGIN
  SELECT string_agg(b."id"::text, ', ' ORDER BY b."id"::text)
  INTO invalid_brand_ids
  FROM "brand_profiles" b
  WHERE jsonb_typeof(b."characteristics") <> 'array'
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements(b."characteristics") item
       WHERE jsonb_typeof(item) <> 'string'
          OR char_length(regexp_replace(btrim(item #>> '{}'), '\s+', ' ', 'g')) NOT BETWEEN 2 AND 120
     )
     OR jsonb_array_length(b."characteristics") > 6;

  IF invalid_brand_ids IS NOT NULL THEN
    RAISE EXCEPTION 'Brand writing-foundation migration found invalid legacy characteristics for Brand IDs: %', invalid_brand_ids;
  END IF;
END $$;

ALTER TABLE "brand_profiles"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "article_information" JSONB NOT NULL DEFAULT '{"price":null,"suitableAudienceContexts":[],"supplementalBackground":null,"desiredPositioning":[]}'::JSONB,
  ADD COLUMN "writing_context_fingerprint" CHAR(64);

UPDATE "brand_profiles" b
SET "characteristics" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', gen_random_uuid()::TEXT,
        'title', regexp_replace(btrim(item.value), '\s+', ' ', 'g'),
        'detail', NULL
      )
      ORDER BY item.ordinality
    )
    FROM jsonb_array_elements_text(b."characteristics") WITH ORDINALITY AS item(value, ordinality)
  ),
  '[]'::JSONB
);

UPDATE "brand_profiles"
SET "writing_context_fingerprint" = encode(
  sha256(
    convert_to(
      '{"scheme":"brand-writing-context@1","evaluationFingerprint":"' ||
      "evaluation_fingerprint" ||
      '","characteristicDetails":[],"articleInformation":{"price":null,"suitableAudienceContexts":[],"supplementalBackground":null,"desiredPositioning":[]}}',
      'UTF8'
    )
  ),
  'hex'
);

ALTER TABLE "brand_profiles"
  ALTER COLUMN "writing_context_fingerprint" SET NOT NULL,
  ADD CONSTRAINT "brand_profiles_revision_positive" CHECK ("revision" > 0),
  ADD CONSTRAINT "brand_profiles_characteristics_array" CHECK (jsonb_typeof("characteristics") = 'array'),
  ADD CONSTRAINT "brand_profiles_article_information_object" CHECK (jsonb_typeof("article_information") = 'object'),
  ADD CONSTRAINT "brand_profiles_writing_context_fingerprint_format"
    CHECK ("writing_context_fingerprint" ~ '^[0-9a-f]{64}$');

COMMIT;
