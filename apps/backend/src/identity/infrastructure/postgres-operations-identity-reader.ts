import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import type { AccountRole, AccountStatus } from "../domain/identity.types.js";

/** Identity-owned, same-transaction role/status facts and ordered account locks. */
@Injectable()
export class PostgresOperationsIdentityReader {
  async lockAccounts(tx: Prisma.TransactionClient, ids: string[]) {
    const unique = [...new Set(ids)].sort();
    return tx.$queryRaw<
      Array<{ id: string; role: AccountRole; status: AccountStatus }>
    >`
      SELECT id, role, status FROM accounts
      WHERE id=ANY(CAST(${unique} AS UUID[])) ORDER BY id FOR SHARE
    `;
  }

  async lockAccountsExclusive(tx: Prisma.TransactionClient, ids: string[]) {
    const unique = [...new Set(ids)].sort();
    return tx.$queryRaw<
      Array<{ id: string; role: AccountRole; status: AccountStatus }>
    >`
      SELECT id, role, status FROM accounts
      WHERE id=ANY(CAST(${unique} AS UUID[])) ORDER BY id FOR UPDATE
    `;
  }
}
