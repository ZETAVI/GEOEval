BEGIN;
ALTER TABLE publication_deliveries DROP CONSTRAINT delivery_resolution_shape;
ALTER TABLE publication_deliveries ADD CONSTRAINT delivery_resolution_shape CHECK (
  agreement_revision>=0 AND agreed_return_points>=0
  AND ((agreement_revision=0 AND resolution_mode IS NULL AND resolution_reason IS NULL AND agreed_return_points=0)
    OR (agreement_revision>0 AND resolution_mode IS NOT NULL AND resolution_mode IN ('CONTINUE','TERMINATE') AND resolution_reason IS NOT NULL AND length(trim(resolution_reason))>0))
  AND (stopped_at IS NULL OR (resolution_mode IS NOT NULL AND resolution_mode='TERMINATE' AND status IN ('EXCEPTION_HANDLING','CLOSED')))
  AND ((status='CLOSED' AND closed_at IS NOT NULL AND resolution_mode='TERMINATE' AND agreement_revision>0) OR (status<>'CLOSED' AND closed_at IS NULL))
  AND (settled_ledger_id IS NULL OR (agreed_return_points>0 AND status IN ('COMPLETED','CLOSED')))
);

-- Existing stopped work ends at its retained stop fact, never at migration time.
UPDATE publication_deliveries SET status='CLOSED',closed_at=stopped_at
WHERE status='EXCEPTION_HANDLING' AND stopped_at IS NOT NULL AND resolution_mode='TERMINATE' AND settled_ledger_id IS NULL;
ALTER TABLE point_changes DROP CONSTRAINT point_changes_actor_and_request;
ALTER TABLE point_changes ADD CONSTRAINT point_changes_actor_and_request CHECK (
 (kind='RECHARGE' AND actor_kind='SYSTEM' AND actor_account_id IS NULL AND idempotency_key IS NULL)
 OR (kind IN ('ADMIN_ADJUSTMENT','PUBLISHING_ORDER','ORDER_RETURN') AND actor_kind='ACCOUNT' AND actor_account_id IS NOT NULL AND idempotency_key IS NOT NULL)
 OR (kind='ORDER_RETURN' AND actor_kind='SYSTEM' AND actor_account_id IS NULL AND idempotency_key IS NULL));
CREATE TABLE order_settlements (
 order_id UUID PRIMARY KEY REFERENCES publishing_orders(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 points INTEGER NOT NULL CHECK(points>=0), agreement_revision INTEGER NOT NULL CHECK(agreement_revision>=0),
 ledger_id UUID UNIQUE, settled_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(ledger_id,order_id) REFERENCES point_changes(id,returned_order_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CHECK((points=0 AND ledger_id IS NULL) OR (points>0 AND ledger_id IS NOT NULL AND agreement_revision>0))
);
CREATE FUNCTION check_order_settlement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target UUID; s order_settlements; d publication_deliveries; c point_changes; end_time TIMESTAMPTZ;
BEGIN
 IF TG_TABLE_NAME='point_changes' THEN target=NEW.returned_order_id;
 ELSIF TG_TABLE_NAME='support_tickets' THEN target=NEW.publishing_order_id;
 ELSE target=NEW.order_id; END IF;
 IF target IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO s FROM order_settlements WHERE order_id=target;
 IF NOT FOUND THEN
  IF TG_TABLE_NAME='point_changes' THEN
   IF NEW.kind='ORDER_RETURN' AND NEW.actor_kind='SYSTEM' THEN RAISE EXCEPTION 'automatic return requires final settlement receipt'; END IF;
  END IF;
  RETURN NULL;
 END IF;
 SELECT * INTO d FROM publication_deliveries WHERE order_id=target;
 end_time=LEAST(d.completed_at,d.closed_at AT TIME ZONE 'UTC');
 IF d.status NOT IN ('COMPLETED','CLOSED') OR end_time IS NULL OR clock_timestamp()<end_time+INTERVAL '72 hours'
 OR s.agreement_revision<>d.agreement_revision OR s.points<>d.agreed_return_points
 OR EXISTS(SELECT 1 FROM support_tickets WHERE publishing_order_id=target AND status='PROCESSING') THEN RAISE EXCEPTION 'order is not final and settled'; END IF;
 IF s.points>0 THEN
  SELECT * INTO c FROM point_changes WHERE id=s.ledger_id;
  IF c.id IS NULL OR c.returned_order_id<>target OR c.granted_delta+c.funded_delta<>s.points OR c.return_agreement_revision<>s.agreement_revision OR d.settled_ledger_id IS DISTINCT FROM c.id THEN RAISE EXCEPTION 'settlement must reference its actual order return'; END IF;
 END IF;
 RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER final_settlement_graph AFTER INSERT ON order_settlements DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_order_settlement();
CREATE CONSTRAINT TRIGGER final_settlement_delivery_graph AFTER UPDATE ON publication_deliveries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_order_settlement();
CREATE CONSTRAINT TRIGGER final_settlement_ticket_graph AFTER INSERT OR UPDATE ON support_tickets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_order_settlement();
CREATE CONSTRAINT TRIGGER final_settlement_credit_graph AFTER INSERT ON point_changes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_order_settlement();
CREATE FUNCTION preserve_order_settlement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'final order settlement is immutable'; END; $$;
CREATE TRIGGER final_settlement_immutable BEFORE UPDATE OR DELETE ON order_settlements FOR EACH ROW EXECUTE FUNCTION preserve_order_settlement();
COMMIT;
