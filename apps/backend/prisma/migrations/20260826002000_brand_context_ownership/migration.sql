ALTER TABLE "brand_contexts"
  DROP CONSTRAINT "brand_contexts_current_brand_id_fkey";

DROP INDEX "brand_contexts_current_brand_id_key";

CREATE UNIQUE INDEX "brand_profiles_id_account_id_key"
  ON "brand_profiles"("id", "account_id");

CREATE UNIQUE INDEX "brand_contexts_current_brand_id_account_id_key"
  ON "brand_contexts"("current_brand_id", "account_id");

ALTER TABLE "brand_contexts"
  ADD CONSTRAINT "brand_contexts_current_brand_id_account_id_fkey"
  FOREIGN KEY ("current_brand_id", "account_id")
  REFERENCES "brand_profiles"("id", "account_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
