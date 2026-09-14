import type { Prisma } from "../../generated/prisma/client.js";
import { lockActiveAgent } from "../../identity/infrastructure/agent-identity-access.js";
import {
  unavailable,
  VISIT_TOKEN,
  visitDigest,
} from "../domain/acquisition.js";

/** Agency's stateless transaction seam; Identity never reads Agency tables itself. */
export function bindAgencyRegistration(tx: Prisma.TransactionClient) {
  return {
    capture: async (challengeId: string, token: string, now: Date) => {
      if (!VISIT_TOKEN.test(token)) unavailable();
      const digest = visitDigest(token);
      await tx.$queryRaw`SELECT token_digest FROM agency_entry_visits
        WHERE token_digest=${digest} FOR UPDATE`;
      const visit = await tx.agencyEntryVisit.findUnique({
        where: { tokenDigest: digest },
      });
      if (!visit || visit.expiresAt <= now) unavailable();
      const link = await tx.agencyEntryLink.findUnique({
        where: { key: visit.entryKey },
      });
      if (!link || !link.active) unavailable();
      // No account is created here. Completion rechecks the locked agent/entry.
      await tx.agencyChallengeAttribution.create({
        data: {
          challengeId,
          entryKey: link.key,
          agentAccountId: link.agentAccountId,
          capturedAt: now,
        },
      });
    },
    admit: async (challengeId: string, accountId: string, now: Date) => {
      const source = await tx.agencyChallengeAttribution.findUnique({
        where: { challengeId },
      });
      if (!source) return;
      if (
        source.agentAccountId &&
        !(await lockActiveAgent(tx, source.agentAccountId))
      )
        unavailable();
      await tx.$queryRaw`SELECT key FROM agency_entry_links WHERE key=${source.entryKey} FOR SHARE`;
      const link = await tx.agencyEntryLink.findUnique({
        where: { key: source.entryKey },
      });
      if (!link?.active || link.agentAccountId !== source.agentAccountId)
        unavailable();
      await tx.agencyCustomerAttribution.create({
        data: {
          accountId,
          agentAccountId: source.agentAccountId,
          entryKey: source.entryKey,
          createdAt: now,
        },
      });
      await tx.agencyAudit.create({
        data: {
          action: "INITIAL_BIND",
          actorAccountId: accountId,
          targetAccountId: accountId,
          agentAccountId: source.agentAccountId,
          entryKey: source.entryKey,
          createdAt: now,
        },
      });
    },
  };
}
