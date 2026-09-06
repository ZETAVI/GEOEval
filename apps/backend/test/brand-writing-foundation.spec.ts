import { describe, expect, it } from "vitest";

import {
  EMPTY_ARTICLE_INFORMATION,
  normalizeArticleInformation,
  normalizeCharacteristics,
  writingContextFingerprint,
} from "../src/brand/domain/brand-profile.js";

describe("Brand writing foundation", () => {
  it("keeps server-owned characteristic IDs across reorder and detail edits", () => {
    const original = normalizeCharacteristics([
      { title: "安静办公" },
      { title: "精品手冲" },
    ]);
    const updated = normalizeCharacteristics(
      [original[1]!, { ...original[0]!, detail: "提供安静座位与稳定网络" }],
      original,
    );

    expect(updated.map((item) => item.id)).toEqual([
      original[1]!.id,
      original[0]!.id,
    ]);
    expect(updated[1]).toMatchObject({
      title: "安静办公",
      detail: "提供安静座位与稳定网络",
    });
  });

  it("rejects client-invented or duplicated characteristic IDs", () => {
    const original = normalizeCharacteristics([{ title: "安静办公" }]);
    expect(() =>
      normalizeCharacteristics(
        [
          {
            id: "00000000-0000-4000-8000-000000000999",
            title: "精品手冲",
          },
        ],
        original,
      ),
    ).toThrow("品牌特色标识无效");
    expect(() =>
      normalizeCharacteristics(
        [original[0]!, { ...original[0]!, title: "精品手冲" }],
        original,
      ),
    ).toThrow("品牌特色标识不能重复");
  });

  it("normalizes strict Article Information and validates the RMB range", () => {
    expect(
      normalizeArticleInformation({
        price: { mode: "RANGE", minimum: 28, maximum: 68 },
        suitableAudienceContexts: [" 需要安静办公的顾客 "],
        supplementalBackground: " 团队持有专业咖啡师认证 ",
        desiredPositioning: [" 本地精品咖啡代表 "],
      }),
    ).toEqual({
      price: { mode: "RANGE", minimum: 28, maximum: 68 },
      suitableAudienceContexts: ["需要安静办公的顾客"],
      supplementalBackground: "团队持有专业咖啡师认证",
      desiredPositioning: ["本地精品咖啡代表"],
    });
    expect(() =>
      normalizeArticleInformation({
        ...EMPTY_ARTICLE_INFORMATION,
        price: { mode: "RANGE", minimum: 68, maximum: 28 },
      }),
    ).toThrow("最高价不能低于最低价");
  });

  it("changes the Writer fingerprint only when Writer-used meaning changes", () => {
    const characteristics = normalizeCharacteristics([
      { title: "安静办公" },
      { title: "精品手冲" },
    ]);
    const baseline = writingContextFingerprint(
      "a".repeat(64),
      characteristics,
      EMPTY_ARTICLE_INFORMATION,
    );
    const reordered = writingContextFingerprint(
      "a".repeat(64),
      [...characteristics].reverse(),
      EMPTY_ARTICLE_INFORMATION,
    );
    const withDetail = writingContextFingerprint(
      "a".repeat(64),
      [
        { ...characteristics[0]!, detail: "提供安静座位与稳定网络" },
        characteristics[1]!,
      ],
      EMPTY_ARTICLE_INFORMATION,
    );

    expect(reordered).toBe(baseline);
    expect(withDetail).not.toBe(baseline);
  });
});
