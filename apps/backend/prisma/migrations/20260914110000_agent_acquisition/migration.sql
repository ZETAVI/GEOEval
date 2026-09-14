-- CreateTable
CREATE TABLE "agency_entry_links" (
    "key" VARCHAR(32) NOT NULL,
    "scope" VARCHAR(36) NOT NULL,
    "agent_account_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_entry_links_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "agency_entry_visits" (
    "token_digest" VARCHAR(64) NOT NULL,
    "entry_key" VARCHAR(32) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_entry_visits_pkey" PRIMARY KEY ("token_digest")
);

-- CreateTable
CREATE TABLE "agency_challenge_attributions" (
    "challenge_id" UUID NOT NULL,
    "entry_key" VARCHAR(32) NOT NULL,
    "agent_account_id" UUID,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_challenge_attributions_pkey" PRIMARY KEY ("challenge_id")
);

-- CreateTable
CREATE TABLE "agency_customer_attributions" (
    "account_id" UUID NOT NULL,
    "agent_account_id" UUID,
    "entry_key" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_customer_attributions_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "agency_audits" (
    "id" UUID NOT NULL,
    "action" VARCHAR(16) NOT NULL,
    "actor_account_id" UUID NOT NULL,
    "target_account_id" UUID NOT NULL,
    "agent_account_id" UUID,
    "entry_key" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agency_entry_links_scope_key" ON "agency_entry_links"("scope");

-- CreateIndex
CREATE INDEX "agency_entry_visits_expires_at_token_digest_idx" ON "agency_entry_visits"("expires_at", "token_digest");

-- CreateIndex
CREATE INDEX "agency_customer_attributions_agent_account_id_account_id_idx" ON "agency_customer_attributions"("agent_account_id", "account_id");

-- CreateIndex
CREATE INDEX "agency_audits_target_account_id_created_at_id_idx" ON "agency_audits"("target_account_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "agency_entry_links" ADD CONSTRAINT "agency_entry_links_agent_account_id_fkey" FOREIGN KEY ("agent_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_entry_visits" ADD CONSTRAINT "agency_entry_visits_entry_key_fkey" FOREIGN KEY ("entry_key") REFERENCES "agency_entry_links"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_challenge_attributions" ADD CONSTRAINT "agency_challenge_attributions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "mobile_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_challenge_attributions" ADD CONSTRAINT "agency_challenge_attributions_entry_key_fkey" FOREIGN KEY ("entry_key") REFERENCES "agency_entry_links"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_challenge_attributions" ADD CONSTRAINT "agency_challenge_attributions_agent_account_id_fkey" FOREIGN KEY ("agent_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_customer_attributions" ADD CONSTRAINT "agency_customer_attributions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_customer_attributions" ADD CONSTRAINT "agency_customer_attributions_agent_account_id_fkey" FOREIGN KEY ("agent_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_customer_attributions" ADD CONSTRAINT "agency_customer_attributions_entry_key_fkey" FOREIGN KEY ("entry_key") REFERENCES "agency_entry_links"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_audits" ADD CONSTRAINT "agency_audits_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_audits" ADD CONSTRAINT "agency_audits_target_account_id_fkey" FOREIGN KEY ("target_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_audits" ADD CONSTRAINT "agency_audits_agent_account_id_fkey" FOREIGN KEY ("agent_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_audits" ADD CONSTRAINT "agency_audits_entry_key_fkey" FOREIGN KEY ("entry_key") REFERENCES "agency_entry_links"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Public/source identity and lifecycle bounds are database invariants.
ALTER TABLE agency_entry_links ADD CONSTRAINT agency_entry_scope_valid CHECK (
 (agent_account_id IS NULL AND scope='PUBLIC') OR
 (agent_account_id IS NOT NULL AND scope=agent_account_id::text)
);
ALTER TABLE agency_entry_visits ADD CONSTRAINT agency_visit_expiry_valid CHECK (expires_at > created_at);
ALTER TABLE agency_customer_attributions ADD CONSTRAINT agency_not_self CHECK (agent_account_id IS DISTINCT FROM account_id);
ALTER TABLE agency_audits ADD CONSTRAINT agency_audit_action_valid CHECK (action IN ('CREATE_LINK','INITIAL_BIND'));
