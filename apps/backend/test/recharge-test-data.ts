/** Only for the supplied isolated integration database. Immutable facts use TRUNCATE in tests. */
export const rechargeTestTruncate =
  "TRUNCATE recharge_notification_deliveries, recharge_operation_attempts, publication_work_audits, publication_work_items, publication_delivery_audits, publication_deliveries, recharge_notification_receipts, recharge_payment_observations, recharge_credit_reservations, recharge_orders, point_changes";
