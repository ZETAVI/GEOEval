import type {
  CustomerMediaPlatform,
  PublishingPackage,
  PublishingSelection,
  PublishingWorkspace,
  SavePublishingSelection,
} from "@geoeval/api-client";

export type SelectionForm = {
  mode: "RANDOM" | "PRECISE";
  packageId: string;
  lines: Array<{ platformId: string; quantity: string }>;
};
export function selectionForm(
  selection: PublishingSelection | null,
): SelectionForm {
  return selection?.intent.mode === "PRECISE"
    ? {
        mode: "PRECISE",
        packageId: "",
        lines: selection.intent.lines.map((line) => ({
          platformId: line.platformId,
          quantity: String(line.quantity),
        })),
      }
    : {
        mode: "RANDOM",
        packageId:
          selection?.intent.mode === "RANDOM" ? selection.intent.packageId : "",
        lines: [],
      };
}
export function selectionInput(
  form: SelectionForm,
  workspace: PublishingWorkspace,
): SavePublishingSelection {
  const article = workspace.article;
  if (
    !article ||
    article.status !== "CONFIRMED" ||
    article.confirmedRevision !== article.revision
  )
    throw new Error("请先保存并确认核心文章");
  let intent: SavePublishingSelection["intent"];
  if (form.mode === "RANDOM") {
    if (!form.packageId) throw new Error("请选择一个随机发布套餐");
    intent = { mode: "RANDOM", packageId: form.packageId };
  } else {
    if (!form.lines.length || form.lines.length > 200)
      throw new Error("请选择 1–200 项媒体");
    intent = {
      mode: "PRECISE",
      lines: form.lines.map((line) => {
        const quantity = Number(line.quantity);
        if (
          !/^\d+$/.test(line.quantity) ||
          !Number.isSafeInteger(quantity) ||
          quantity < 1 ||
          quantity > 2147483647
        )
          throw new Error("每项发布数量必须是有效正整数");
        return { platformId: line.platformId, quantity };
      }),
    };
  }
  return {
    expectedRevision: workspace.selectionRevision,
    articleId: article.id,
    articleRevision: article.revision,
    intent,
  };
}
export function estimatedPoints(
  form: SelectionForm,
  packages: PublishingPackage[],
  prices: Map<string, number>,
): number | null {
  if (form.mode === "RANDOM")
    return (
      packages.find((item) => item.id === form.packageId)?.pointPrice ?? null
    );
  if (!form.lines.length) return null;
  let total = 0;
  for (const line of form.lines) {
    const price = prices.get(line.platformId),
      quantity = Number(line.quantity);
    if (
      price === undefined ||
      !/^\d+$/.test(line.quantity) ||
      quantity < 1 ||
      !Number.isSafeInteger(quantity)
    )
      return null;
    total += price * quantity;
    if (!Number.isSafeInteger(total) || total > 2147483647) return null;
  }
  return total;
}
export function mergeMedia(
  previous: CustomerMediaPlatform[],
  incoming: CustomerMediaPlatform[],
) {
  return [
    ...new Map(
      [...previous, ...incoming].map((item) => [item.id, item]),
    ).values(),
  ];
}
