CREATE TYPE "ArticleGenerationStatus" AS ENUM (
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'NOT_APPLIED'
);

CREATE TYPE "CoreArticleStatus" AS ENUM ('DRAFT', 'CONFIRMED');

CREATE TABLE "writer_input_snapshots" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "brand_id" UUID NOT NULL,
  "source_brand_revision" INTEGER NOT NULL,
  "source_writing_context_fingerprint" CHAR(64) NOT NULL,
  "evaluation_guidance_id" UUID NOT NULL,
  "evaluation_guidance_run_id" UUID NOT NULL,
  "request_contract_version" VARCHAR(80) NOT NULL,
  "writer_request" JSONB NOT NULL,
  "generation_policy_id" VARCHAR(80) NOT NULL,
  "generation_policy_version" VARCHAR(40) NOT NULL,
  "generation_policy_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "writer_input_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "writer_snapshot_brand_revision_positive"
    CHECK ("source_brand_revision" > 0),
  CONSTRAINT "writer_snapshot_fingerprint_format"
    CHECK ("source_writing_context_fingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "writer_snapshot_policy_hash_format"
    CHECK ("generation_policy_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "writer_snapshot_request_object"
    CHECK (jsonb_typeof("writer_request") = 'object'),
  CONSTRAINT "writer_snapshot_request_metadata_match"
    CHECK (
      "writer_request" ->> 'contractVersion' = "request_contract_version" AND
      "writer_request" -> 'generationPolicy' ->> 'id' = "generation_policy_id" AND
      "writer_request" -> 'generationPolicy' ->> 'version' = "generation_policy_version" AND
      "writer_request" -> 'generationPolicy' ->> 'hash' = "generation_policy_hash"
    )
);

CREATE TABLE "article_generations" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "brand_id" UUID NOT NULL,
  "snapshot_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(120) NOT NULL,
  "status" "ArticleGenerationStatus" NOT NULL DEFAULT 'RUNNING',
  "attempt_count" INTEGER NOT NULL DEFAULT 1,
  "expected_article_revision" INTEGER,
  "failure_code" VARCHAR(80),
  "failure_message" VARCHAR(240),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "article_generations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "article_generation_attempt_count_positive"
    CHECK ("attempt_count" > 0),
  CONSTRAINT "article_generation_idempotency_key_length"
    CHECK (char_length(btrim("idempotency_key")) BETWEEN 8 AND 120),
  CONSTRAINT "article_generation_expected_revision_positive"
    CHECK (
      "expected_article_revision" IS NULL OR
      "expected_article_revision" > 0
    ),
  CONSTRAINT "article_generation_terminal_shape"
    CHECK (
      ("status" = 'RUNNING' AND "finished_at" IS NULL AND
        "failure_code" IS NULL AND "failure_message" IS NULL) OR
      ("status" IN ('SUCCEEDED', 'NOT_APPLIED') AND
        "finished_at" IS NOT NULL AND "failure_code" IS NULL AND
        "failure_message" IS NULL) OR
      ("status" = 'FAILED' AND "finished_at" IS NOT NULL AND
        "failure_code" IS NOT NULL AND "failure_message" IS NOT NULL)
    )
);

CREATE TABLE "core_articles" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "brand_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "body_markdown" TEXT NOT NULL,
  "status" "CoreArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "source_generation_id" UUID NOT NULL,
  "confirmed_revision" INTEGER,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "core_articles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "core_article_revision_positive" CHECK ("revision" > 0),
  CONSTRAINT "core_article_title_not_blank" CHECK (char_length(btrim("title")) > 0),
  CONSTRAINT "core_article_body_length"
    CHECK (char_length(btrim("body_markdown")) BETWEEN 1 AND 100000),
  CONSTRAINT "core_article_confirmation_shape"
    CHECK (
      ("status" = 'DRAFT' AND "confirmed_revision" IS NULL AND
        "confirmed_at" IS NULL) OR
      ("status" = 'CONFIRMED' AND "confirmed_revision" = "revision" AND
        "confirmed_at" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "writer_input_snapshots_id_account_brand_key"
  ON "writer_input_snapshots"("id", "account_id", "brand_id");
CREATE INDEX "writer_input_snapshots_account_brand_created_idx"
  ON "writer_input_snapshots"("account_id", "brand_id", "created_at");

CREATE UNIQUE INDEX "evaluation_runs_id_account_brand_key"
  ON "evaluation_runs"("id", "account_id", "brand_id");
CREATE UNIQUE INDEX "evaluation_guidance_id_run_key"
  ON "evaluation_optimization_guidance"("id", "run_id");

CREATE UNIQUE INDEX "article_generations_id_account_brand_key"
  ON "article_generations"("id", "account_id", "brand_id");
CREATE UNIQUE INDEX "article_generations_snapshot_account_brand_key"
  ON "article_generations"("snapshot_id", "account_id", "brand_id");
CREATE UNIQUE INDEX "article_generations_account_brand_idempotency_key"
  ON "article_generations"("account_id", "brand_id", "idempotency_key");
CREATE UNIQUE INDEX "article_generations_one_running_per_brand_key"
  ON "article_generations"("account_id", "brand_id")
  WHERE "status" = 'RUNNING';
CREATE INDEX "article_generations_account_brand_created_idx"
  ON "article_generations"("account_id", "brand_id", "created_at");

CREATE UNIQUE INDEX "core_articles_id_account_brand_key"
  ON "core_articles"("id", "account_id", "brand_id");
CREATE UNIQUE INDEX "core_articles_brand_account_key"
  ON "core_articles"("brand_id", "account_id");
CREATE UNIQUE INDEX "core_articles_source_generation_account_brand_key"
  ON "core_articles"("source_generation_id", "account_id", "brand_id");
CREATE INDEX "core_articles_account_brand_idx"
  ON "core_articles"("account_id", "brand_id");

ALTER TABLE "writer_input_snapshots"
  ADD CONSTRAINT "writer_input_snapshots_brand_fkey"
  FOREIGN KEY ("brand_id", "account_id")
  REFERENCES "brand_profiles"("id", "account_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "writer_input_snapshots"
  ADD CONSTRAINT "writer_input_snapshots_guidance_fkey"
  FOREIGN KEY ("evaluation_guidance_id", "evaluation_guidance_run_id")
  REFERENCES "evaluation_optimization_guidance"("id", "run_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "writer_input_snapshots"
  ADD CONSTRAINT "writer_input_snapshots_guidance_run_owner_fkey"
  FOREIGN KEY ("evaluation_guidance_run_id", "account_id", "brand_id")
  REFERENCES "evaluation_runs"("id", "account_id", "brand_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "article_generations"
  ADD CONSTRAINT "article_generations_brand_fkey"
  FOREIGN KEY ("brand_id", "account_id")
  REFERENCES "brand_profiles"("id", "account_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "article_generations"
  ADD CONSTRAINT "article_generations_snapshot_fkey"
  FOREIGN KEY ("snapshot_id", "account_id", "brand_id")
  REFERENCES "writer_input_snapshots"("id", "account_id", "brand_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core_articles"
  ADD CONSTRAINT "core_articles_brand_fkey"
  FOREIGN KEY ("brand_id", "account_id")
  REFERENCES "brand_profiles"("id", "account_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_articles"
  ADD CONSTRAINT "core_articles_source_generation_fkey"
  FOREIGN KEY ("source_generation_id", "account_id", "brand_id")
  REFERENCES "article_generations"("id", "account_id", "brand_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
