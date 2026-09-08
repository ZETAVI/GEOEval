import { describe, expect, it } from "vitest";
import { normalizeWriterResult } from "../src/geo-optimization/domain/writer.contract.js";
import { preparedVariantSchema } from "../src/publication-delivery/domain/publication-item.js";

describe("publication preparation and purchased-article boundary", () => {
  it("accepts the complete currently supported core article without a lower hidden limit", () => {
    const article = normalizeWriterResult({
      title: "标".repeat(200),
      bodyMarkdown: "文".repeat(100_000),
    });
    expect(preparedVariantSchema.parse({ mode: "MOCK", ...article })).toEqual({
      mode: "MOCK",
      ...article,
    });
    expect(
      preparedVariantSchema.safeParse({
        mode: "MANUAL",
        ...article,
        bodyMarkdown: `${article.bodyMarkdown}越界`,
      }).success,
    ).toBe(false);
  });
});
