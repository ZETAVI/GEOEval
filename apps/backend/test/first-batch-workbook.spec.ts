import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertFirstBatchReceiptTarget,
  verifyFirstBatchAssets,
} from "../src/media-supply/import/first-batch-import.js";
import {
  FirstBatchInputError,
  parseFirstBatchWorkbookBytes,
} from "../src/media-supply/import/first-batch-workbook.js";
import { buildFirstBatchFixture } from "./first-batch-workbook.fixture.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("controlled first-batch workbook", () => {
  it("parses namespace-prefixed OOXML and applies accepted fixed mappings", () => {
    const fixture = buildFirstBatchFixture();
    const batch = parseFirstBatchWorkbookBytes(fixture.bytes, fixture.profile);

    expect(batch).toMatchObject({
      supplierGroupCount: 1,
      skippedStructuralRows: 1,
      platforms: [
        {
          displayName: "Reuters",
          description: "测试（平台）Ａ",
          categories: ["PORTAL_MEDIA"],
          regionScope: "OVERSEAS",
          status: "INACTIVE",
          pointPrice: 1000,
        },
      ],
      suppliers: [
        {
          contactName: null,
          contactMethod: null,
          status: "INACTIVE",
        },
      ],
      resources: [
        {
          status: "INACTIVE",
          publicVisibility: "HIDDEN",
          publicAlias: null,
          qualityTier: "MEDIUM",
          procurementCostYuan: 123,
          caseUrl: null,
          publicationNotes: "测试（内部）Ａ-20",
        },
      ],
      warnings: [
        {
          code: "CASE_REFERENCE_NOT_HTTPS_SKIPPED",
          sourceRows: [20],
        },
      ],
    });
    expect(batch.logos).toHaveLength(1);
    expect(batch.logos[0]?.assetUrl).toMatch(
      /^\/media-logos\/first-batch\/platform-01-[a-f0-9]{8}\.png$/,
    );
  });

  it("reports source duplicates without exposing the row contents", () => {
    const fixture = buildFirstBatchFixture({ duplicateResource: true });
    const batch = parseFirstBatchWorkbookBytes(fixture.bytes, fixture.profile);

    expect(batch.resources).toHaveLength(2);
    expect(batch.warnings).toContainEqual({
      code: "SOURCE_LOGICAL_RESOURCE_DUPLICATE",
      keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      sourceRows: [20, 21],
    });
  });

  it("rejects hash, formula, and fractional-cost changes with safe errors", () => {
    const fixture = buildFirstBatchFixture();
    expect(() =>
      parseFirstBatchWorkbookBytes(fixture.bytes, {
        ...fixture.profile,
        expectedHash: "0".repeat(64),
      }),
    ).toThrowError(
      expect.objectContaining({ code: "INPUT_HASH_MISMATCH", sourceRows: [] }),
    );

    for (const [options, code] of [
      [{ formulaInResource: true }, "FORMULA_CELL_FORBIDDEN"],
      [{ invalidCost: true }, "RESOURCE_COST_INVALID"],
    ] as const) {
      const changed = buildFirstBatchFixture(options);
      try {
        parseFirstBatchWorkbookBytes(changed.bytes, changed.profile);
        throw new Error("expected parse failure");
      } catch (error) {
        expect(error).toBeInstanceOf(FirstBatchInputError);
        expect(error).toMatchObject({ code, sourceRows: [20] });
        expect(String(error)).not.toContain("测试供应商");
        expect(String(error)).not.toContain("测试内部说明");
      }
    }
  });

  it("verifies the exact deployed Logo set and detects a missing asset", async () => {
    const fixture = buildFirstBatchFixture();
    const batch = parseFirstBatchWorkbookBytes(fixture.bytes, fixture.profile);
    const root = await mkdtemp(join(tmpdir(), "geoeval-issue51-assets-"));
    temporaryRoots.push(root);
    const directory = join(root, "media-logos", "first-batch");
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, batch.logos[0]!.assetFileName),
      batch.logos[0]!.bytes,
    );

    expect(await verifyFirstBatchAssets(batch, root)).toEqual({
      conflicts: [],
      validLogoCount: 1,
    });
    await rm(join(directory, batch.logos[0]!.assetFileName));
    expect((await verifyFirstBatchAssets(batch, root)).conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ASSET_MISSING" }),
        expect.objectContaining({ code: "ASSET_SET_MISMATCH" }),
      ]),
    );
  });

  it("keeps receipt writes away from the controlled input and asset root", () => {
    expect(() =>
      assertFirstBatchReceiptTarget({
        assetRoot: "/tmp/issue51/public",
        inputPath: "/tmp/issue51/source.xlsx",
        receiptPath: "/tmp/issue51/source.xlsx",
      }),
    ).toThrowError(expect.objectContaining({ code: "RECEIPT_TARGET_UNSAFE" }));
    expect(() =>
      assertFirstBatchReceiptTarget({
        assetRoot: "/tmp/issue51/public",
        inputPath: "/tmp/issue51/source.xlsx",
        receiptPath: "/tmp/issue51/public/receipt.json",
      }),
    ).toThrowError(expect.objectContaining({ code: "RECEIPT_TARGET_UNSAFE" }));
    expect(() =>
      assertFirstBatchReceiptTarget({
        assetRoot: "relative/public",
        inputPath: "/tmp/issue51/source.xlsx",
        receiptPath: "/tmp/issue51/receipt.json",
      }),
    ).toThrowError(expect.objectContaining({ code: "PATH_MUST_BE_ABSOLUTE" }));
    expect(() =>
      assertFirstBatchReceiptTarget({
        assetRoot: "/tmp/issue51/public",
        inputPath: "/tmp/issue51/source.xlsx",
        receiptPath: "/tmp/issue51/receipts/apply.json",
      }),
    ).not.toThrow();
  });
});
