CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "SessionRevocationReason" AS ENUM (
  'USER_LOGOUT',
  'USER_LOGOUT_ALL',
  'ADMIN_REVOKE_ALL',
  'ACCOUNT_DEACTIVATED',
  'ROLE_CHANGED'
);

CREATE TYPE "IdentityGovernanceActorKind" AS ENUM ('ACCOUNT', 'BOOTSTRAP');

CREATE TYPE "IdentityGovernanceAction" AS ENUM (
  'BOOTSTRAP_ADMINISTRATOR',
  'CREATE_INTERNAL_ACCOUNT',
  'ACTIVATE_ACCOUNT',
  'DEACTIVATE_ACCOUNT',
  'CHANGE_INTERNAL_ROLE',
  'REVOKE_ACCOUNT_SESSIONS'
);

ALTER TABLE "accounts"
  ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "last_authenticated_at" TIMESTAMP(3);

ALTER TABLE "account_sessions"
  ADD COLUMN "idle_expires_at" TIMESTAMP(3),
  ADD COLUMN "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "revoked_reason" "SessionRevocationReason";

UPDATE "account_sessions" AS session
SET "idle_expires_at" = LEAST(
  session."expires_at",
  session."created_at" + CASE
    WHEN account."role" = 'TERMINAL_CUSTOMER' THEN INTERVAL '24 hours'
    ELSE INTERVAL '30 minutes'
  END
)
FROM "accounts" AS account
WHERE account."id" = session."account_id";

ALTER TABLE "account_sessions"
  ALTER COLUMN "idle_expires_at" SET NOT NULL,
  ALTER COLUMN "idle_expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes');

CREATE TABLE "identity_governance_controls" (
  "id" VARCHAR(32) NOT NULL,
  "bootstrap_account_id" UUID,
  "bootstrap_secret_digest" CHAR(64),
  "bootstrap_key_id" VARCHAR(120),
  "bootstrap_completed_at" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "identity_governance_controls_pkey" PRIMARY KEY ("id")
);

INSERT INTO "identity_governance_controls" (
  "id",
  "updated_at"
) VALUES ('GLOBAL', CURRENT_TIMESTAMP);

CREATE TABLE "identity_governance_audits" (
  "id" UUID NOT NULL,
  "actor_kind" "IdentityGovernanceActorKind" NOT NULL,
  "actor_account_id" UUID,
  "actor_key_id" VARCHAR(120),
  "target_account_id" UUID NOT NULL,
  "action" "IdentityGovernanceAction" NOT NULL,
  "reason" VARCHAR(320) NOT NULL,
  "before_state" JSONB,
  "after_state" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "identity_governance_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "identity_governance_audits_actor_shape_check" CHECK (
    ("actor_kind" = 'ACCOUNT' AND "actor_account_id" IS NOT NULL AND "actor_key_id" IS NULL)
    OR
    ("actor_kind" = 'BOOTSTRAP' AND "actor_account_id" IS NULL AND "actor_key_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "identity_governance_controls_bootstrap_account_id_key"
  ON "identity_governance_controls"("bootstrap_account_id");

CREATE INDEX "accounts_role_status_created_at_id_idx"
  ON "accounts"("role", "status", "created_at", "id");

CREATE INDEX "accounts_status_updated_at_id_idx"
  ON "accounts"("status", "updated_at", "id");

DROP INDEX "account_sessions_account_id_expires_at_idx";

CREATE INDEX "account_sessions_account_id_revoked_at_expires_at_idx"
  ON "account_sessions"("account_id", "revoked_at", "expires_at");

CREATE INDEX "account_sessions_idle_expires_at_idx"
  ON "account_sessions"("idle_expires_at");

CREATE INDEX "identity_governance_audits_target_account_id_created_at_id_idx"
  ON "identity_governance_audits"("target_account_id", "created_at", "id");

CREATE INDEX "identity_governance_audits_actor_account_id_created_at_id_idx"
  ON "identity_governance_audits"("actor_account_id", "created_at", "id");

CREATE INDEX "identity_governance_audits_action_created_at_id_idx"
  ON "identity_governance_audits"("action", "created_at", "id");

ALTER TABLE "identity_governance_controls"
  ADD CONSTRAINT "identity_governance_controls_bootstrap_account_id_fkey"
  FOREIGN KEY ("bootstrap_account_id") REFERENCES "accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "identity_governance_audits"
  ADD CONSTRAINT "identity_governance_audits_actor_account_id_fkey"
  FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "identity_governance_audits"
  ADD CONSTRAINT "identity_governance_audits_target_account_id_fkey"
  FOREIGN KEY ("target_account_id") REFERENCES "accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
