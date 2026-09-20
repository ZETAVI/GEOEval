import { z } from "zod";
import type { NativeCheckoutSnapshot } from "./native-recovery.js";
import type { NativeRecoveryService } from "./native-recovery.service.js";

const prepareInputSchema = z
  .object({
    accountId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

const reconcileInputSchema = z
  .object({
    accountId: z.string().uuid(),
    orderId: z.string().uuid(),
  })
  .strict();

type AcceptanceRuntime = Pick<
  NativeRecoveryService,
  | "create"
  | "read"
  | "grantCashier"
  | "cashierPage"
  | "verify"
  | "runOrder"
  | "runSettlements"
>;

function accepted(snapshot: NativeCheckoutSnapshot | null) {
  if (
    !snapshot ||
    snapshot.order.amountYuan !== 1 ||
    snapshot.order.fundedPoints !== 10 ||
    snapshot.order.provider !== "ALIPAY" ||
    snapshot.order.method !== "ALIPAY_PC"
  )
    throw new Error("RECHARGE_ACCEPTANCE_ORDER_MISMATCH");
  if (snapshot.reviewRequired)
    throw new Error("RECHARGE_ACCEPTANCE_REVIEW_REQUIRED");
  if (snapshot.order.status === "CLOSED")
    throw new Error("RECHARGE_ACCEPTANCE_ORDER_CLOSED");
  return snapshot;
}

/** Creates one normal one-yuan order and prepares its signed official cashier page. */
export async function prepareAlipayPaymentAcceptance(
  runtime: AcceptanceRuntime,
  raw: unknown,
) {
  const input = prepareInputSchema.parse(raw);
  const order = await runtime.create(input.accountId, {
    amountYuan: 1,
    idempotencyKey: input.idempotencyKey,
    method: "ALIPAY_PC",
  });
  if (order.status === "SUCCESSFUL")
    throw new Error("RECHARGE_ACCEPTANCE_ALREADY_PAID");
  if (
    order.amountYuan !== 1 ||
    order.fundedPoints !== 10 ||
    order.provider !== "ALIPAY" ||
    order.method !== "ALIPAY_PC"
  )
    throw new Error("RECHARGE_ACCEPTANCE_ORDER_MISMATCH");

  const grant = await runtime.grantCashier(input.accountId, order.id);
  const cashierHtml = await runtime.cashierPage(input.accountId, order.id);
  const snapshot = accepted(await runtime.read(input.accountId, order.id));
  if (
    !snapshot.cashier ||
    snapshot.cashier.path !== grant.path ||
    snapshot.cashier.expiresAt !== grant.expiresAt ||
    cashierHtml.length < 1
  )
    throw new Error("RECHARGE_ACCEPTANCE_CASHIER_MISMATCH");

  return {
    cashierHtml,
    evidence: {
      orderId: order.id,
      merchantOrderNo: order.merchantOrderNo,
      amountYuan: 1 as const,
      fundedPoints: 10 as const,
      provider: "ALIPAY" as const,
      method: "ALIPAY_PC" as const,
      status: snapshot.order.status,
      paymentExpiresAt: grant.expiresAt,
      cashierPrepared: true as const,
    },
  };
}

/** Drives only the named order plus the normal durable settlement lane. */
export async function reconcileAlipayPaymentAcceptance(
  runtime: AcceptanceRuntime,
  raw: unknown,
) {
  const input = reconcileInputSchema.parse(raw);
  let snapshot = accepted(await runtime.read(input.accountId, input.orderId));
  let settlements = await runtime.runSettlements(10);
  snapshot = accepted(await runtime.read(input.accountId, input.orderId));

  let providerWork = { claimed: 0, failed: 0 };
  if (snapshot.order.status !== "SUCCESSFUL") {
    await runtime.verify(input.accountId, input.orderId);
    providerWork = await runtime.runOrder(input.orderId);
    const next = await runtime.runSettlements(10);
    settlements = {
      applied: settlements.applied + next.applied,
      reviewed: settlements.reviewed + next.reviewed,
      failed: settlements.failed + next.failed,
    };
    snapshot = accepted(await runtime.read(input.accountId, input.orderId));
  }

  if (snapshot.order.status === "SUCCESSFUL" && !snapshot.order.ledgerId)
    throw new Error("RECHARGE_ACCEPTANCE_LEDGER_MISSING");
  return {
    orderId: snapshot.order.id,
    merchantOrderNo: snapshot.order.merchantOrderNo,
    amountYuan: 1 as const,
    fundedPoints: 10 as const,
    provider: "ALIPAY" as const,
    method: "ALIPAY_PC" as const,
    status: snapshot.order.status,
    paidAt: snapshot.order.paidAt,
    creditConfirmedAt: snapshot.order.creditConfirmedAt,
    ledgerId: snapshot.order.ledgerId,
    providerWork,
    settlements,
  };
}
