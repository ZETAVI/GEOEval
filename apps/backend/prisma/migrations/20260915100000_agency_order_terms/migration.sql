CREATE TABLE agency_commission_terms (
 agent_account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE RESTRICT,
 enabled BOOLEAN NOT NULL DEFAULT false,
 rate_bps INTEGER,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0),
 updated_at TIMESTAMP(3) NOT NULL,
 CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 10000),
 CHECK (NOT enabled OR rate_bps IS NOT NULL)
);
CREATE TABLE agency_commission_audits (
 id UUID PRIMARY KEY,
 agent_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 actor_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL,
 request JSONB NOT NULL,
 before_state JSONB NOT NULL,
 after_state JSONB NOT NULL,
 reason VARCHAR(320) NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX agency_commission_audits_actor_account_id_request_id_key ON agency_commission_audits(actor_account_id,request_id);
CREATE INDEX agency_commission_audits_agent_account_id_created_at_id_idx ON agency_commission_audits(agent_account_id,created_at,id);
CREATE TABLE publishing_order_agency (
 order_id UUID PRIMARY KEY REFERENCES publishing_orders(id) ON DELETE RESTRICT,
 agent_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
 attribution_revision INTEGER NOT NULL CHECK(attribution_revision >= 0),
 agent_active BOOLEAN NOT NULL,
 commission_enabled BOOLEAN NOT NULL,
 rate_bps INTEGER,
 terms_revision INTEGER NOT NULL CHECK(terms_revision >= 0),
 CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 10000),
 CHECK (NOT commission_enabled OR rate_bps IS NOT NULL),
 CHECK (agent_account_id IS NOT NULL OR (NOT agent_active AND NOT commission_enabled AND rate_bps IS NULL AND terms_revision = 0))
);
CREATE INDEX publishing_order_agency_agent_account_id_order_id_idx ON publishing_order_agency(agent_account_id,order_id);
CREATE FUNCTION preserve_publishing_order_agency() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Publishing order agency terms are immutable'; END;
$$;
CREATE TRIGGER publishing_order_agency_immutable BEFORE UPDATE OR DELETE ON publishing_order_agency FOR EACH ROW EXECUTE FUNCTION preserve_publishing_order_agency();
