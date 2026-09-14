import { cleanupAgencyVisits } from "./agency-maintenance-access.js";
import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  lockAgencyActors,
  lockActiveAgent,
} from "../../identity/infrastructure/agent-identity-access.js";
import {
  ACQUISITION_LIFETIME_MS,
  entryKey,
  visitToken,
  visitDigest,
  unavailable,
} from "../domain/acquisition.js";

@Injectable()
export class PostgresAcquisitionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async issueLink(
    actorAccountId: string,
    agentAccountId: string,
    now = new Date(),
  ) {
    return this.prisma.$transaction(async (tx) => {
      const actors = await lockAgencyActors(tx, [
        actorAccountId,
        agentAccountId,
      ]);
      if (
        !actors.some(
          (x) =>
            x.id === actorAccountId &&
            x.role === "ADMINISTRATOR" &&
            x.status === "ACTIVE",
        ) ||
        !actors.some(
          (x) =>
            x.id === agentAccountId &&
            x.role === "AGENT" &&
            x.status === "ACTIVE",
        )
      )
        throw new ForbiddenException("仅管理员可为有效代理商开通入口");
      const candidateKey = entryKey();
      const row = await tx.agencyEntryLink.upsert({
        where: { scope: agentAccountId },
        update: {},
        create: {
          scope: agentAccountId,
          key: candidateKey,
          agentAccountId,
          createdAt: now,
        },
      });
      if (row.key === candidateKey)
        await tx.agencyAudit.create({
          data: {
            action: "CREATE_LINK",
            actorAccountId,
            targetAccountId: agentAccountId,
            agentAccountId,
            entryKey: row.key,
            createdAt: now,
          },
        });
      return { entryKey: row.key };
    });
  }

  async ownLink(agentAccountId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await lockActiveAgent(tx, agentAccountId)))
        throw new ForbiddenException("代理商账号不可用");
      const row = await tx.agencyEntryLink.findUnique({
        where: { scope: agentAccountId },
      });
      return { entryKey: row?.active ? row.key : null };
    });
  }

  async resolve(
    input: { entryKey?: string; visitToken?: string },
    now = new Date(),
  ) {
    // A public homepage read does not allocate an anonymous record.
    return this.prisma.$transaction(async (tx) => {
      let visit = null;
      if (input.visitToken) {
        const digest = visitDigest(input.visitToken);
        await tx.$queryRaw`SELECT token_digest FROM agency_entry_visits WHERE token_digest=${digest} FOR UPDATE`;
        visit = await tx.agencyEntryVisit.findUnique({
          where: { tokenDigest: digest },
        });
        if (visit && visit.expiresAt <= now) visit = null;
      }
      const existing = visit
        ? await tx.agencyEntryLink.findUnique({
            where: { key: visit.entryKey },
          })
        : null;
      if (existing?.agentAccountId) {
        if (
          !existing.active ||
          !(await lockActiveAgent(tx, existing.agentAccountId))
        )
          unavailable();
        return {
          entryKey: existing.key,
          visitToken: input.visitToken!,
          expiresAt: visit!.expiresAt.toISOString(),
        };
      }
      let selected;
      if (input.entryKey) {
        selected = await tx.agencyEntryLink.findUnique({
          where: { key: input.entryKey },
        });
        if (
          !selected?.active ||
          (selected.agentAccountId &&
            !(await lockActiveAgent(tx, selected.agentAccountId)))
        )
          unavailable();
      } else if (existing?.active) selected = existing;
      else
        selected = await tx.agencyEntryLink.upsert({
          where: { scope: "PUBLIC" },
          update: {},
          create: { scope: "PUBLIC", key: entryKey() },
        });
      if (!input.entryKey && !visit)
        return { entryKey: selected.key, visitToken: null, expiresAt: null };
      if (visit && existing?.key === selected.key)
        return {
          entryKey: selected.key,
          visitToken: input.visitToken!,
          expiresAt: visit.expiresAt.toISOString(),
        };
      const expiresAt = new Date(now.getTime() + ACQUISITION_LIFETIME_MS);
      const token = visit ? input.visitToken! : visitToken();
      await tx.agencyEntryVisit.upsert({
        where: { tokenDigest: visitDigest(token) },
        create: {
          tokenDigest: visitDigest(token),
          entryKey: selected.key,
          expiresAt,
          createdAt: now,
        },
        update: { entryKey: selected.key, expiresAt },
      });
      return {
        entryKey: selected.key,
        visitToken: token,
        expiresAt: expiresAt.toISOString(),
      };
    });
  }

  async cleanupExpired(now = new Date(), limit = 500) {
    return this.prisma.$transaction((tx) =>
      cleanupAgencyVisits(tx, now, limit),
    );
  }
}
