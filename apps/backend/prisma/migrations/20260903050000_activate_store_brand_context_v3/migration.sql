DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "brand_profiles" LIMIT 1)
     OR EXISTS (SELECT 1 FROM "evaluation_definitions" LIMIT 1)
     OR EXISTS (SELECT 1 FROM "evaluation_runs" LIMIT 1)
     OR EXISTS (SELECT 1 FROM "evaluation_reports" LIMIT 1) THEN
    RAISE EXCEPTION
      'Store Brand v3 activation requires an explicitly authorized empty database';
  END IF;
END $$;

CREATE TYPE "BrandStoreLocationProvider" AS ENUM ('AMAP');
CREATE TYPE "BrandQueryLocalityKind" AS ENUM ('BUSINESS_AREA', 'ADDRESS_LOCALITY');

ALTER TABLE "brand_profiles"
  ADD COLUMN "flagship_product_or_service" VARCHAR(80),
  ADD COLUMN "characteristics" JSONB NOT NULL DEFAULT '[]'::jsonb,
  DROP COLUMN "characteristic_one",
  DROP COLUMN "characteristic_two",
  DROP COLUMN "province_region_id",
  DROP COLUMN "city_region_id",
  DROP COLUMN "terminal_region_id";

ALTER TABLE "brand_profiles"
  ADD CONSTRAINT "brand_profiles_characteristics_array_check"
  CHECK (
    jsonb_typeof("characteristics") = 'array'
    AND jsonb_array_length("characteristics") <= 6
  );

CREATE TABLE "brand_store_locations" (
  "id" UUID NOT NULL,
  "brand_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "semantic_fact_id" UUID NOT NULL,
  "verification_id" UUID NOT NULL,
  "receipt_issued_at" TIMESTAMP(3) NOT NULL,
  "search_input" VARCHAR(200) NOT NULL,
  "provider" "BrandStoreLocationProvider" NOT NULL,
  "provider_place_id" VARCHAR(120) NOT NULL,
  "provider_contract_version" VARCHAR(100) NOT NULL,
  "verified_at" TIMESTAMP(3) NOT NULL,
  "place_name" VARCHAR(240) NOT NULL,
  "formatted_address" VARCHAR(500) NOT NULL,
  "province_name" VARCHAR(100) NOT NULL,
  "city_name" VARCHAR(100),
  "district_name" VARCHAR(100),
  "township_name" VARCHAR(100),
  "provider_adcode" VARCHAR(12) NOT NULL,
  "provider_towncode" VARCHAR(16),
  "official_province_region_id" VARCHAR(100) NOT NULL,
  "official_city_region_id" VARCHAR(100) NOT NULL,
  "official_terminal_region_id" VARCHAR(100) NOT NULL,
  "official_region_path" JSONB NOT NULL,
  "official_region_source_release_id" VARCHAR(100) NOT NULL,
  "longitude" DECIMAL(9, 6) NOT NULL,
  "latitude" DECIMAL(9, 6) NOT NULL,
  "coordinate_system" VARCHAR(20) NOT NULL,
  "query_locality_kind" "BrandQueryLocalityKind" NOT NULL,
  "query_locality_label" VARCHAR(240) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "brand_store_locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "brand_store_locations_coordinate_system_check"
    CHECK ("coordinate_system" = 'GCJ_02'),
  CONSTRAINT "brand_store_locations_coordinate_range_check"
    CHECK (
      "longitude" BETWEEN -180 AND 180
      AND "latitude" BETWEEN -90 AND 90
    ),
  CONSTRAINT "brand_store_locations_official_region_path_check"
    CHECK (
      jsonb_typeof("official_region_path") = 'array'
      AND jsonb_array_length("official_region_path") BETWEEN 2 AND 3
    )
);

CREATE UNIQUE INDEX "brand_store_locations_brand_id_key"
  ON "brand_store_locations"("brand_id");
CREATE UNIQUE INDEX "brand_store_locations_brand_id_account_id_key"
  ON "brand_store_locations"("brand_id", "account_id");
CREATE UNIQUE INDEX "brand_store_locations_verification_id_key"
  ON "brand_store_locations"("verification_id");
CREATE INDEX "brand_store_locations_account_id_idx"
  ON "brand_store_locations"("account_id");

ALTER TABLE "brand_store_locations"
  ADD CONSTRAINT "brand_store_locations_brand_id_account_id_fkey"
  FOREIGN KEY ("brand_id", "account_id")
  REFERENCES "brand_profiles"("id", "account_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
