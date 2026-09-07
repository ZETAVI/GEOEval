CREATE TYPE "PublishingOrderStatus" AS ENUM ('PENDING_HANDLING');
CREATE TABLE "publishing_orders" (
  "id" UUID NOT NULL PRIMARY KEY,
  "number" SERIAL NOT NULL UNIQUE,
  "account_id" UUID NOT NULL,
  "brand_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "article_revision" INTEGER NOT NULL CHECK ("article_revision" > 0),
  "selection_revision" INTEGER NOT NULL CHECK ("selection_revision" > 0),
  "idempotency_key" UUID NOT NULL,
  "submission_request" JSONB NOT NULL CHECK (jsonb_typeof("submission_request") = 'object'),
  "status" "PublishingOrderStatus" NOT NULL DEFAULT 'PENDING_HANDLING',
  "title" VARCHAR(200) NOT NULL CHECK (length("title") > 0),
  "body_markdown" TEXT NOT NULL CHECK (length("body_markdown") BETWEEN 1 AND 100000),
  "agreement" JSONB NOT NULL,
  "package_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publishing_orders_article_owner_fkey" FOREIGN KEY ("article_id","account_id","brand_id") REFERENCES "core_articles"("id","account_id","brand_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "publishing_orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "publishing_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "publishing_orders_agreement_bounds" CHECK (
    jsonb_typeof("agreement") = 'object' AND "agreement" ?& ARRAY['mode','quantity','totalPoints']
    AND "agreement"->>'mode' IN ('RANDOM','PRECISE')
    AND ("agreement"->>'quantity') ~ '^[1-9][0-9]*$' AND ("agreement"->>'totalPoints') ~ '^[1-9][0-9]*$'
    AND ("agreement"->>'quantity')::NUMERIC BETWEEN 1 AND 2147483647
    AND ("agreement"->>'totalPoints')::NUMERIC BETWEEN 1 AND 2147483647
    AND (("agreement"->>'mode' = 'RANDOM' AND "package_id" IS NOT NULL) OR ("agreement"->>'mode' = 'PRECISE' AND "package_id" IS NULL))
  )
);
CREATE UNIQUE INDEX "publishing_orders_account_id_idempotency_key_key" ON "publishing_orders"("account_id","idempotency_key");
CREATE UNIQUE INDEX "publishing_orders_id_account_id_key" ON "publishing_orders"("id","account_id");
CREATE INDEX "publishing_orders_account_id_brand_id_number_idx" ON "publishing_orders"("account_id","brand_id","number");
CREATE TABLE "publishing_order_platforms" (
  "order_id" UUID NOT NULL,
  "platform_id" UUID NOT NULL,
  PRIMARY KEY ("order_id","platform_id"),
  CONSTRAINT "publishing_order_platforms_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "publishing_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "publishing_order_platforms_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "media_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "publishing_order_platforms_platform_id_idx" ON "publishing_order_platforms"("platform_id");
ALTER TABLE "point_changes" ADD COLUMN "publishing_order_id" UUID;
ALTER TABLE "point_changes" ADD CONSTRAINT "point_changes_order_owner_fkey" FOREIGN KEY ("publishing_order_id","account_id") REFERENCES "publishing_orders"("id","account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "point_changes_publishing_order_id_key" ON "point_changes"("publishing_order_id");
CREATE UNIQUE INDEX "point_changes_publishing_order_id_account_id_key" ON "point_changes"("publishing_order_id","account_id");
ALTER TABLE "point_changes" ADD CONSTRAINT "point_changes_kind_link" CHECK (
  ("kind" = 'ADMIN_ADJUSTMENT' AND "publishing_order_id" IS NULL)
  OR ("kind" = 'PUBLISHING_ORDER' AND "publishing_order_id" IS NOT NULL AND "granted_delta" <= 0 AND "funded_delta" <= 0 AND "actor_account_id" = "account_id")
);
ALTER TABLE "publishing_selections" ALTER COLUMN "intent" DROP NOT NULL;
ALTER TABLE "publishing_selections" DROP CONSTRAINT "publishing_selections_intent_shape";
ALTER TABLE "publishing_selections" ADD CONSTRAINT "publishing_selections_intent_shape" CHECK (
  "intent" IS NULL OR (jsonb_typeof("intent") = 'object' AND "intent" ? 'mode' AND "intent"->>'mode' IN ('RANDOM','PRECISE'))
);
