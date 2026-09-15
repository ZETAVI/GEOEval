import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
/** Recharge verifies the reference. Support receives no payment authority or copied payment state. */
@Injectable()
export class RechargeSupportReader {
  async requireOwned(
    tx: Prisma.TransactionClient,
    accountId: string,
    orderId: string,
  ) {
    const row = await tx.rechargeOrder.findUnique({
      where: { id_accountId: { id: orderId, accountId } },
      select: { id: true },
    });
    if (!row)
      throw new NotFoundException("未找到可关联的充值，请核对本人充值 ID");
    return row.id;
  }
}
