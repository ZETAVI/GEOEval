ALTER TABLE publication_deliveries ADD COLUMN completed_at TIMESTAMPTZ(3);
-- Capture the first transition, never infer old completion from deployment time.
CREATE FUNCTION preserve_delivery_end() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN RAISE EXCEPTION 'first completion is immutable'; END IF;
  IF OLD.closed_at IS NOT NULL AND NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN RAISE EXCEPTION 'first closure is immutable'; END IF;
  IF OLD.status <> 'COMPLETED' AND NEW.status='COMPLETED' AND NEW.completed_at IS NULL THEN NEW.completed_at=clock_timestamp(); END IF;
 ELSIF NEW.status='COMPLETED' AND NEW.completed_at IS NULL THEN NEW.completed_at=clock_timestamp();
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER delivery_first_end BEFORE INSERT OR UPDATE ON publication_deliveries FOR EACH ROW EXECUTE FUNCTION preserve_delivery_end();
ALTER TABLE support_tickets ADD COLUMN publishing_order_id UUID, ADD COLUMN post_end_appeal BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE support_tickets ADD CONSTRAINT support_order_owner_fkey FOREIGN KEY (publishing_order_id,customer_account_id) REFERENCES publishing_orders(id,account_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE support_tickets DROP CONSTRAINT support_resolved_owner;
ALTER TABLE support_tickets ADD CONSTRAINT support_reference_shape CHECK (
 (publishing_order_id IS NULL AND NOT post_end_appeal AND (status<>'RESOLVED' OR assignee_account_id IS NOT NULL)) OR
 (publishing_order_id IS NOT NULL AND recharge_order_id IS NULL AND assignee_account_id IS NULL));
CREATE UNIQUE INDEX support_one_open_order ON support_tickets(publishing_order_id) WHERE publishing_order_id IS NOT NULL AND status='PROCESSING';
CREATE UNIQUE INDEX support_one_customer_appeal ON support_tickets(publishing_order_id) WHERE post_end_appeal;
CREATE FUNCTION preserve_support_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.customer_account_id IS DISTINCT FROM OLD.customer_account_id OR NEW.publishing_order_id IS DISTINCT FROM OLD.publishing_order_id OR NEW.recharge_order_id IS DISTINCT FROM OLD.recharge_order_id OR NEW.post_end_appeal IS DISTINCT FROM OLD.post_end_appeal THEN RAISE EXCEPTION 'support admission reference is immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER support_reference_immutable BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION preserve_support_reference();
