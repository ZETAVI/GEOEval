CREATE TABLE "publishing_selections" (
  "brand_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "article_revision" INTEGER NOT NULL CHECK ("article_revision" > 0),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "intent" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "publishing_selections_pkey" PRIMARY KEY ("brand_id"),
  CONSTRAINT "publishing_selections_intent_shape" CHECK (
    jsonb_typeof("intent") = 'object' AND "intent" ? 'mode'
    AND "intent"->>'mode' IN ('RANDOM', 'PRECISE')
  ),
  CONSTRAINT "publishing_selections_article_owner_fkey" FOREIGN KEY ("article_id", "account_id", "brand_id")
    REFERENCES "core_articles"("id", "account_id", "brand_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "publishing_selections_account_id_idx" ON "publishing_selections"("account_id");
