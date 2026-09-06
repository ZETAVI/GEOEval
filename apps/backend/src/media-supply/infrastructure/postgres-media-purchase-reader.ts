import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import type { MediaPurchaseReader } from "../domain/media-purchase-reader.js";
import { platformQuote } from "./postgres-media-supply.repository.js";

/** Locks and reads on the purchase transaction, never a second connection. */
@Injectable()
export class PostgresMediaPurchaseReaderFactory {
  bind(tx: Prisma.TransactionClient): MediaPurchaseReader {
    return {
      platforms: async (ids) => {
        const sortedIds = [...new Set(ids)].sort();
        const rows = await tx.$queryRaw<
          Array<{
            id: string;
            displayName: string;
            status: string;
            pointPrice: number | null;
            revision: number;
          }>
        >`
        SELECT id, display_name AS "displayName", status, point_price AS "pointPrice", revision
        FROM media_platforms WHERE id=ANY(CAST(${sortedIds} AS UUID[])) ORDER BY id FOR SHARE
      `;
        return rows.map(platformQuote);
      },
    };
  }
}
