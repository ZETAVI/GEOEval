-- Additive only. No use of the new enum value before this migration commits.
ALTER TYPE "NotificationKind" ADD VALUE 'RECHARGE_SUCCESSFUL';
CREATE TABLE recharge_notification_deliveries (
  order_id UUID PRIMARY KEY REFERENCES recharge_orders(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_attempt_at TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMPTZ(3),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_error VARCHAR(32),
  CONSTRAINT recharge_notification_state CHECK (COALESCE((
    (delivered_at IS NOT NULL AND next_attempt_at IS NULL AND last_error IS NULL) OR
    (delivered_at IS NULL AND next_attempt_at IS NOT NULL AND (last_error IS NULL OR last_error = 'TEMPORARY')) OR
    (delivered_at IS NULL AND next_attempt_at IS NULL AND last_error = 'SOURCE_CONFLICT')
  ), FALSE)),
  CONSTRAINT recharge_notification_time CHECK (delivered_at IS NULL OR delivered_at >= created_at)
);
CREATE INDEX recharge_notification_due_idx ON recharge_notification_deliveries(next_attempt_at, order_id);
CREATE FUNCTION protect_recharge_notification_delivery() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.delivered_at IS NOT NULL OR NEW.next_attempt_at IS NULL OR NEW.last_error IS NOT NULL OR NEW.failure_count <> 0) THEN
    RAISE EXCEPTION 'RECHARGE_NOTIFICATION_INITIAL_STATE';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'RECHARGE_NOTIFICATION_DELETE_FORBIDDEN';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.created_at IS DISTINCT FROM OLD.created_at OR
    NEW.failure_count < OLD.failure_count OR
    (OLD.delivered_at IS NOT NULL AND NEW IS DISTINCT FROM OLD) OR
    (OLD.last_error = 'SOURCE_CONFLICT' AND NEW IS DISTINCT FROM OLD)
  ) THEN
    RAISE EXCEPTION 'RECHARGE_NOTIFICATION_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER recharge_notification_immutable BEFORE INSERT OR UPDATE OR DELETE ON recharge_notification_deliveries
FOR EACH ROW EXECUTE FUNCTION protect_recharge_notification_delivery();
CREATE FUNCTION check_recharge_notification_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM recharge_orders o JOIN point_changes p ON p.id = o.ledger_id
    WHERE o.id = NEW.order_id AND o.status = 'SUCCESSFUL' AND p.kind = 'RECHARGE'
      AND p.recharge_order_id = o.id AND p.account_id = o.account_id) THEN
    RAISE EXCEPTION 'RECHARGE_NOTIFICATION_SOURCE_INVALID';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER recharge_notification_source AFTER INSERT ON recharge_notification_deliveries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_recharge_notification_source();
