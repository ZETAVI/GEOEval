-- CreateEnum
CREATE TYPE "MediaPlatformStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaCategory" AS ENUM ('CENTRAL_MEDIA', 'PORTAL_MEDIA', 'LOCAL_MEDIA', 'VERTICAL_MEDIA', 'CONTENT_PLATFORM', 'OVERSEAS_MEDIA');

-- CreateEnum
CREATE TYPE "MediaRegionScope" AS ENUM ('DOMESTIC', 'OVERSEAS');

-- CreateEnum
CREATE TYPE "MediaListingStatus" AS ENUM ('DRAFT', 'ON_SHELF', 'PAUSED', 'OFF_SHELF');

-- CreateEnum
CREATE TYPE "MediaResourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaSupplySourceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MediaPublicationMode" AS ENUM ('FIRST_PUBLISH', 'REPOST');

-- CreateEnum
CREATE TYPE "MediaPublicVisibility" AS ENUM ('HIDDEN', 'FULL', 'MASKED');

-- CreateEnum
CREATE TYPE "MediaQualityTier" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "media_platforms" (
    "id" UUID NOT NULL,
    "normalized_name" VARCHAR(160) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "logo_url" VARCHAR(2048),
    "region_scope" "MediaRegionScope" NOT NULL DEFAULT 'DOMESTIC',
    "status" "MediaPlatformStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_platform_categories" (
    "platform_id" UUID NOT NULL,
    "category" "MediaCategory" NOT NULL,

    CONSTRAINT "media_platform_categories_pkey" PRIMARY KEY ("platform_id", "category")
);

-- CreateTable
CREATE TABLE "media_platform_listings" (
    "platform_id" UUID NOT NULL,
    "status" "MediaListingStatus" NOT NULL DEFAULT 'DRAFT',
    "point_price" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_platform_listings_pkey" PRIMARY KEY ("platform_id"),
    CONSTRAINT "media_listing_revision_positive" CHECK ("revision" > 0),
    CONSTRAINT "media_listing_point_price_positive" CHECK ("point_price" IS NULL OR "point_price" > 0),
    CONSTRAINT "media_listing_on_shelf_has_price" CHECK ("status" <> 'ON_SHELF' OR ("point_price" IS NOT NULL AND "point_price" > 0))
);

-- CreateTable
CREATE TABLE "media_supply_sources" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "contact_name" VARCHAR(160),
    "contact_method" VARCHAR(320),
    "status" "MediaSupplySourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_supply_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_resources" (
    "id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "supply_source_id" UUID NOT NULL,
    "resource_name" VARCHAR(240) NOT NULL,
    "account_identifier" VARCHAR(240),
    "account_url" VARCHAR(2048),
    "publication_mode" "MediaPublicationMode" NOT NULL DEFAULT 'FIRST_PUBLISH',
    "status" "MediaResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "public_visibility" "MediaPublicVisibility" NOT NULL DEFAULT 'HIDDEN',
    "public_alias" VARCHAR(240),
    "quality_tier" "MediaQualityTier" NOT NULL DEFAULT 'MEDIUM',
    "procurement_cost_fen" INTEGER,
    "case_url" VARCHAR(2048),
    "publication_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_resources_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "media_resource_cost_nonnegative" CHECK ("procurement_cost_fen" IS NULL OR "procurement_cost_fen" >= 0),
    CONSTRAINT "media_resource_masked_alias" CHECK ("public_visibility" <> 'MASKED' OR ("public_alias" IS NOT NULL AND length(btrim("public_alias")) > 0))
);

-- CreateTable
CREATE TABLE "media_catalog_state" (
    "id" VARCHAR(32) NOT NULL,
    "public_revision" BIGINT NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_catalog_state_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "media_catalog_state_singleton" CHECK ("id" = 'global'),
    CONSTRAINT "media_catalog_revision_positive" CHECK ("public_revision" > 0)
);

-- CreateTable
CREATE TABLE "media_catalog_audits" (
    "id" UUID NOT NULL,
    "actor_account_id" UUID NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "reason" VARCHAR(320) NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_catalog_audits_pkey" PRIMARY KEY ("id")
);

-- Seed the one durable public-catalog revision owner.
INSERT INTO "media_catalog_state" ("id", "public_revision", "updated_at")
VALUES ('global', 1, CURRENT_TIMESTAMP);

-- CreateIndex
CREATE UNIQUE INDEX "media_platforms_normalized_name_key" ON "media_platforms"("normalized_name");
CREATE INDEX "media_platforms_status_display_name_id_idx" ON "media_platforms"("status", "display_name", "id");
CREATE INDEX "media_platform_categories_category_platform_id_idx" ON "media_platform_categories"("category", "platform_id");
CREATE INDEX "media_platform_listings_status_platform_id_idx" ON "media_platform_listings"("status", "platform_id");
CREATE INDEX "media_supply_sources_status_name_id_idx" ON "media_supply_sources"("status", "name", "id");
CREATE INDEX "media_resources_platform_id_status_public_visibility_quality_idx" ON "media_resources"("platform_id", "status", "public_visibility", "quality_tier", "id");
CREATE INDEX "media_resources_supply_source_id_status_id_idx" ON "media_resources"("supply_source_id", "status", "id");
CREATE INDEX "media_catalog_audits_entity_type_entity_id_created_at_idx" ON "media_catalog_audits"("entity_type", "entity_id", "created_at");
CREATE INDEX "media_catalog_audits_actor_account_id_created_at_idx" ON "media_catalog_audits"("actor_account_id", "created_at");

-- AddForeignKey
ALTER TABLE "media_platform_categories" ADD CONSTRAINT "media_platform_categories_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "media_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_platform_listings" ADD CONSTRAINT "media_platform_listings_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "media_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_resources" ADD CONSTRAINT "media_resources_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "media_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_resources" ADD CONSTRAINT "media_resources_supply_source_id_fkey" FOREIGN KEY ("supply_source_id") REFERENCES "media_supply_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_catalog_audits" ADD CONSTRAINT "media_catalog_audits_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
