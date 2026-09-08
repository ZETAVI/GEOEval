import type { Prisma } from "../../generated/prisma/client.js";
import { checkPointCapacity } from "../domain/point-account.js";
import { lockPointAccount } from "./point-account-lock.js";

/** Commerce-owned transaction binding. Caller must not perform network I/O or retain it after commit. */
export async function bindRechargePoints(
  tx: Prisma.TransactionClient,
  accountId: string,
) {
  await lockPointAccount(tx, accountId);
  const wallet = () =>
    tx.pointAccount.findUniqueOrThrow({ where: { accountId } });
  const reservation = async (rechargeOrderId: string) => {
    await tx.$queryRaw`SELECT recharge_order_id FROM recharge_credit_reservations WHERE recharge_order_id=CAST(${rechargeOrderId} AS UUID) AND account_id=CAST(${accountId} AS UUID) FOR UPDATE`;
    const r = await tx.rechargeCreditReservation.findUniqueOrThrow({
      where: { rechargeOrderId },
    });
    if (r.accountId !== accountId)
      throw new Error("RECHARGE_RESERVATION_OWNER");
    return r;
  };
  return {
    lockReservation: reservation,
    async reserve(rechargeOrderId: string, points: number) {
      const existing = await tx.rechargeCreditReservation.findUnique({
        where: { rechargeOrderId },
      });
      if (existing) {
        if (existing.accountId !== accountId || existing.points !== points)
          throw new Error("RECHARGE_RESERVATION_CONFLICT");
        return;
      }
      const w = await wallet();
      const next = {
        ...w,
        reservedFundedPoints: w.reservedFundedPoints + points,
        reservedLedgerSlots: w.reservedLedgerSlots + 1,
      };
      if (!Number.isSafeInteger(points) || points <= 0)
        throw new Error("RECHARGE_RESERVATION_AMOUNT");
      checkPointCapacity(next, next);
      await tx.rechargeCreditReservation.create({
        data: { rechargeOrderId, accountId, points },
      });
      await tx.pointAccount.update({
        where: { accountId },
        data: {
          reservedFundedPoints: next.reservedFundedPoints,
          reservedLedgerSlots: next.reservedLedgerSlots,
        },
      });
    },
    async consume(rechargeOrderId: string, points: number) {
      const r = await reservation(rechargeOrderId);
      if (r.points !== points || r.state === "RELEASED")
        throw new Error("RECHARGE_RESERVATION_CONFLICT");
      if (r.state === "CONSUMED")
        return tx.pointChange.findUniqueOrThrow({ where: { rechargeOrderId } });
      const w = await wallet();
      const next = {
        fundedBalance: w.fundedBalance + points,
        grantedBalance: w.grantedBalance,
        revision: w.revision + 1,
        reservedFundedPoints: w.reservedFundedPoints - points,
        reservedLedgerSlots: w.reservedLedgerSlots - 1,
      };
      checkPointCapacity(next, next);
      await tx.pointAccount.update({ where: { accountId }, data: next });
      const ledger = await tx.pointChange.create({
        data: {
          accountId,
          sequence: next.revision,
          kind: "RECHARGE",
          actorKind: "SYSTEM",
          actorAccountId: null,
          idempotencyKey: null,
          rechargeOrderId,
          grantedDelta: 0,
          fundedDelta: points,
          balanceAfter: next.grantedBalance + next.fundedBalance,
          reason: "充值到账",
          businessReference: rechargeOrderId,
        },
      });
      await tx.rechargeCreditReservation.update({
        where: { rechargeOrderId },
        data: { state: "CONSUMED", completedAt: new Date() },
      });
      return ledger;
    },
    async release(rechargeOrderId: string) {
      const r = await reservation(rechargeOrderId);
      if (r.state === "RELEASED") return;
      if (r.state !== "HELD") throw new Error("RECHARGE_RESERVATION_CONFLICT");
      const w = await wallet();
      const reserved = {
        reservedFundedPoints: w.reservedFundedPoints - r.points,
        reservedLedgerSlots: w.reservedLedgerSlots - 1,
      };
      checkPointCapacity(w, reserved);
      await tx.rechargeCreditReservation.update({
        where: { rechargeOrderId },
        data: { state: "RELEASED", completedAt: new Date() },
      });
      await tx.pointAccount.update({ where: { accountId }, data: reserved });
    },
  };
}
