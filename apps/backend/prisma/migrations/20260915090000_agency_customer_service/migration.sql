ALTER TABLE agency_customer_attributions ALTER COLUMN entry_key DROP NOT NULL;
ALTER TABLE agency_customer_attributions ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE agency_customer_attributions ADD COLUMN updated_at TIMESTAMP(3);
UPDATE agency_customer_attributions SET updated_at=created_at;
ALTER TABLE agency_customer_attributions ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE agency_customer_attributions ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE agency_customer_attributions ADD CONSTRAINT agency_revision_positive CHECK (revision > 0);
ALTER TABLE agency_audits ALTER COLUMN entry_key DROP NOT NULL;
ALTER TABLE agency_audits ADD COLUMN before_agent_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD COLUMN reason VARCHAR(300), ADD COLUMN request_id UUID, ADD COLUMN request_intent JSONB, ADD COLUMN result_revision INTEGER;
CREATE UNIQUE INDEX agency_audits_actor_account_id_request_id_key ON agency_audits(actor_account_id,request_id);
ALTER TABLE agency_audits DROP CONSTRAINT agency_audit_action_valid;
ALTER TABLE agency_audits ADD CONSTRAINT agency_audit_action_valid CHECK (
 (action IN ('CREATE_LINK','INITIAL_BIND') AND entry_key IS NOT NULL) OR
 (action='REASSIGN' AND reason IS NOT NULL AND length(reason)>0 AND request_id IS NOT NULL AND request_intent IS NOT NULL AND result_revision>0)
);
