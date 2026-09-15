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

/** Lock one account-owned change without blocking foreign-key KEY SHARE checks.
 * All accounts use UUID order; only the changed subject needs NO KEY UPDATE.
 * Call before wallet work. Other actors only need stable role/status reads.
 */
export async function lockAgencyChangeActors(
  tx: Prisma.TransactionClient,
  ids: string[],
  subjectId: string,
) {
  const actors: Array<{ id: string; role: string; status: string }> = [];
  for (const id of [...new Set(ids)].sort()) {
    const rows =
      id === subjectId
        ? await tx.$queryRaw<
            Array<{ id: string; role: string; status: string }>
          >`SELECT id,role,status FROM accounts WHERE id=CAST(${id} AS UUID) FOR NO KEY UPDATE`
        : await tx.$queryRaw<
            Array<{ id: string; role: string; status: string }>
          >`SELECT id,role,status FROM accounts WHERE id=CAST(${id} AS UUID) FOR SHARE`;
    actors.push(...rows);
  }
  return actors;
}
