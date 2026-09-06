CREATE TYPE "PublishingPackageStatus" AS ENUM ('INACTIVE', 'ACTIVE');

CREATE TABLE "publishing_packages" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "normalized_name" VARCHAR(120) NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "point_price" INTEGER NOT NULL CHECK ("point_price" > 0),
  "status" "PublishingPackageStatus" NOT NULL DEFAULT 'INACTIVE',
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "publishing_packages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "publishing_packages_name_nonempty" CHECK (length(trim("name")) > 0)
);
CREATE UNIQUE INDEX "publishing_packages_normalized_name_key" ON "publishing_packages"("normalized_name");
CREATE INDEX "publishing_packages_status_created_at_id_idx" ON "publishing_packages"("status", "created_at", "id");

CREATE TABLE "publishing_package_platforms" (
  "package_id" UUID NOT NULL,
  "platform_id" UUID NOT NULL,
  CONSTRAINT "publishing_package_platforms_pkey" PRIMARY KEY ("package_id", "platform_id"),
  CONSTRAINT "publishing_package_platforms_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "publishing_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "publishing_package_platforms_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "media_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "publishing_package_platforms_platform_id_idx" ON "publishing_package_platforms"("platform_id");

CREATE TABLE "publishing_package_audits" (
  "id" UUID NOT NULL,
  "package_id" UUID NOT NULL,
  "actor_account_id" UUID NOT NULL,
  "reason" VARCHAR(320) NOT NULL,
  "before_state" JSONB,
  "after_state" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publishing_package_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "publishing_package_audits_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "publishing_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "publishing_package_audits_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "publishing_package_audits_package_id_created_at_id_idx" ON "publishing_package_audits"("package_id", "created_at", "id");
