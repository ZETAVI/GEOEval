import type { Prisma } from "../../generated/prisma/client.js";
import type { PointBalance } from "../domain/point-account.js";

export async function lockPointAccount(
  tx: Prisma.TransactionClient,
  accountId: string,
): Promise<PointBalance> {
  await tx.$executeRaw`INSERT INTO point_accounts(account_id,updated_at) VALUES(CAST(${accountId} AS UUID),CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO NOTHING`;
  const [wallet] = await tx.$queryRaw<PointBalance[]>`
    SELECT granted_balance AS "grantedBalance", funded_balance AS "fundedBalance", revision
    FROM point_accounts WHERE account_id=CAST(${accountId} AS UUID) FOR UPDATE
  `;
  if (!wallet) throw new Error("Point account disappeared");
  return wallet;
}
