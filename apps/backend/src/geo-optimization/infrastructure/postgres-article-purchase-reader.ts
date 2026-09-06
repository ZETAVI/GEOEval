import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import type {
  ArticlePurchaseReader,
  ConfirmedPurchaseArticle,
} from "../domain/article-purchase-reader.js";

/** Infrastructure composition only; the caller owns this transaction's lifetime. */
@Injectable()
export class PostgresArticlePurchaseReaderFactory {
  bind(tx: Prisma.TransactionClient): ArticlePurchaseReader {
    return {
      confirmed: async (input) => {
        const rows = await tx.$queryRaw<ConfirmedPurchaseArticle[]>`
        SELECT id, revision, status, confirmed_revision AS "confirmedRevision", title, body_markdown AS "bodyMarkdown"
        FROM core_articles WHERE id=CAST(${input.articleId} AS UUID)
          AND account_id=CAST(${input.accountId} AS UUID) AND brand_id=CAST(${input.brandId} AS UUID)
          AND revision=${input.revision} AND confirmed_revision=${input.revision} AND status='CONFIRMED'
        FOR SHARE
      `;
        return rows[0] ?? null;
      },
    };
  }
}
