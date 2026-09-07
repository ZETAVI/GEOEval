import {
  ApiRequestError,
  type PublishingWorkspace,
  type PurchasedTerms,
  type SubmitPublishingOrder,
} from "@geoeval/api-client";

export type PurchaseIntent = {
  actorAccountId: string;
  brandName: string;
  articleTitle: string;
  request: SubmitPublishingOrder;
};
export const purchaseStorageKey = (actor: string) =>
  `geoeval.pending-publishing-purchase.${actor}`;
export function purchaseIntent(
  workspace: PublishingWorkspace,
  actor: string,
  key: string,
): PurchaseIntent {
  const { brand, article, quote, selection } = workspace;
  if (
    !brand ||
    !article ||
    !quote ||
    !selection ||
    quote.problems.length ||
    quote.shortfall ||
    !quote.totalPoints ||
    article.status !== "CONFIRMED" ||
    article.confirmedRevision !== article.revision ||
    quote.articleId !== article.id ||
    quote.articleRevision !== article.revision ||
    quote.selectionRevision !== workspace.selectionRevision
  )
    throw new Error("请保存选择并核对可购买的最新报价");
  const terms: PurchasedTerms = {
    mode: quote.mode,
    packageName: quote.packageName,
    scope: quote.scope,
    lines: quote.lines.map((line) => {
      if (!line.available || !line.unitPoints || !line.totalPoints)
        throw new Error("媒体暂不可购买");
      return {
        ...line,
        unitPoints: line.unitPoints,
        totalPoints: line.totalPoints,
        available: true,
      };
    }),
    quantity: quote.quantity,
    totalPoints: quote.totalPoints,
  };
  return {
    actorAccountId: actor,
    brandName: brand.companyName,
    articleTitle: article.title,
    request: {
      idempotencyKey: key,
      brandId: brand.id,
      articleId: article.id,
      articleRevision: article.revision,
      selectionRevision: workspace.selectionRevision,
      acceptedTerms: terms,
    },
  };
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const positive = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 2147483647;
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
function readableTerms(v: unknown): boolean {
  if (
    !object(v) ||
    !positive(v.quantity) ||
    !positive(v.totalPoints) ||
    !Array.isArray(v.scope) ||
    !Array.isArray(v.lines) ||
    v.scope.length > 200 ||
    v.lines.length > 200
  )
    return false;
  const member = (m: unknown) =>
    object(m) &&
    typeof m.platformId === "string" &&
    uuid.test(m.platformId) &&
    typeof m.displayName === "string";
  return v.mode === "RANDOM"
    ? typeof v.packageName === "string" &&
        v.scope.length > 0 &&
        v.scope.every(member) &&
        !v.lines.length
    : v.mode === "PRECISE" &&
        v.packageName === null &&
        !v.scope.length &&
        v.lines.length > 0 &&
        v.lines.every(
          (l) =>
            member(l) &&
            object(l) &&
            positive(l.quantity) &&
            positive(l.unitPoints) &&
            positive(l.totalPoints) &&
            l.available === true,
        );
}
export function decodePurchase(
  raw: string | null,
  actor: string,
): PurchaseIntent | null {
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (
    object(value) &&
    value.actorAccountId === actor &&
    typeof value.brandName === "string" &&
    typeof value.articleTitle === "string" &&
    object(value.request)
  ) {
    const input = value.request;
    if (
      [input.idempotencyKey, input.brandId, input.articleId].every(
        (v) => typeof v === "string" && uuid.test(v),
      ) &&
      positive(input.articleRevision) &&
      positive(input.selectionRevision) &&
      readableTerms(input.acceptedTerms)
    )
      return value as PurchaseIntent;
  }
  throw new Error(
    "上次购买的核对凭据无法读取，请保留记录并联系管理员核查，不要另行重复购买",
  );
}
export function purchaseRejected(error: unknown) {
  return (
    error instanceof ApiRequestError &&
    ([400, 404, 422].includes(error.status) ||
      (error.status === 409 &&
        [
          "SELECTION_CHANGED",
          "ARTICLE_CHANGED",
          "QUOTE_CHANGED",
          "OFFER_UNAVAILABLE",
          "INSUFFICIENT_POINTS",
          "POINT_LIMIT_EXCEEDED",
        ].includes(error.code ?? "")))
  );
}
