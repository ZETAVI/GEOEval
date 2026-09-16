import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
@Injectable()
export class CommissionLedgerAccess {
  projection() {
    return Prisma.sql`SELECT order_id,agent_account_id,rate_bps,funded_points,amount_fen,created_at FROM agency_commissions`;
  }
  read(tx: Prisma.TransactionClient, orderId: string) {
    return tx.agencyCommission.findUnique({ where: { orderId } });
  }
  async record(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      agentAccountId: string;
      rateBps: number;
      fundedPoints: number;
      amountFen: bigint;
    },
  ) {
    await tx.agencyCommission.createMany({ data: input, skipDuplicates: true });
    return tx.agencyCommission.findUniqueOrThrow({
      where: { orderId: input.orderId },
    });
  }
}
