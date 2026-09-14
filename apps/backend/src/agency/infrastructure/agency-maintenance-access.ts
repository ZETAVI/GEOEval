import type { Prisma } from "../../generated/prisma/client.js";
/** Called by the existing bounded Identity maintenance lifecycle. */
export async function cleanupAgencyVisits(
  tx: Prisma.TransactionClient,
  now: Date,
  limit: number,
) {
  const expired = await tx.agencyEntryVisit.findMany({
    where: { expiresAt: { lte: now } },
    orderBy: [{ expiresAt: "asc" }, { tokenDigest: "asc" }],
    take: Math.min(Math.max(limit, 1), 500),
    select: { tokenDigest: true },
  });
  return tx.agencyEntryVisit.deleteMany({
    where: {
      tokenDigest: { in: expired.map((x) => x.tokenDigest) },
      expiresAt: { lte: now },
    },
  });
}
