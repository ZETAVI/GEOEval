-- Refine the administrator catalog without losing existing supplier/resource IDs.

-- Supplier names become globally unique after the same conservative trim/lower
-- normalization used for the migration backfill. Refuse an ambiguous merge.
DO $$
BEGIN
  IF EXISTS (
    SELECT lower(btrim("name"))
    FROM "media_supply_sources"
    GROUP BY lower(btrim("name"))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'media supplier names collide after normalization';
  END IF;
END $$;

ALTER TYPE "MediaSupplySourceStatus" RENAME TO "MediaSupplierStatus";
ALTER TABLE "media_supply_sources" RENAME TO "media_suppliers";
ALTER TABLE "media_suppliers" RENAME CONSTRAINT "media_supply_sources_pkey" TO "media_suppliers_pkey";
ALTER TABLE "media_suppliers" RENAME COLUMN "name" TO "display_name";
ALTER TABLE "media_suppliers"
  ADD COLUMN "normalized_name" VARCHAR(160),
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
UPDATE "media_suppliers"
SET "normalized_name" = lower(btrim("display_name"));
ALTER TABLE "media_suppliers"
  ALTER COLUMN "normalized_name" SET NOT NULL,
  ADD CONSTRAINT "media_supplier_revision_positive" CHECK ("revision" > 0);
DROP INDEX "media_supply_sources_status_name_id_idx";
CREATE UNIQUE INDEX "media_suppliers_normalized_name_key" ON "media_suppliers"("normalized_name");
CREATE INDEX "media_suppliers_status_display_name_id_idx" ON "media_suppliers"("status", "display_name", "id");

ALTER TABLE "media_resources" DROP CONSTRAINT "media_resources_supply_source_id_fkey";
DROP INDEX "media_resources_supply_source_id_status_id_idx";
ALTER TABLE "media_resources" RENAME COLUMN "supply_source_id" TO "supplier_id";
ALTER TABLE "media_resources"
  ADD CONSTRAINT "media_resources_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "media_suppliers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "media_resources_supplier_id_status_id_idx" ON "media_resources"("supplier_id", "status", "id");

-- The approved business unit is whole RMB yuan. Reject rather than round old
-- data that cannot be represented losslessly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "media_resources"
    WHERE "procurement_cost_fen" IS NOT NULL
      AND mod("procurement_cost_fen", 100) <> 0
  ) THEN
    RAISE EXCEPTION 'procurement cost cannot be converted to whole RMB yuan';
  END IF;
END $$;
UPDATE "media_resources"
SET "procurement_cost_fen" = "procurement_cost_fen" / 100
WHERE "procurement_cost_fen" IS NOT NULL;
ALTER TABLE "media_resources" RENAME COLUMN "procurement_cost_fen" TO "procurement_cost_yuan";
ALTER TABLE "media_resources" RENAME CONSTRAINT "media_resource_cost_nonnegative" TO "media_resource_cost_yuan_nonnegative";

-- A resource stores only the administrator's manual two-state decision.
ALTER TABLE "media_resources" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "MediaResourceStatus" RENAME TO "MediaResourceStatus_old";
CREATE TYPE "MediaResourceStatus" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "media_resources"
  ALTER COLUMN "status" TYPE "MediaResourceStatus"
  USING (
    CASE WHEN "status"::text = 'ACTIVE' THEN 'ACTIVE' ELSE 'INACTIVE' END
  )::"MediaResourceStatus";
ALTER TABLE "media_resources" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "MediaResourceStatus_old";
ALTER TABLE "media_resources"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT "media_resource_revision_positive" CHECK ("revision" > 0);

-- Geography belongs to media_platforms.region_scope, not category membership.
DELETE FROM "media_platform_categories" WHERE "category" = 'OVERSEAS_MEDIA';
ALTER TYPE "MediaCategory" RENAME TO "MediaCategory_old";
CREATE TYPE "MediaCategory" AS ENUM (
  'CENTRAL_MEDIA',
  'PORTAL_MEDIA',
  'LOCAL_MEDIA',
  'VERTICAL_MEDIA',
  'CONTENT_PLATFORM'
);
ALTER TABLE "media_platform_categories"
  ALTER COLUMN "category" TYPE "MediaCategory"
  USING ("category"::text)::"MediaCategory";
DROP TYPE "MediaCategory_old";
