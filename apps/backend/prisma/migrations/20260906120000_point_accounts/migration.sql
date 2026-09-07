CREATE TYPE "PointChangeKind" AS ENUM ('ADMIN_ADJUSTMENT');
CREATE TABLE "point_accounts" (
  "account_id" UUID NOT NULL,
  "granted_balance" INTEGER NOT NULL DEFAULT 0 CHECK ("granted_balance" >= 0),
  "funded_balance" INTEGER NOT NULL DEFAULT 0 CHECK ("funded_balance" >= 0),
  "revision" INTEGER NOT NULL DEFAULT 0 CHECK ("revision" >= 0),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "point_accounts_pkey" PRIMARY KEY ("account_id"),
  CONSTRAINT "point_accounts_total_bounds" CHECK ("granted_balance"::BIGINT + "funded_balance"::BIGINT <= 2147483647),
  CONSTRAINT "point_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "point_changes" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL CHECK ("sequence" > 0),
  "kind" "PointChangeKind" NOT NULL,
  "granted_delta" INTEGER NOT NULL,
  "funded_delta" INTEGER NOT NULL DEFAULT 0,
  "balance_after" INTEGER NOT NULL CHECK ("balance_after" >= 0),
  "actor_account_id" UUID NOT NULL,
  "idempotency_key" UUID NOT NULL,
  "reason" VARCHAR(160) NOT NULL,
  "internal_note" VARCHAR(320),
  "business_reference" VARCHAR(160),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "point_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "point_changes_nonzero" CHECK ("granted_delta"::BIGINT + "funded_delta"::BIGINT <> 0),
  CONSTRAINT "point_changes_admin_granted_only" CHECK ("kind" <> 'ADMIN_ADJUSTMENT' OR ("funded_delta" = 0 AND "granted_delta" <> 0)),
  CONSTRAINT "point_changes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "point_accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "point_changes_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "point_changes_account_id_sequence_key" ON "point_changes"("account_id", "sequence");
CREATE UNIQUE INDEX "point_changes_account_id_idempotency_key_key" ON "point_changes"("account_id", "idempotency_key");
