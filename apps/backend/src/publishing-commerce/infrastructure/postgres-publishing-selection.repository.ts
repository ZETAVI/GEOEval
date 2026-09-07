import { Inject, Injectable } from "@nestjs/common";
import type { PublishingSelection as StoredSelection } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  publishingIntentSchema,
  SelectionRevisionConflict,
  type PublishingSelectionRepository,
  type SaveSelection,
} from "../domain/publishing-selection.js";

@Injectable()
export class PostgresPublishingSelectionRepository implements PublishingSelectionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async find(accountId: string, brandId: string) {
    const row = await this.prisma.publishingSelection.findFirst({
      where: { accountId, brandId },
    });
    return {
      revision: row?.revision ?? 0,
      selection: row && row.intent !== null ? present(row) : null,
    };
  }
  save(accountId: string, brandId: string, input: SaveSelection) {
    return this.prisma.$transaction(async (tx) => {
      const data = {
        articleId: input.articleId,
        articleRevision: input.articleRevision,
        intent: input.intent,
      };
      if (input.expectedRevision === 0) {
        const created = await tx.publishingSelection.createMany({
          data: [{ accountId, brandId, ...data }],
          skipDuplicates: true,
        });
        if (created.count !== 1) throw new SelectionRevisionConflict();
      } else {
        const changed = await tx.publishingSelection.updateMany({
          where: { accountId, brandId, revision: input.expectedRevision },
          data: { ...data, revision: { increment: 1 } },
        });
        if (changed.count !== 1) throw new SelectionRevisionConflict();
      }
      return present(
        await tx.publishingSelection.findUniqueOrThrow({ where: { brandId } }),
      );
    });
  }
}
function present(row: StoredSelection) {
  return {
    brandId: row.brandId,
    articleId: row.articleId,
    articleRevision: row.articleRevision,
    revision: row.revision,
    intent: publishingIntentSchema.parse(row.intent),
  };
}
