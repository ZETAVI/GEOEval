import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";

/** Identity owns minimal contact projection; no sessions or account-governance DTO. */
@Injectable()
export class AgencyCustomerIdentityReader {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  customers(ids: string[]) {
    return this.db.account.findMany({
      where: { id: { in: ids }, role: "TERMINAL_CUSTOMER", status: "ACTIVE" },
      select: { id: true, mobile: true, createdAt: true },
    });
  }
  labels(ids: string[]) {
    return this.db.account.findMany({
      where: { id: { in: ids } },
      select: { id: true, mobile: true },
    });
  }
}

/** Shared ordering with account governance; caller never locks a wallet. */
export function lockAgencyTransferActors(
  tx: Prisma.TransactionClient,
  ids: string[],
) {
  return tx.$queryRaw<Array<{ id: string; role: string; status: string }>>`
    SELECT id,role,status FROM accounts WHERE id=ANY(CAST(${[...new Set(ids)].sort()} AS UUID[])) ORDER BY id FOR UPDATE
  `;
}
