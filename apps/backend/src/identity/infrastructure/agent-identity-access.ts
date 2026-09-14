import type { Prisma } from "../../generated/prisma/client.js";

/** Identity-owned leaf: shares the caller's transaction, never calls Agency. */
export async function lockAgencyActors(
  tx: Prisma.TransactionClient,
  ids: string[],
) {
  return tx.$queryRaw<Array<{ id: string; role: string; status: string }>>`
    SELECT id, role, status FROM accounts
    WHERE id = ANY(CAST(${[...new Set(ids)].sort()} AS UUID[]))
    ORDER BY id FOR SHARE
  `;
}

export async function lockActiveAgent(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const [row] = await lockAgencyActors(tx, [id]);
  return row?.role === "AGENT" && row.status === "ACTIVE";
}
