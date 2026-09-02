-- A media platform is the first-release priced sales unit. Preserve the current
-- price and optimistic-concurrency revision while removing the redundant
-- one-to-one Listing lifecycle.
ALTER TYPE "MediaPlatformStatus" RENAME VALUE 'ARCHIVED' TO 'INACTIVE';

ALTER TABLE "media_platforms"
ADD COLUMN "point_price" INTEGER,
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

UPDATE "media_platforms" AS platform
SET
  "point_price" = listing."point_price",
  "revision" = listing."revision",
  "status" = CASE
    WHEN platform."status" = 'ACTIVE' AND listing."status" = 'ON_SHELF'
      THEN 'ACTIVE'::"MediaPlatformStatus"
    ELSE 'INACTIVE'::"MediaPlatformStatus"
  END
FROM "media_platform_listings" AS listing
WHERE listing."platform_id" = platform."id";

UPDATE "media_platforms" AS platform
SET "status" = 'INACTIVE'::"MediaPlatformStatus"
WHERE NOT EXISTS (
  SELECT 1
  FROM "media_platform_listings" AS listing
  WHERE listing."platform_id" = platform."id"
);

DROP TABLE "media_platform_listings";
DROP TYPE "MediaListingStatus";

ALTER TABLE "media_platforms"
ADD CONSTRAINT "media_platform_revision_positive" CHECK ("revision" > 0),
ADD CONSTRAINT "media_platform_point_price_positive" CHECK ("point_price" IS NULL OR "point_price" > 0),
ADD CONSTRAINT "media_platform_active_has_price" CHECK (
  "status" <> 'ACTIVE' OR ("point_price" IS NOT NULL AND "point_price" > 0)
);
