import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";

@Injectable()
export class CommissionEarningsAccess {
  async bookedFen(tx: Prisma.TransactionClient, agentAccountId: string) {
    const [row] = await tx.$queryRaw<Array<{ amountFen: bigint }>>`
      SELECT COALESCE(SUM(amount_fen),0)::bigint AS "amountFen"
      FROM agency_commissions WHERE agent_account_id=${agentAccountId}::uuid
    `;
    return row?.amountFen ?? 0n;
  }
}
