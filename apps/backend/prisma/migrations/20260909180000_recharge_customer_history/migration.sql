-- Covers own-account history and status-filtered keyset pagination; no money or historical facts change.
CREATE INDEX recharge_account_history_idx ON recharge_orders(account_id, created_at, id);
CREATE INDEX recharge_account_status_history_idx ON recharge_orders(account_id, status, created_at, id);
DROP INDEX recharge_orders_account_id_status_idx;
