BEGIN;
ALTER TABLE publication_deliveries
  ADD COLUMN exception_reason VARCHAR(320),
  ADD COLUMN agreement_revision INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN resolution_mode VARCHAR(16),
  ADD COLUMN agreed_return_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN resolution_reason VARCHAR(320),
  ADD COLUMN stopped_at TIMESTAMP(3),
  ADD COLUMN closed_at TIMESTAMP(3),
  ADD COLUMN settled_ledger_id UUID,
  DROP CONSTRAINT publication_delivery_responsibility;
ALTER TABLE publication_work_items ADD COLUMN replacement_target JSONB;
ALTER TABLE publication_delivery_audits ADD COLUMN before_resolution JSONB, ADD COLUMN after_resolution JSONB;
ALTER TABLE point_changes
  ADD COLUMN returned_order_id UUID,
  ADD COLUMN original_consumption_id UUID,
  ADD COLUMN return_request JSONB,
  ADD COLUMN return_agreement_revision INTEGER;

CREATE UNIQUE INDEX "point_changes_returned_order_id_key" ON point_changes(returned_order_id);
CREATE UNIQUE INDEX "point_changes_original_consumption_id_key" ON point_changes(original_consumption_id);
CREATE UNIQUE INDEX "point_changes_returned_order_id_account_id_key" ON point_changes(returned_order_id,account_id);
CREATE UNIQUE INDEX "point_change_consumption_identity_key" ON point_changes(id,publishing_order_id,account_id);
CREATE UNIQUE INDEX "point_change_return_identity_key" ON point_changes(id,returned_order_id);
CREATE UNIQUE INDEX "publication_deliveries_settled_ledger_id_key" ON publication_deliveries(settled_ledger_id);
ALTER TABLE point_changes ADD CONSTRAINT point_changes_return_owner_fkey
  FOREIGN KEY(returned_order_id,account_id) REFERENCES publishing_orders(id,account_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE point_changes ADD CONSTRAINT point_changes_original_consumption_fkey
  FOREIGN KEY(original_consumption_id,returned_order_id,account_id)
  REFERENCES point_changes(id,publishing_order_id,account_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE publication_deliveries ADD CONSTRAINT delivery_return_ledger_fkey
  FOREIGN KEY(settled_ledger_id,order_id) REFERENCES point_changes(id,returned_order_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE publication_deliveries ADD CONSTRAINT publication_delivery_responsibility CHECK (
  (status='PENDING_HANDLING' AND assignee_account_id IS NULL AND started_at IS NULL AND published_quantity=0)
  OR (status IN ('PUBLISHING','EXCEPTION_HANDLING') AND assignee_account_id IS NOT NULL)
  OR (status='COMPLETED' AND assignee_account_id IS NOT NULL AND started_at IS NOT NULL AND published_quantity>0)
  OR (status='CLOSED' AND assignee_account_id IS NOT NULL AND stopped_at IS NOT NULL AND closed_at IS NOT NULL)
);
ALTER TABLE publication_deliveries ADD CONSTRAINT delivery_resolution_shape CHECK (
  agreement_revision>=0 AND agreed_return_points>=0
  AND ((agreement_revision=0 AND resolution_mode IS NULL AND resolution_reason IS NULL AND agreed_return_points=0)
    OR (agreement_revision>0 AND resolution_mode IS NOT NULL AND resolution_mode IN ('CONTINUE','TERMINATE') AND resolution_reason IS NOT NULL AND length(trim(resolution_reason))>0))
  AND (stopped_at IS NULL OR (resolution_mode IS NOT NULL AND resolution_mode='TERMINATE' AND status IN ('EXCEPTION_HANDLING','CLOSED')))
  AND ((status='CLOSED' AND closed_at IS NOT NULL AND resolution_mode='TERMINATE' AND agreement_revision>0
         AND (agreed_return_points=0 OR settled_ledger_id IS NOT NULL)) OR (status<>'CLOSED' AND closed_at IS NULL))
  AND (settled_ledger_id IS NULL OR (agreed_return_points>0 AND status IN ('COMPLETED','CLOSED')))
);
ALTER TABLE publication_work_items ADD CONSTRAINT delivery_replacement_shape CHECK (
  replacement_target IS NULL OR (jsonb_typeof(replacement_target)='object'
    AND replacement_target ?& ARRAY['platformId','displayName']
    AND jsonb_typeof(replacement_target->'platformId')='string'
    AND jsonb_typeof(replacement_target->'displayName')='string'
    AND length(replacement_target->>'displayName')>0)
);
ALTER TABLE point_changes DROP CONSTRAINT point_changes_kind_link;
ALTER TABLE point_changes ADD CONSTRAINT point_changes_kind_link CHECK (
  (kind='ADMIN_ADJUSTMENT' AND publishing_order_id IS NULL AND recharge_order_id IS NULL AND returned_order_id IS NULL)
  OR (kind='PUBLISHING_ORDER' AND publishing_order_id IS NOT NULL AND recharge_order_id IS NULL AND returned_order_id IS NULL AND granted_delta<=0 AND funded_delta<=0 AND actor_account_id=account_id)
  OR (kind='RECHARGE' AND publishing_order_id IS NULL AND recharge_order_id IS NOT NULL AND returned_order_id IS NULL AND granted_delta=0 AND funded_delta>0)
  OR (kind='ORDER_RETURN' AND publishing_order_id IS NULL AND recharge_order_id IS NULL AND returned_order_id IS NOT NULL AND granted_delta>=0 AND funded_delta>=0)
);
ALTER TABLE point_changes DROP CONSTRAINT point_changes_actor_and_request;
ALTER TABLE point_changes ADD CONSTRAINT point_changes_actor_and_request CHECK (
  (kind='RECHARGE' AND actor_kind='SYSTEM' AND actor_account_id IS NULL AND idempotency_key IS NULL)
  OR (kind IN ('ADMIN_ADJUSTMENT','PUBLISHING_ORDER','ORDER_RETURN') AND actor_kind='ACCOUNT' AND actor_account_id IS NOT NULL AND idempotency_key IS NOT NULL)
);
ALTER TABLE point_changes ADD CONSTRAINT order_return_fields CHECK (
  (kind='ORDER_RETURN' AND original_consumption_id IS NOT NULL AND jsonb_typeof(return_request)='object'
    AND return_request IS NOT NULL AND return_agreement_revision>0 AND return_agreement_revision IS NOT NULL)
  OR (kind<>'ORDER_RETURN' AND original_consumption_id IS NULL AND return_request IS NULL AND return_agreement_revision IS NULL)
);

-- Validate the final cross-owner graph, not intermediate writes in the one transaction.
CREATE FUNCTION check_publication_return() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target UUID; d publication_deliveries; c point_changes; original point_changes; qty BIGINT;
BEGIN
  IF TG_TABLE_NAME='point_changes' THEN
    target := NEW.returned_order_id;
    IF target IS NULL THEN RETURN NULL; END IF;
  ELSE target := NEW.order_id; END IF;
  SELECT * INTO d FROM publication_deliveries WHERE order_id=target;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order return requires its retained Delivery aggregate'; END IF;
  SELECT (agreement->>'quantity')::BIGINT INTO qty FROM publishing_orders WHERE id=target;
  IF d.status='CLOSED' AND d.published_quantity>=qty THEN
    RAISE EXCEPTION 'Closed order must retain unfulfilled original quantity';
  END IF;
  SELECT * INTO c FROM point_changes WHERE returned_order_id=target;
  IF FOUND THEN
    SELECT * INTO original FROM point_changes WHERE id=c.original_consumption_id;
    IF d.settled_ledger_id IS DISTINCT FROM c.id OR d.agreement_revision IS DISTINCT FROM c.return_agreement_revision
      OR d.agreed_return_points::BIGINT <> c.granted_delta::BIGINT+c.funded_delta
      OR original.kind<>'PUBLISHING_ORDER' OR c.granted_delta::BIGINT > -original.granted_delta::BIGINT
      OR c.funded_delta::BIGINT > -original.funded_delta::BIGINT
      OR (d.resolution_mode='CONTINUE' AND (d.status<>'COMPLETED' OR d.published_quantity<>qty))
      OR (d.resolution_mode='TERMINATE' AND d.status<>'CLOSED') THEN
      RAISE EXCEPTION 'Order return must match original consumption and final Delivery settlement';
    END IF;
  ELSIF d.settled_ledger_id IS NOT NULL THEN
    RAISE EXCEPTION 'Delivery settlement requires its actual order return';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER publication_return_ledger_graph AFTER INSERT ON point_changes
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_publication_return();
CREATE CONSTRAINT TRIGGER publication_return_delivery_graph AFTER INSERT OR UPDATE ON publication_deliveries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_publication_return();

CREATE FUNCTION preserve_order_return_ledger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.kind='ORDER_RETURN' OR (TG_OP='UPDATE' AND NEW.kind='ORDER_RETURN') THEN
    RAISE EXCEPTION 'Order return ledger and recovery request are immutable';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_return_ledger_immutable BEFORE UPDATE OR DELETE ON point_changes
  FOR EACH ROW EXECUTE FUNCTION preserve_order_return_ledger();

CREATE FUNCTION preserve_delivery_stop() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.stopped_at IS NOT NULL AND NEW.stopped_at IS DISTINCT FROM OLD.stopped_at)
    OR (OLD.status='CLOSED' AND NEW.status<>'CLOSED') THEN
    RAISE EXCEPTION 'Stopped or closed fulfilment cannot reopen';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER delivery_stop_is_final BEFORE UPDATE ON publication_deliveries
  FOR EACH ROW EXECUTE FUNCTION preserve_delivery_stop();
COMMIT;
