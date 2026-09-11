-- Preserve old evidence: NULL means the historical outcome was not classified.
ALTER TABLE recharge_operation_attempts
  ADD COLUMN error_http_status INTEGER,
  ADD COLUMN failure_class VARCHAR(16);

ALTER TABLE recharge_operation_attempts ADD CONSTRAINT recharge_failure_metadata CHECK (
  (error_http_status IS NULL AND failure_class IS NULL)
  OR (result_kind = 'UNRESOLVED' AND finished_at IS NOT NULL AND failure_class IS NOT NULL
    AND failure_class IN ('TEMPORARY','REJECTED','UNKNOWN')
    AND (error_http_status IS NULL OR error_http_status BETWEEN 100 AND 599))
);

CREATE FUNCTION recharge_preserve_failure_metadata() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.finished_at IS NOT NULL AND ROW(NEW.error_http_status,NEW.failure_class)
    IS DISTINCT FROM ROW(OLD.error_http_status,OLD.failure_class) THEN
    RAISE EXCEPTION 'Completed failure metadata is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER recharge_failure_metadata_guard BEFORE UPDATE ON recharge_operation_attempts
  FOR EACH ROW EXECUTE FUNCTION recharge_preserve_failure_metadata();

-- Requeue only identifiable transport uncertainty at the current generation.
-- Old executors skip SLOW_RETRY, so migration does not silently unlock their retry loop.
-- No completed attempt, payment observation, wallet, ledger or reservation is rewritten.
UPDATE recharge_orders o SET native_review_reason='SLOW_RETRY',
  native_next_operation='QUERY', native_next_action_at=CURRENT_TIMESTAMP
WHERE o.status IN ('PENDING_PAYMENT','CONFIRMING')
  AND o.dispatch_state='MAY_EXIST' AND o.review_reason IS NULL
  AND o.native_review_reason='RETRY_EXHAUSTED'
  AND o.native_lease_id IS NULL AND o.native_lease_until IS NULL
  AND EXISTS (
    SELECT 1 FROM recharge_operation_attempts a
    WHERE a.order_id=o.id AND a.generation=o.native_generation
      AND a.result_kind='UNRESOLVED' AND a.finished_at IS NOT NULL
      AND a.diagnostic_code IN ('TRANSPORT','TIMEOUT','RESPONSE_INTERRUPTED')
      AND a.failure_class IS NULL AND a.error_http_status IS NULL
  );
