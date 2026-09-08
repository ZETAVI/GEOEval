import { describe, expect, it } from "vitest";
import {
  MAX_PUBLICATION_QUANTITY,
  PublicationWorkError,
  publicationWorkPage,
  type PublicationCommitment,
} from "../src/publication-delivery/domain/publication-work.js";

const precise = {
  mode: "PRECISE",
  quantity: 5,
  lines: [
    { platformId: "frozen-B", quantity: 2 },
    { platformId: "frozen-A", quantity: 3 },
  ],
} as const;

describe("bounded publication work from the frozen purchase", () => {
  it("returns logical random slots without inventing platforms or results", () => {
    expect(publicationWorkPage({ mode: "RANDOM", quantity: 3 }, 0, 2)).toEqual({
      items: [
        { slot: 1, purchasedPlatformId: null },
        { slot: 2, purchasedPlatformId: null },
      ],
      nextAfterSlot: 2,
    });
  });

  it("preserves frozen precise line order across a platform boundary", () => {
    expect(publicationWorkPage(precise, 1, 3)).toEqual({
      items: [
        { slot: 2, purchasedPlatformId: "frozen-B" },
        { slot: 3, purchasedPlatformId: "frozen-A" },
        { slot: 4, purchasedPlatformId: "frozen-A" },
      ],
      nextAfterSlot: 4,
    });
  });

  it("walks complete pages without gaps, duplicates or a phantom next page", () => {
    const seen: number[] = [];
    let cursor: number | null = 0;
    while (cursor !== null) {
      const page = publicationWorkPage(precise, cursor, 2);
      seen.push(...page.items.map((item) => item.slot));
      cursor = page.nextAfterSlot;
    }
    expect(seen).toEqual([1, 2, 3, 4, 5]);
  });

  it.each([5, 6, MAX_PUBLICATION_QUANTITY])(
    "returns an empty terminal page after slot %i",
    (after) => {
      expect(publicationWorkPage(precise, after, 50)).toEqual({
        items: [],
        nextAfterSlot: null,
      });
    },
  );

  it("computes only the tail page of a maximum-sized random commitment", () => {
    const maximum = MAX_PUBLICATION_QUANTITY;
    expect(
      publicationWorkPage(
        { mode: "RANDOM", quantity: maximum },
        maximum - 2,
        50,
      ),
    ).toEqual({
      items: [
        { slot: maximum - 1, purchasedPlatformId: null },
        { slot: maximum, purchasedPlatformId: null },
      ],
      nextAfterSlot: null,
    });
  });

  it("does not expand maximum-sized precise lines before paginating", () => {
    const maximum = MAX_PUBLICATION_QUANTITY;
    const commitment = {
      mode: "PRECISE",
      quantity: maximum,
      lines: [
        { platformId: "A", quantity: maximum - 1 },
        { platformId: "B", quantity: 1 },
      ],
    } as const;
    expect(publicationWorkPage(commitment, maximum - 2, 50).items).toEqual([
      { slot: maximum - 1, purchasedPlatformId: "A" },
      { slot: maximum, purchasedPlatformId: "B" },
    ]);
  });

  it("supports the existing 200 precise lines without mutating the agreement", () => {
    const commitment = Object.freeze({
      mode: "PRECISE" as const,
      quantity: 2000,
      lines: Object.freeze(
        Array.from({ length: 200 }, (_, i) =>
          Object.freeze({ platformId: `P${i}`, quantity: 10 }),
        ),
      ),
    });
    const before = JSON.stringify(commitment);
    expect(publicationWorkPage(commitment, 1998, 50).items).toEqual([
      { slot: 1999, purchasedPlatformId: "P199" },
      { slot: 2000, purchasedPlatformId: "P199" },
    ]);
    expect(JSON.stringify(commitment)).toBe(before);
  });

  it.each([-1, 0, 1.5, NaN, Infinity, MAX_PUBLICATION_QUANTITY + 1])(
    "rejects an invalid purchased quantity %s",
    (quantity) => {
      expect(() =>
        publicationWorkPage({ mode: "RANDOM", quantity }, 0, 20),
      ).toThrow(PublicationWorkError);
    },
  );

  it.each([
    [-1, 20],
    [0.5, 20],
    [NaN, 20],
    [Infinity, 20],
    [MAX_PUBLICATION_QUANTITY + 1, 20],
    [0, 0],
    [0, -1],
    [0, 51],
    [0, 1.5],
    [0, NaN],
    [0, Infinity],
  ])("rejects invalid cursor/limit %s / %s", (after, limit) => {
    expect(() => publicationWorkPage(precise, after!, limit!)).toThrow(
      expect.objectContaining({ code: "INVALID_WORK_PAGE" }),
    );
  });

  it.each([
    { ...precise, quantity: 6 },
    { ...precise, quantity: 4 },
    { ...precise, lines: [] },
    { ...precise, lines: [{ platformId: "A", quantity: 0 }] },
    { ...precise, lines: [{ platformId: "A", quantity: 1.5 }] },
    { ...precise, lines: [{ platformId: " ", quantity: 5 }] },
    {
      ...precise,
      lines: [
        { platformId: "A", quantity: 2 },
        { platformId: "A", quantity: 3 },
      ],
    },
    {
      mode: "PRECISE",
      quantity: 201,
      lines: Array.from({ length: 201 }, (_, i) => ({
        platformId: `P${i}`,
        quantity: 1,
      })),
    },
    { mode: "UNKNOWN", quantity: 1 },
  ])(
    "rejects corrupt commitments without silently clipping counts",
    (value) => {
      expect(() =>
        publicationWorkPage(value as PublicationCommitment, 0, 20),
      ).toThrow(expect.objectContaining({ code: "INVALID_COMMITMENT" }));
    },
  );
});
