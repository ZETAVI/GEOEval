/** Only for the supplied isolated integration database. Immutable facts use TRUNCATE in tests. */
export const rechargeTestTruncate =
  "TRUNCATE recharge_notification_receipts, recharge_payment_observations, recharge_credit_reservations, recharge_orders, point_changes";
