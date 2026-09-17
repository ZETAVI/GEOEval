CREATE TYPE "RechargeInvoiceStatus" AS ENUM ('PROCESSING','NEEDS_CORRECTION','ISSUED');
CREATE TYPE "RechargeInvoiceBuyerType" AS ENUM ('INDIVIDUAL','ENTERPRISE');
CREATE TYPE "RechargeInvoiceAuditAction" AS ENUM ('APPLICATION_SUBMITTED','REQUEST_CLAIMED','CORRECTION_REQUESTED','CORRECTION_RESUBMITTED','REQUEST_ASSIGNED','REQUEST_REASSIGNED','REQUEST_RETURNED','REQUEST_TAKEN_OVER','REQUEST_ISSUED');
ALTER TYPE "NotificationKind" ADD VALUE 'RECHARGE_INVOICE_NEEDS_CORRECTION';
ALTER TYPE "NotificationKind" ADD VALUE 'RECHARGE_INVOICE_ISSUED';

CREATE TABLE recharge_invoice_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 number SERIAL UNIQUE,
 recharge_order_id UUID NOT NULL,
 account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 amount_fen BIGINT NOT NULL CHECK(amount_fen>0),
 currency VARCHAR(3) NOT NULL DEFAULT 'CNY' CHECK(currency='CNY'),
 status "RechargeInvoiceStatus" NOT NULL DEFAULT 'PROCESSING',
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 current_submission_revision INTEGER NOT NULL DEFAULT 1 CHECK(current_submission_revision>0),
 assignee_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 correction_reason_code VARCHAR(40),
 correction_note VARCHAR(320),
 invoice_number VARCHAR(120),
 issued_on DATE,
 sent_at TIMESTAMPTZ(3),
 completed_by_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 submitted_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
 updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT recharge_invoice_order_owner_fkey FOREIGN KEY(recharge_order_id,account_id) REFERENCES recharge_orders(id,account_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT recharge_invoice_request_order_key UNIQUE(recharge_order_id),
 CONSTRAINT recharge_invoice_order_owner_key UNIQUE(recharge_order_id,account_id),
 CONSTRAINT recharge_invoice_status_shape CHECK(
  (status='PROCESSING' AND correction_reason_code IS NULL AND correction_note IS NULL AND invoice_number IS NULL AND issued_on IS NULL AND sent_at IS NULL AND completed_by_account_id IS NULL) OR
  (status='NEEDS_CORRECTION' AND correction_reason_code IS NOT NULL AND invoice_number IS NULL AND issued_on IS NULL AND sent_at IS NULL AND completed_by_account_id IS NULL) OR
  (status='ISSUED' AND correction_reason_code IS NULL AND correction_note IS NULL AND invoice_number IS NOT NULL AND issued_on IS NOT NULL AND sent_at IS NOT NULL AND completed_by_account_id IS NOT NULL)
 )
);
CREATE INDEX recharge_invoice_customer_number_idx ON recharge_invoice_requests(account_id,number);
CREATE INDEX recharge_invoice_status_assignee_number_idx ON recharge_invoice_requests(status,assignee_account_id,number);
CREATE INDEX recharge_invoice_assignee_status_number_idx ON recharge_invoice_requests(assignee_account_id,status,number);

CREATE TABLE recharge_invoice_submissions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id UUID NOT NULL REFERENCES recharge_invoice_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 revision INTEGER NOT NULL CHECK(revision>0),
 buyer_type "RechargeInvoiceBuyerType" NOT NULL,
 title VARCHAR(160) NOT NULL CHECK(length(btrim(title))>0),
 tax_number VARCHAR(32),
 email VARCHAR(254) NOT NULL CHECK(length(btrim(email))>0),
 submitted_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT recharge_invoice_submission_revision_key UNIQUE(request_id,revision),
 CONSTRAINT recharge_invoice_submission_buyer_shape CHECK(
  (buyer_type='INDIVIDUAL' AND tax_number IS NULL) OR
  (buyer_type='ENTERPRISE' AND tax_number IS NOT NULL AND length(btrim(tax_number))>0)
 )
);
CREATE INDEX recharge_invoice_submission_history_idx ON recharge_invoice_submissions(request_id,submitted_at);

CREATE TABLE recharge_invoice_audits (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id UUID NOT NULL REFERENCES recharge_invoice_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 actor_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 idempotency_key UUID NOT NULL,
 request_digest CHAR(64) NOT NULL,
 action "RechargeInvoiceAuditAction" NOT NULL,
 before_state JSONB,
 after_state JSONB NOT NULL,
 reason VARCHAR(320),
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT recharge_invoice_actor_idempotency_key UNIQUE(actor_account_id,idempotency_key)
);
CREATE INDEX recharge_invoice_audit_request_idx ON recharge_invoice_audits(request_id,created_at,id);
CREATE INDEX recharge_invoice_audit_customer_idx ON recharge_invoice_audits(account_id,created_at,id);

CREATE FUNCTION preserve_recharge_invoice_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.recharge_order_id IS DISTINCT FROM NEW.recharge_order_id OR
    OLD.account_id IS DISTINCT FROM NEW.account_id OR
    OLD.amount_fen IS DISTINCT FROM NEW.amount_fen OR
    OLD.currency IS DISTINCT FROM NEW.currency OR
    OLD.submitted_at IS DISTINCT FROM NEW.submitted_at THEN
  RAISE EXCEPTION 'recharge invoice order, owner, amount and submission time are immutable';
 END IF;
 IF NEW.revision<>OLD.revision+1 THEN
  RAISE EXCEPTION 'recharge invoice revision must advance once';
 END IF;
 IF OLD.status='ISSUED' THEN
  RAISE EXCEPTION 'issued recharge invoice is immutable';
 END IF;
 IF NOT (
  (OLD.status='PROCESSING' AND NEW.status IN ('PROCESSING','NEEDS_CORRECTION','ISSUED')) OR
  (OLD.status='NEEDS_CORRECTION' AND NEW.status IN ('NEEDS_CORRECTION','PROCESSING'))
 ) THEN
  RAISE EXCEPTION 'invalid recharge invoice transition';
 END IF;
 IF OLD.status='NEEDS_CORRECTION' AND NEW.status='PROCESSING' THEN
  IF NEW.current_submission_revision<>OLD.current_submission_revision+1 THEN
   RAISE EXCEPTION 'correction resubmission must add one submission revision';
  END IF;
 ELSIF NEW.current_submission_revision<>OLD.current_submission_revision THEN
  RAISE EXCEPTION 'submission revision may change only on correction resubmission';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER recharge_invoice_request_transition BEFORE UPDATE ON recharge_invoice_requests FOR EACH ROW EXECUTE FUNCTION preserve_recharge_invoice_request();

CREATE FUNCTION preserve_recharge_invoice_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'recharge invoice history is immutable';
END; $$;
CREATE TRIGGER recharge_invoice_request_no_delete BEFORE DELETE ON recharge_invoice_requests FOR EACH ROW EXECUTE FUNCTION preserve_recharge_invoice_history();
CREATE TRIGGER recharge_invoice_submission_immutable BEFORE UPDATE OR DELETE ON recharge_invoice_submissions FOR EACH ROW EXECUTE FUNCTION preserve_recharge_invoice_history();
CREATE TRIGGER recharge_invoice_audit_immutable BEFORE UPDATE OR DELETE ON recharge_invoice_audits FOR EACH ROW EXECUTE FUNCTION preserve_recharge_invoice_history();
