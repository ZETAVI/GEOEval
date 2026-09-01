import { readFile, writeFile } from "node:fs/promises";

const [industryPath, regionPath, outputPath] = process.argv.slice(2);
if (!industryPath || !regionPath || !outputPath) {
  throw new Error(
    "usage: generate-brand-reference-migration.mjs <industry.json> <regions.json> <migration.sql>",
  );
}

const industry = JSON.parse(await readFile(industryPath, "utf8"));
const regions = JSON.parse(await readFile(regionPath, "utf8"));
const industryRows = industry.primaryIndustries.flatMap((primary) =>
  primary.secondaryIndustries.map((secondary) => [
    primary.label,
    secondary.label,
    primary.id,
    secondary.id,
    secondary.isOther,
  ]),
);
const regionRows = regions.provinces.flatMap((province) =>
  province.cities.flatMap((city) => {
    const officialPath = [
      province.id,
      ...(city.officialDivisionId && city.officialDivisionId !== province.id
        ? [city.officialDivisionId]
        : []),
    ];
    return city.terminalRegions.map((terminal) => [
      province.label,
      city.label,
      terminal.label,
      province.id,
      city.id,
      terminal.id,
      [...officialPath, terminal.id],
    ]);
  }),
);

const sql = `-- Generated from the accepted Brand Knowledge executable sources.
-- Re-run scripts/brand-knowledge/generate-brand-reference-migration.mjs; do not edit mapping rows manually.

BEGIN;

ALTER TABLE "brand_profiles"
  ADD COLUMN "primary_industry_id" VARCHAR(100),
  ADD COLUMN "secondary_industry_id" VARCHAR(100),
  ADD COLUMN "other_product_or_service" VARCHAR(60),
  ADD COLUMN "province_region_id" VARCHAR(100),
  ADD COLUMN "city_region_id" VARCHAR(100),
  ADD COLUMN "terminal_region_id" VARCHAR(100);

CREATE TEMP TABLE "_brand_industry_map" (
  "primary_label" TEXT NOT NULL,
  "secondary_label" TEXT NOT NULL,
  "primary_id" VARCHAR(100) NOT NULL,
  "secondary_id" VARCHAR(100) NOT NULL,
  "is_other" BOOLEAN NOT NULL,
  PRIMARY KEY ("primary_label", "secondary_label")
) ON COMMIT DROP;

INSERT INTO "_brand_industry_map" VALUES
${industryRows.map((row) => `  (${sqlString(row[0])}, ${sqlString(row[1])}, ${sqlString(row[2])}, ${sqlString(row[3])}, ${row[4] ? "TRUE" : "FALSE"})`).join(",\n")};

CREATE TEMP TABLE "_brand_region_map" (
  "province_label" TEXT NOT NULL,
  "city_label" TEXT NOT NULL,
  "terminal_label" TEXT NOT NULL,
  "province_id" VARCHAR(100) NOT NULL,
  "city_id" VARCHAR(100) NOT NULL,
  "terminal_id" VARCHAR(100) NOT NULL,
  "official_path_ids" TEXT[] NOT NULL,
  PRIMARY KEY ("province_label", "city_label", "terminal_label")
) ON COMMIT DROP;

INSERT INTO "_brand_region_map" VALUES
${regionRows.map((row) => `  (${sqlString(row[0])}, ${sqlString(row[1])}, ${sqlString(row[2])}, ${sqlString(row[3])}, ${sqlString(row[4])}, ${sqlString(row[5])}, ARRAY[${row[6].map(sqlString).join(", ")}])`).join(",\n")};

DO $$
DECLARE
  "partial_brand_ids" TEXT;
  "invalid_brand_ids" TEXT;
  "invalid_definition_ids" TEXT;
BEGIN
  SELECT string_agg("id"::text, ', ' ORDER BY "id"::text)
  INTO "partial_brand_ids"
  FROM "brand_profiles"
    WHERE num_nonnulls("primary_industry", "secondary_industry") = 1
       OR num_nonnulls("province", "city", "district") BETWEEN 1 AND 2;
  IF "partial_brand_ids" IS NOT NULL THEN
    RAISE EXCEPTION 'Brand reference-data migration found partial legacy Brand IDs: %', "partial_brand_ids";
  END IF;

  SELECT string_agg(b."id"::text, ', ' ORDER BY b."id"::text)
  INTO "invalid_brand_ids"
    FROM "brand_profiles" b
    LEFT JOIN "_brand_industry_map" i
      ON i."primary_label" = b."primary_industry"
     AND i."secondary_label" = b."secondary_industry"
    LEFT JOIN "_brand_region_map" r
      ON r."province_label" = b."province"
     AND r."city_label" = b."city"
     AND r."terminal_label" = b."district"
    WHERE (b."primary_industry" IS NOT NULL AND (i."primary_id" IS NULL OR i."is_other"))
       OR (b."province" IS NOT NULL AND r."province_id" IS NULL);
  IF "invalid_brand_ids" IS NOT NULL THEN
    RAISE EXCEPTION 'Brand reference-data migration found unexpected or Other legacy Brand IDs: %', "invalid_brand_ids";
  END IF;

  SELECT string_agg(d."id"::text, ', ' ORDER BY d."id"::text)
  INTO "invalid_definition_ids"
    FROM "evaluation_definitions" d
    LEFT JOIN "_brand_industry_map" i
      ON i."primary_label" = d."brand_snapshot"->>'primaryIndustry'
     AND i."secondary_label" = d."brand_snapshot"->>'secondaryIndustry'
    LEFT JOIN "_brand_region_map" r
      ON r."province_label" = d."brand_snapshot"->>'province'
     AND r."city_label" = d."brand_snapshot"->>'city'
     AND r."terminal_label" = d."brand_snapshot"->>'district'
    WHERE i."primary_id" IS NULL OR i."is_other" OR r."province_id" IS NULL;
  IF "invalid_definition_ids" IS NOT NULL THEN
    RAISE EXCEPTION 'Brand reference-data migration cannot uniquely convert Evaluation Definition IDs: %', "invalid_definition_ids";
  END IF;
END $$;

WITH "matches" AS (
  SELECT b."id",
    i."primary_id", i."secondary_id",
    r."province_id", r."city_id", r."terminal_id", r."official_path_ids"
  FROM "brand_profiles" b
  LEFT JOIN "_brand_industry_map" i
    ON i."primary_label" = b."primary_industry"
   AND i."secondary_label" = b."secondary_industry"
  LEFT JOIN "_brand_region_map" r
    ON r."province_label" = b."province"
   AND r."city_label" = b."city"
   AND r."terminal_label" = b."district"
)
UPDATE "brand_profiles" b
SET "primary_industry_id" = m."primary_id",
    "secondary_industry_id" = m."secondary_id",
    "province_region_id" = m."province_id",
    "city_region_id" = m."city_id",
    "terminal_region_id" = m."terminal_id",
    "evaluation_fingerprint" = encode(sha256(convert_to(array_to_string(
      ARRAY[
        'brand-evaluation-input@2',
        regexp_replace(btrim(COALESCE(b."company_name", '')), '\\s+', ' ', 'g'),
        COALESCE(m."primary_id", ''),
        COALESCE(m."secondary_id", ''),
        '',
        regexp_replace(btrim(COALESCE(b."characteristic_one", '')), '\\s+', ' ', 'g'),
        regexp_replace(btrim(COALESCE(b."characteristic_two", '')), '\\s+', ' ', 'g')
      ] || COALESCE(m."official_path_ids", ARRAY[]::TEXT[]), chr(31)
    ), 'UTF8')), 'hex')
FROM "matches" m
WHERE m."id" = b."id";

CREATE TEMP TABLE "_definition_fingerprints" ON COMMIT DROP AS
SELECT d."id", d."brand_id",
  encode(sha256(convert_to(array_to_string(
    ARRAY[
      'brand-evaluation-input@2',
      regexp_replace(btrim(d."brand_snapshot"->>'companyName'), '\\s+', ' ', 'g'),
      i."primary_id",
      i."secondary_id",
      '',
      regexp_replace(btrim(d."brand_snapshot"->>'characteristicOne'), '\\s+', ' ', 'g'),
      regexp_replace(btrim(d."brand_snapshot"->>'characteristicTwo'), '\\s+', ' ', 'g')
    ] || r."official_path_ids", chr(31)
  ), 'UTF8')), 'hex') AS "new_fingerprint"
FROM "evaluation_definitions" d
JOIN "_brand_industry_map" i
  ON i."primary_label" = d."brand_snapshot"->>'primaryIndustry'
 AND i."secondary_label" = d."brand_snapshot"->>'secondaryIndustry'
JOIN "_brand_region_map" r
  ON r."province_label" = d."brand_snapshot"->>'province'
 AND r."city_label" = d."brand_snapshot"->>'city'
 AND r."terminal_label" = d."brand_snapshot"->>'district';

DO $$
DECLARE
  "collision_brand_ids" TEXT;
BEGIN
  SELECT string_agg("brand_id"::text, ', ' ORDER BY "brand_id"::text)
  INTO "collision_brand_ids"
  FROM (
    SELECT "brand_id", "new_fingerprint"
    FROM "_definition_fingerprints"
    GROUP BY "brand_id", "new_fingerprint"
    HAVING COUNT(*) > 1
  ) collisions;
  IF "collision_brand_ids" IS NOT NULL THEN
    RAISE EXCEPTION 'Brand reference-data migration would collapse Evaluation Definitions for Brand IDs: %', "collision_brand_ids";
  END IF;
END $$;

UPDATE "evaluation_definitions" d
SET "input_fingerprint" = encode(sha256(convert_to('brand-reference-migration-temp:' || d."id"::text, 'UTF8')), 'hex')
WHERE EXISTS (SELECT 1 FROM "_definition_fingerprints" f WHERE f."id" = d."id");

UPDATE "evaluation_definitions" d
SET "input_fingerprint" = f."new_fingerprint"
FROM "_definition_fingerprints" f
WHERE f."id" = d."id";

UPDATE "evaluation_runs" r
SET "input_fingerprint" = f."new_fingerprint"
FROM "_definition_fingerprints" f
WHERE f."id" = r."definition_id";

ALTER TABLE "brand_profiles"
  DROP COLUMN "primary_industry",
  DROP COLUMN "secondary_industry",
  DROP COLUMN "province",
  DROP COLUMN "city",
  DROP COLUMN "district",
  ADD CONSTRAINT "brand_profiles_industry_path_complete"
    CHECK (num_nonnulls("primary_industry_id", "secondary_industry_id") IN (0, 2)),
  ADD CONSTRAINT "brand_profiles_region_path_complete"
    CHECK (num_nonnulls("province_region_id", "city_region_id", "terminal_region_id") IN (0, 3)),
  ADD CONSTRAINT "brand_profiles_other_length"
    CHECK ("other_product_or_service" IS NULL OR char_length("other_product_or_service") BETWEEN 2 AND 60);

COMMIT;
`;

await writeFile(outputPath, sql);

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
