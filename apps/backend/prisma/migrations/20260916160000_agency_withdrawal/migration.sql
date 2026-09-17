CREATE TYPE "AgencyPayoutRecipientType" AS ENUM ('INDIVIDUAL','ENTERPRISE');
CREATE TYPE "AgencyWithdrawalStatus" AS ENUM ('PENDING_REVIEW','PAYING','COMPLETED','REJECTED','PAYMENT_FAILED','WITHDRAWN');
CREATE TYPE "AgencyWithdrawalAuditTarget" AS ENUM ('POLICY','PROFILE','REQUEST','PAYOUT_REVEAL');
CREATE TYPE "AgencyWithdrawalAuditAction" AS ENUM ('POLICY_UPDATED','PROFILE_UPDATED','REQUEST_SUBMITTED','REQUEST_WITHDRAWN','REQUEST_APPROVED','REQUEST_REJECTED','REQUEST_COMPLETED','REQUEST_PAYMENT_FAILED','PAYOUT_REVEALED');
ALTER TYPE "NotificationKind" ADD VALUE 'AGENCY_WITHDRAWAL_COMPLETED';
ALTER TYPE "NotificationKind" ADD VALUE 'AGENCY_WITHDRAWAL_REJECTED';
ALTER TYPE "NotificationKind" ADD VALUE 'AGENCY_WITHDRAWAL_PAYMENT_FAILED';

CREATE TABLE agency_withdrawal_policies (
 id VARCHAR(32) PRIMARY KEY DEFAULT 'global',
 minimum_fen BIGINT NOT NULL CHECK(minimum_fen>0),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT agency_withdrawal_policy_singleton CHECK(id='global')
);

CREATE TABLE agency_payout_profiles (
 agent_account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 recipient_type "AgencyPayoutRecipientType" NOT NULL,
 account_name VARCHAR(120) NOT NULL,
 account_number_ciphertext TEXT NOT NULL,
 account_number_last4 CHAR(4) NOT NULL CHECK(account_number_last4 ~ '^[0-9]{4}$'),
 bank_name VARCHAR(120) NOT NULL,
 opening_branch VARCHAR(160) NOT NULL,
 contact_mobile VARCHAR(20) NOT NULL,
 consent_version VARCHAR(40) NOT NULL,
 consented_at TIMESTAMPTZ(3) NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE agency_withdrawal_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 number SERIAL UNIQUE,
 agent_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 amount_fen BIGINT NOT NULL CHECK(amount_fen>0),
 status "AgencyWithdrawalStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 payout_recipient_type "AgencyPayoutRecipientType" NOT NULL,
 payout_account_name VARCHAR(120) NOT NULL,
 payout_account_number_ciphertext TEXT NOT NULL,
 payout_account_number_last4 CHAR(4) NOT NULL CHECK(payout_account_number_last4 ~ '^[0-9]{4}$'),
 payout_bank_name VARCHAR(120) NOT NULL,
 payout_opening_branch VARCHAR(160) NOT NULL,
 payout_contact_mobile VARCHAR(20) NOT NULL,
 payout_consent_version VARCHAR(40) NOT NULL,
 submitted_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
 approved_by_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 approved_at TIMESTAMPTZ(3),
 resolved_by_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 resolved_at TIMESTAMPTZ(3),
 result_reason VARCHAR(320),
 bank_transaction_reference VARCHAR(160),
 external_paid_at TIMESTAMPTZ(3),
 updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT agency_withdrawal_status_shape CHECK(
  (status='PENDING_REVIEW' AND approved_at IS NULL AND approved_by_account_id IS NULL AND resolved_at IS NULL AND resolved_by_account_id IS NULL AND result_reason IS NULL AND bank_transaction_reference IS NULL AND external_paid_at IS NULL) OR
  (status='PAYING' AND approved_at IS NOT NULL AND approved_by_account_id IS NOT NULL AND resolved_at IS NULL AND resolved_by_account_id IS NULL AND result_reason IS NULL AND bank_transaction_reference IS NULL AND external_paid_at IS NULL) OR
  (status='COMPLETED' AND approved_at IS NOT NULL AND approved_by_account_id IS NOT NULL AND resolved_at IS NOT NULL AND resolved_by_account_id IS NOT NULL AND result_reason IS NULL AND bank_transaction_reference IS NOT NULL) OR
  (status='REJECTED' AND approved_at IS NULL AND approved_by_account_id IS NULL AND resolved_at IS NOT NULL AND resolved_by_account_id IS NOT NULL AND result_reason IS NOT NULL AND bank_transaction_reference IS NULL AND external_paid_at IS NULL) OR
  (status='PAYMENT_FAILED' AND approved_at IS NOT NULL AND approved_by_account_id IS NOT NULL AND resolved_at IS NOT NULL AND resolved_by_account_id IS NOT NULL AND result_reason IS NOT NULL AND bank_transaction_reference IS NULL AND external_paid_at IS NULL) OR
  (status='WITHDRAWN' AND approved_at IS NULL AND approved_by_account_id IS NULL AND resolved_at IS NOT NULL AND resolved_by_account_id=agent_account_id AND result_reason IS NULL AND bank_transaction_reference IS NULL AND external_paid_at IS NULL)
 )
);
CREATE UNIQUE INDEX agency_withdrawal_one_active_per_agent ON agency_withdrawal_requests(agent_account_id) WHERE status IN ('PENDING_REVIEW','PAYING');
CREATE INDEX agency_withdrawal_requests_agent_number_idx ON agency_withdrawal_requests(agent_account_id,number);
CREATE INDEX agency_withdrawal_requests_status_number_idx ON agency_withdrawal_requests(status,number);

CREATE TABLE agency_withdrawal_audits (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 agent_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 withdrawal_id UUID REFERENCES agency_withdrawal_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 actor_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 request_id UUID NOT NULL,
 request_digest CHAR(64) NOT NULL,
 target "AgencyWithdrawalAuditTarget" NOT NULL,
 action "AgencyWithdrawalAuditAction" NOT NULL,
 before_state JSONB,
 after_state JSONB NOT NULL,
 reason VARCHAR(320),
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(actor_account_id,request_id)
);
CREATE INDEX agency_withdrawal_audits_agent_created_idx ON agency_withdrawal_audits(agent_account_id,created_at,id);
CREATE INDEX agency_withdrawal_audits_request_created_idx ON agency_withdrawal_audits(withdrawal_id,created_at,id);

CREATE FUNCTION preserve_agency_withdrawal_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.agent_account_id IS DISTINCT FROM NEW.agent_account_id OR OLD.amount_fen IS DISTINCT FROM NEW.amount_fen OR
    OLD.payout_recipient_type IS DISTINCT FROM NEW.payout_recipient_type OR OLD.payout_account_name IS DISTINCT FROM NEW.payout_account_name OR
    OLD.payout_account_number_ciphertext IS DISTINCT FROM NEW.payout_account_number_ciphertext OR OLD.payout_account_number_last4 IS DISTINCT FROM NEW.payout_account_number_last4 OR
    OLD.payout_bank_name IS DISTINCT FROM NEW.payout_bank_name OR OLD.payout_opening_branch IS DISTINCT FROM NEW.payout_opening_branch OR
    OLD.payout_contact_mobile IS DISTINCT FROM NEW.payout_contact_mobile OR OLD.payout_consent_version IS DISTINCT FROM NEW.payout_consent_version OR
    OLD.submitted_at IS DISTINCT FROM NEW.submitted_at THEN RAISE EXCEPTION 'withdrawal amount and payout snapshot are immutable'; END IF;
 IF NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'withdrawal revision must advance once'; END IF;
 IF NOT ((OLD.status='PENDING_REVIEW' AND NEW.status IN ('PAYING','REJECTED','WITHDRAWN')) OR (OLD.status='PAYING' AND NEW.status IN ('COMPLETED','PAYMENT_FAILED'))) THEN
  RAISE EXCEPTION 'invalid withdrawal transition';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER agency_withdrawal_transition BEFORE UPDATE ON agency_withdrawal_requests FOR EACH ROW EXECUTE FUNCTION preserve_agency_withdrawal_request();

CREATE FUNCTION preserve_agency_withdrawal_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'withdrawal history is immutable'; END; $$;
CREATE TRIGGER agency_withdrawal_request_no_delete BEFORE DELETE ON agency_withdrawal_requests FOR EACH ROW EXECUTE FUNCTION preserve_agency_withdrawal_history();
CREATE TRIGGER agency_withdrawal_audit_immutable BEFORE UPDATE OR DELETE ON agency_withdrawal_audits FOR EACH ROW EXECUTE FUNCTION preserve_agency_withdrawal_history();
