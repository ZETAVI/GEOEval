import { z } from "zod";
import type { NativeRecoveryService } from "./native-recovery.service.js";

const inputSchema = z
  .object({
    accountId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

type AcceptanceRuntime = Pick<
  NativeRecoveryService,
  "create" | "read" | "cancel" | "runOrder"
>;

export type WechatPrepayCloseEvidence = Readonly<{
  orderId: string;
  merchantOrderNo: string;
  amountYuan: 1;
  fundedPoints: 10;
  status: "CLOSED";
  provider: "WECHAT";
  method: "WECHAT_NATIVE";
  qrResponseVerified: true;
  drivenOperations: number;
}>;

/**
 * Controlled provider acceptance through the normal persisted order runtime.
 * It never exposes the QR and never calls a provider gateway directly.
 */
export async function runWechatPrepayCloseAcceptance(
  runtime: AcceptanceRuntime,
  raw: unknown,
): Promise<WechatPrepayCloseEvidence> {
  const input = inputSchema.parse(raw);
  const order = await runtime.create(input.accountId, {
    amountYuan: 1,
    idempotencyKey: input.idempotencyKey,
    method: "WECHAT_NATIVE",
  });
  if (
    order.amountYuan !== 1 ||
    order.fundedPoints !== 10 ||
    order.provider !== "WECHAT" ||
    order.method !== "WECHAT_NATIVE"
  )
    throw new Error("RECHARGE_ACCEPTANCE_ORDER_MISMATCH");
  if (order.status === "CLOSED")
    throw new Error("RECHARGE_ACCEPTANCE_ALREADY_CLOSED");
  if (order.status === "SUCCESSFUL")
    throw new Error("RECHARGE_ACCEPTANCE_UNEXPECTED_PAYMENT");

  let snapshot = await runtime.read(input.accountId, order.id),
    drivenOperations = 0;
  for (let step = 0; step < 4 && !snapshot?.qr; step++) {
    const result = await runtime.runOrder(order.id);
    drivenOperations += result.claimed;
    if (result.failed) throw new Error("RECHARGE_ACCEPTANCE_PROVIDER_FAILURE");
    snapshot = await runtime.read(input.accountId, order.id);
    if (snapshot?.order.status === "SUCCESSFUL")
      throw new Error("RECHARGE_ACCEPTANCE_UNEXPECTED_PAYMENT");
    if (snapshot?.reviewRequired)
      throw new Error("RECHARGE_ACCEPTANCE_REVIEW_REQUIRED");
    if (!result.claimed && !snapshot?.qr)
      throw new Error("RECHARGE_ACCEPTANCE_RECOVERY_REQUIRED");
  }
  if (!snapshot?.qr) throw new Error("RECHARGE_ACCEPTANCE_QR_NOT_VERIFIED");

  await runtime.cancel(input.accountId, order.id);
  for (let step = 0; step < 4; step++) {
    snapshot = await runtime.read(input.accountId, order.id);
    if (snapshot?.order.status === "CLOSED")
      return {
        orderId: order.id,
        merchantOrderNo: order.merchantOrderNo,
        amountYuan: 1,
        fundedPoints: 10,
        status: "CLOSED",
        provider: "WECHAT",
        method: "WECHAT_NATIVE",
        qrResponseVerified: true,
        drivenOperations,
      };
    if (snapshot?.order.status === "SUCCESSFUL")
      throw new Error("RECHARGE_ACCEPTANCE_UNEXPECTED_PAYMENT");
    if (snapshot?.reviewRequired)
      throw new Error("RECHARGE_ACCEPTANCE_REVIEW_REQUIRED");
    const result = await runtime.runOrder(order.id);
    drivenOperations += result.claimed;
    if (result.failed) throw new Error("RECHARGE_ACCEPTANCE_PROVIDER_FAILURE");
    if (!result.claimed)
      throw new Error("RECHARGE_ACCEPTANCE_RECOVERY_REQUIRED");
  }
  throw new Error("RECHARGE_ACCEPTANCE_RECOVERY_REQUIRED");
}
