CREATE TYPE "AccountRole" AS ENUM (
  'TERMINAL_CUSTOMER',
  'OPERATIONS',
  'ADMINISTRATOR',
  'AGENT'
);

CREATE TYPE "BrandStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "accounts" (
  "id" UUID NOT NULL,
  "mobile" VARCHAR(20) NOT NULL,
  "role" "AccountRole" NOT NULL DEFAULT 'TERMINAL_CUSTOMER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mobile_challenges" (
  "id" UUID NOT NULL,
  "mobile" VARCHAR(20) NOT NULL,
  "code_digest" CHAR(64) NOT NULL,
  "failed_attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mobile_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account_sessions" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "token_digest" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "brand_profiles" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "status" "BrandStatus" NOT NULL DEFAULT 'ACTIVE',
  "company_name" TEXT NOT NULL,
  "primary_industry" TEXT,
  "secondary_industry" TEXT,
  "characteristic_one" TEXT,
  "characteristic_two" TEXT,
  "province" TEXT,
  "city" TEXT,
  "district" TEXT,
  "contact_name" TEXT,
  "contact_mobile" VARCHAR(20),
  "evaluation_fingerprint" CHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "brand_contexts" (
  "account_id" UUID NOT NULL,
  "current_brand_id" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "brand_contexts_pkey" PRIMARY KEY ("account_id")
);

CREATE UNIQUE INDEX "accounts_mobile_key" ON "accounts"("mobile");
CREATE INDEX "mobile_challenges_mobile_created_at_idx"
  ON "mobile_challenges"("mobile", "created_at");
CREATE UNIQUE INDEX "account_sessions_token_digest_key"
  ON "account_sessions"("token_digest");
CREATE INDEX "account_sessions_account_id_expires_at_idx"
  ON "account_sessions"("account_id", "expires_at");
CREATE INDEX "brand_profiles_account_id_status_updated_at_idx"
  ON "brand_profiles"("account_id", "status", "updated_at");
CREATE UNIQUE INDEX "brand_contexts_current_brand_id_key"
  ON "brand_contexts"("current_brand_id");

ALTER TABLE "account_sessions"
  ADD CONSTRAINT "account_sessions_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brand_profiles"
  ADD CONSTRAINT "brand_profiles_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "brand_contexts"
  ADD CONSTRAINT "brand_contexts_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brand_contexts"
  ADD CONSTRAINT "brand_contexts_current_brand_id_fkey"
  FOREIGN KEY ("current_brand_id") REFERENCES "brand_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
