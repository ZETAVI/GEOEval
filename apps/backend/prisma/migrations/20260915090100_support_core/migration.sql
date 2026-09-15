CREATE TABLE support_tickets (
 id UUID PRIMARY KEY,
 sequence SERIAL NOT NULL UNIQUE,
 customer_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 recharge_order_id UUID,
 assignee_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 subject VARCHAR(100) NOT NULL CHECK (length(trim(subject)) > 0),
 status VARCHAR(16) NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING','RESOLVED')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT support_tickets_recharge_order_id_customer_account_id_fkey FOREIGN KEY (recharge_order_id, customer_account_id) REFERENCES recharge_orders(id, account_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT support_resolved_owner CHECK (status <> 'RESOLVED' OR assignee_account_id IS NOT NULL)
);
CREATE INDEX support_tickets_customer_account_id_sequence_idx ON support_tickets(customer_account_id, sequence);
CREATE INDEX support_tickets_assignee_account_id_status_sequence_idx ON support_tickets(assignee_account_id, status, sequence);
CREATE TABLE support_events (
 id UUID PRIMARY KEY,
 ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 actor_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 actor_role VARCHAR(24) NOT NULL CHECK (actor_role IN ('TERMINAL_CUSTOMER','OPERATIONS','ADMINISTRATOR')),
 request_id UUID NOT NULL,
 request_digest CHAR(64) NOT NULL,
 action VARCHAR(16) NOT NULL CHECK (action IN ('CREATE','CLAIM','REPLY','RESOLVE','RELEASE')),
 message VARCHAR(4000),
 ticket_revision INTEGER NOT NULL CHECK (ticket_revision > 0),
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT support_events_actor_account_id_request_id_key UNIQUE(actor_account_id, request_id),
 CONSTRAINT support_events_ticket_id_ticket_revision_key UNIQUE(ticket_id, ticket_revision),
 CONSTRAINT support_message_shape CHECK (
 (action IN ('CREATE','REPLY','RESOLVE','RELEASE') AND message IS NOT NULL AND length(trim(message)) > 0)
 OR (action='CLAIM' AND message IS NULL))
);
CREATE FUNCTION preserve_support_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'support conversation and audit are append only'; END;
$$;
CREATE TRIGGER support_event_immutable BEFORE UPDATE OR DELETE ON support_events FOR EACH ROW EXECUTE FUNCTION preserve_support_event();
