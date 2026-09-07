import { z } from "zod";
import type { MediaPlatformQuote } from "../../media-supply/domain/media-supply.types.js";
import type { PublishingPackageView } from "./publishing-package.js";
import { MAX_POINTS } from "./point-account.js";

const uuid = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
const positive = z.number().int().min(1).max(MAX_POINTS);
export const publishingIntentSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("RANDOM"), packageId: uuid }).strict(),
  z
    .object({
      mode: z.literal("PRECISE"),
      lines: z
        .array(z.object({ platformId: uuid, quantity: positive }).strict())
        .min(1)
        .max(200)
        .refine(
          (lines) =>
            new Set(lines.map((line) => line.platformId)).size === lines.length,
          "媒体不能重复",
        )
        .transform((lines) =>
          [...lines].sort((a, b) => a.platformId.localeCompare(b.platformId)),
        ),
    })
    .strict(),
]);
export const saveSelectionSchema = z
  .object({
    expectedRevision: z
      .number()
      .int()
      .min(0)
      .max(MAX_POINTS - 1),
    articleId: uuid,
    articleRevision: positive,
    intent: publishingIntentSchema,
  })
  .strict();
export type PublishingIntent = z.infer<typeof publishingIntentSchema>;
export type SaveSelection = z.infer<typeof saveSelectionSchema>;
export type PublishingSelection = Omit<SaveSelection, "expectedRevision"> & {
  brandId: string;
  revision: number;
};
export type PublishingArticle = {
  id: string;
  title: string;
  revision: number;
  status: "DRAFT" | "CONFIRMED";
  confirmedRevision: number | null;
};
export type PublishingQuoteLine = {
  platformId: string;
  displayName: string;
  quantity: number;
  unitPoints: number | null;
  totalPoints: number | null;
  available: boolean;
};
export type PublishingQuote = {
  selectionRevision: number;
  articleId: string;
  articleRevision: number;
  mode: PublishingIntent["mode"];
  packageName: string | null;
  scope: Array<{ platformId: string; displayName: string }>;
  lines: PublishingQuoteLine[];
  quantity: number;
  totalPoints: number | null;
  shortfall: number | null;
  suggestedRechargeYuan: number | null;
  problems: Array<
    | "ARTICLE_CHANGED"
    | "ARTICLE_UNCONFIRMED"
    | "OFFER_UNAVAILABLE"
    | "TOTAL_OUT_OF_RANGE"
  >;
};

/** Current observation only; final purchase must recompute within its transaction. */
export function quoteSelection(
  selection: PublishingSelection,
  article: PublishingArticle | null,
  offer: PublishingPackageView | null,
  media: MediaPlatformQuote[],
  balance: number,
): PublishingQuote {
  const problems: PublishingQuote["problems"] = [];
  if (
    !article ||
    article.status !== "CONFIRMED" ||
    article.confirmedRevision !== article.revision
  )
    problems.push("ARTICLE_UNCONFIRMED");
  else if (
    article.id !== selection.articleId ||
    article.revision !== selection.articleRevision
  )
    problems.push("ARTICLE_CHANGED");
  let quantity = 0,
    totalPoints: number | null = 0;
  const quotes = new Map(media.map((item) => [item.platformId, item]));
  let scope: PublishingQuote["scope"] = [],
    lines: PublishingQuoteLine[] = [];
  if (selection.intent.mode === "RANDOM") {
    quantity = offer?.quantity ?? 0;
    totalPoints = offer?.pointPrice ?? null;
    scope = (offer?.platformIds ?? []).map((id) => ({
      platformId: id,
      displayName: quotes.get(id)?.displayName ?? "已不可用媒体",
    }));
    if (
      !offer ||
      offer.status !== "ACTIVE" ||
      !offer.platformIds.some((id) => quotes.get(id)?.buyable)
    )
      problems.push("OFFER_UNAVAILABLE");
  } else {
    lines = selection.intent.lines.map((line) => {
      const item = quotes.get(line.platformId);
      const unitPoints = item?.pointPrice ?? null;
      const product = unitPoints === null ? null : unitPoints * line.quantity;
      return {
        ...line,
        displayName: item?.displayName ?? "已移除媒体",
        unitPoints,
        totalPoints:
          product !== null &&
          Number.isSafeInteger(product) &&
          product <= MAX_POINTS
            ? product
            : null,
        available: item?.buyable === true,
      };
    });
    quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
    if (lines.some((line) => !line.available))
      problems.push("OFFER_UNAVAILABLE");
    if (lines.some((line) => line.totalPoints === null)) totalPoints = null;
    else totalPoints = lines.reduce((sum, line) => sum + line.totalPoints!, 0);
    if (
      lines.some(
        (line) => line.unitPoints !== null && line.totalPoints === null,
      )
    )
      problems.push("TOTAL_OUT_OF_RANGE");
  }
  if (
    !Number.isSafeInteger(quantity) ||
    quantity > MAX_POINTS ||
    (totalPoints !== null &&
      (!Number.isSafeInteger(totalPoints) || totalPoints > MAX_POINTS))
  ) {
    problems.push("TOTAL_OUT_OF_RANGE");
    totalPoints = null;
  }
  const shortfall =
    totalPoints === null ? null : Math.max(0, totalPoints - balance);
  return {
    selectionRevision: selection.revision,
    articleId: selection.articleId,
    articleRevision: selection.articleRevision,
    mode: selection.intent.mode,
    packageName:
      selection.intent.mode === "RANDOM" ? (offer?.name ?? null) : null,
    scope,
    lines,
    quantity,
    totalPoints,
    shortfall,
    suggestedRechargeYuan:
      shortfall === null ? null : Math.ceil(shortfall / 10),
    problems: [...new Set(problems)],
  };
}
export class SelectionRevisionConflict extends Error {}
export const PUBLISHING_SELECTION_REPOSITORY = Symbol(
  "PUBLISHING_SELECTION_REPOSITORY",
);
export interface PublishingSelectionRepository {
  find(
    accountId: string,
    brandId: string,
  ): Promise<{ revision: number; selection: PublishingSelection | null }>;
  save(
    accountId: string,
    brandId: string,
    input: SaveSelection,
  ): Promise<PublishingSelection>;
}
