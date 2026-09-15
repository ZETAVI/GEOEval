import { ForbiddenException, Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { lockAgencyActors } from "../../identity/infrastructure/agent-identity-access.js";
import { AgencyPurchaseChanged } from "../domain/commission-terms.js";
/** Agency-owned leaf; does not load services/reports or open a transaction. */
@Injectable()
export class PostgresAgencyPurchaseReader {
  bind(tx: Prisma.TransactionClient) {
    return {
      capture: async (customerId: string) => {
        const discovered = await tx.agencyCustomerAttribution.findUnique({
          where: { accountId: customerId },
        });
        const agentId = discovered?.agentAccountId ?? null;
        const actors = await lockAgencyActors(tx, [
          customerId,
          ...(agentId ? [agentId] : []),
        ]);
        if (
          !actors.some(
            (x) =>
              x.id === customerId &&
              x.role === "TERMINAL_CUSTOMER" &&
              x.status === "ACTIVE",
          )
        )
          throw new ForbiddenException("账号当前不可购买，请重新登录后核对");
        const current = await tx.agencyCustomerAttribution.findUnique({
          where: { accountId: customerId },
        });
        if (
          (current?.agentAccountId ?? null) !== agentId ||
          (current?.revision ?? 0) !== (discovered?.revision ?? 0)
        )
          throw new AgencyPurchaseChanged();
        const agent = actors.find((x) => x.id === agentId);
        const terms = agentId
          ? await tx.agencyCommissionTerms.findUnique({
              where: { agentAccountId: agentId },
            })
          : null;
        return {
          agentAccountId: agentId,
          attributionRevision: current?.revision ?? 0,
          agentActive: agent?.role === "AGENT" && agent.status === "ACTIVE",
          commissionEnabled: terms?.enabled ?? false,
          rateBps: terms?.rateBps ?? null,
          termsRevision: terms?.revision ?? 0,
        };
      },
    };
  }
}
