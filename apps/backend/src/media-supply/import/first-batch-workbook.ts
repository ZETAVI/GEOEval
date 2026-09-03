import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { posix } from "node:path";

import { strFromU8, unzipSync, type Unzipped } from "fflate";
import { XMLParser } from "fast-xml-parser";

import { normalizeMediaName } from "../domain/media-supply-normalization.js";
import {
  MEDIA_CATEGORIES,
  type MediaCategory,
  type MediaPlatformFields,
  type MediaResourceFields,
  type MediaSupplierFields,
} from "../domain/media-supply.types.js";

export const FIRST_BATCH_IMPORT_VERSION = "media-supply-first-batch@1";
export const FIRST_BATCH_INPUT_SHA256 =
  "2b071c88a94b962e1f8331df400e4ee9a7ca220510b849e7469ccc3f100dc8e9";
export const FIRST_BATCH_SHEET_NAME = "媒体平台维护台账";

const UUID_NAMESPACE = "a43039a0-68cb-5da2-8b5b-2fd7246ba7aa";
const EXPECTED_HEADERS = [
  "层级",
  "Logo",
  "媒体平台",
  "平台别名",
  "平台分类",
  "国内/海外",
  "官方主页",
  "平台简介",
  "目录状态",
  "客户积分价",
  "Logo核验",
  "Logo来源",
  "当前供给来源（供应商）",
  "供给来源状态",
  "资源名称",
  "具体账号/频道（可空）",
  "发布方式",
  "资源状态",
  "客户展示方式",
  "内部质量档次",
  "案例链接",
  "采购价（内部）",
  "发文备注（内部）",
  "源表定位",
  "管理员状态",
] as const;

const APPROVED_OVERSEAS_CATEGORIES: Readonly<
  Record<string, readonly MediaCategory[]>
> = {
  [normalizeMediaName("Reuters")]: ["PORTAL_MEDIA"],
  [normalizeMediaName("AP News")]: ["PORTAL_MEDIA"],
  [normalizeMediaName("Yahoo Finance")]: ["PORTAL_MEDIA", "VERTICAL_MEDIA"],
  [normalizeMediaName("Business Insider")]: ["VERTICAL_MEDIA"],
  [normalizeMediaName("USA Today")]: ["PORTAL_MEDIA"],
  [normalizeMediaName("StreetInsider")]: ["VERTICAL_MEDIA"],
};

const CATEGORY_BY_LEDGER_TOKEN: Readonly<Record<string, MediaCategory>> = {
  央媒: "CENTRAL_MEDIA",
  门户: "PORTAL_MEDIA",
  地方: "LOCAL_MEDIA",
  垂直: "VERTICAL_MEDIA",
  内容平台: "CONTENT_PLATFORM",
};

const XML_OPTIONS = {
  ignoreAttributes: false,
  removeNSPrefix: true,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
} as const;

export interface FirstBatchPlatform extends MediaPlatformFields {
  id: string;
  normalizedName: string;
  sourceRow: number;
}

export interface FirstBatchSupplier extends MediaSupplierFields {
  id: string;
  normalizedName: string;
  sourceRows: number[];
}

export interface FirstBatchResource extends MediaResourceFields {
  id: string;
  platformNormalizedName: string;
  supplierNormalizedName: string;
  logicalKeyHash: string;
  sourceRow: number;
}

export interface FirstBatchLogo {
  assetFileName: string;
  assetUrl: string;
  bytes: Uint8Array;
  contentSha256: string;
  platformNormalizedName: string;
  sourceRow: number;
}

export type FirstBatchWarning =
  | {
      code: "SOURCE_LOGICAL_RESOURCE_DUPLICATE";
      keyHash: string;
      sourceRows: number[];
    }
  | {
      code: "CASE_REFERENCE_NOT_HTTPS_SKIPPED";
      sourceRows: number[];
    };

export interface FirstBatchWorkbook {
  assetBundleSha256: string;
  inputSha256: string;
  logos: FirstBatchLogo[];
  platforms: FirstBatchPlatform[];
  resources: FirstBatchResource[];
  skippedStructuralRows: number;
  supplierGroupCount: number;
  suppliers: FirstBatchSupplier[];
  warnings: FirstBatchWarning[];
}

export interface FirstBatchWorkbookProfile {
  expectedHash: string;
  expectedLogoCount: number;
  expectedPlatformCount: number;
  expectedResourceCount: number;
  expectedSheetName: string;
  expectedSupplierCount: number;
  expectedSupplierGroupCount: number;
}

const PRODUCTION_PROFILE: FirstBatchWorkbookProfile = {
  expectedHash: FIRST_BATCH_INPUT_SHA256,
  expectedLogoCount: 40,
  expectedPlatformCount: 40,
  expectedResourceCount: 208,
  expectedSheetName: FIRST_BATCH_SHEET_NAME,
  expectedSupplierCount: 6,
  expectedSupplierGroupCount: 76,
};

export class FirstBatchInputError extends Error {
  constructor(
    readonly code: string,
    readonly sourceRows: number[] = [],
  ) {
    super("The controlled first-batch workbook is invalid");
    this.name = "FirstBatchInputError";
  }
}

export async function parseFirstBatchWorkbook(
  inputPath: string,
): Promise<FirstBatchWorkbook> {
  return parseFirstBatchWorkbookBytes(await readFile(inputPath));
}

export function parseFirstBatchWorkbookBytes(
  input: Uint8Array,
  profile: FirstBatchWorkbookProfile = PRODUCTION_PROFILE,
): FirstBatchWorkbook {
  const inputSha256 = sha256(input);
  if (inputSha256 !== profile.expectedHash) {
    throw new FirstBatchInputError("INPUT_HASH_MISMATCH");
  }

  let archive: Unzipped;
  try {
    archive = unzipSync(input);
  } catch {
    throw new FirstBatchInputError("INPUT_ARCHIVE_INVALID");
  }

  const workbook = parseXmlEntry(archive, "xl/workbook.xml");
  const sheet = onlySheet(workbook, profile.expectedSheetName);
  const relationships = parseRelationships(
    archive,
    "xl/_rels/workbook.xml.rels",
  );
  const sheetTarget = relationships.get(sheet.relationshipId);
  if (!sheetTarget)
    throw new FirstBatchInputError("WORKSHEET_RELATION_MISSING");
  const sheetPath = normalizeArchiveTarget("xl", sheetTarget);
  const worksheet = parseXmlEntry(archive, sheetPath);
  const sharedStrings = readSharedStrings(archive);
  const rows = readWorksheetRows(worksheet, sharedStrings);
  validateHeaders(rows);

  const platforms: FirstBatchPlatform[] = [];
  const supplierGroups: Array<{
    displayName: string;
    normalizedName: string;
    platformNormalizedName: string;
    sourceRow: number;
  }> = [];
  const resources: FirstBatchResource[] = [];
  const skippedCaseReferenceRows: number[] = [];
  let skippedStructuralRows = 0;

  for (const [rowNumber, row] of [...rows.entries()].sort(
    ([left], [right]) => left - right,
  )) {
    if (rowNumber <= 16) continue;
    const level = optionalText(row[0]);
    if (!level) continue;
    if (level.includes("|") || level.includes("｜")) {
      skippedStructuralRows += 1;
      continue;
    }
    if (level === "媒体平台") {
      platforms.push(parsePlatform(row, rowNumber));
      continue;
    }
    if (level === "当前供给来源") {
      supplierGroups.push(parseSupplierGroup(row, rowNumber));
      continue;
    }
    if (level === "发文资源") {
      const parsed = parseResource(row, rowNumber, inputSha256);
      resources.push(parsed.resource);
      if (parsed.skippedCaseReference) skippedCaseReferenceRows.push(rowNumber);
      continue;
    }
    throw new FirstBatchInputError("UNEXPECTED_DATA_ROW", [rowNumber]);
  }

  const platformsByName = uniqueByNormalizedName(
    platforms,
    "DUPLICATE_PLATFORM",
  );
  const supplierGroupPairs = new Map<string, number>();
  for (const group of supplierGroups) {
    if (!platformsByName.has(group.platformNormalizedName)) {
      throw new FirstBatchInputError("SUPPLIER_PLATFORM_MISSING", [
        group.sourceRow,
      ]);
    }
    const pair = ownerPair(group.platformNormalizedName, group.normalizedName);
    const existingRow = supplierGroupPairs.get(pair);
    if (existingRow !== undefined) {
      throw new FirstBatchInputError("SUPPLIER_GROUP_DUPLICATE", [
        existingRow,
        group.sourceRow,
      ]);
    }
    supplierGroupPairs.set(pair, group.sourceRow);
  }

  const suppliers = aggregateSuppliers(supplierGroups);
  const suppliersByName = new Map(
    suppliers.map((supplier) => [supplier.normalizedName, supplier]),
  );
  for (const resource of resources) {
    if (!platformsByName.has(resource.platformNormalizedName)) {
      throw new FirstBatchInputError("RESOURCE_PLATFORM_MISSING", [
        resource.sourceRow,
      ]);
    }
    if (!suppliersByName.has(resource.supplierNormalizedName)) {
      throw new FirstBatchInputError("RESOURCE_SUPPLIER_MISSING", [
        resource.sourceRow,
      ]);
    }
    const pair = ownerPair(
      resource.platformNormalizedName,
      resource.supplierNormalizedName,
    );
    if (!supplierGroupPairs.has(pair)) {
      throw new FirstBatchInputError("RESOURCE_SUPPLIER_GROUP_MISSING", [
        resource.sourceRow,
      ]);
    }
  }
  const resourcePairs = new Set(
    resources.map((resource) =>
      ownerPair(
        resource.platformNormalizedName,
        resource.supplierNormalizedName,
      ),
    ),
  );
  for (const [pair, sourceRow] of supplierGroupPairs) {
    if (!resourcePairs.has(pair)) {
      throw new FirstBatchInputError("SUPPLIER_GROUP_EMPTY", [sourceRow]);
    }
  }

  assertCount(
    "PLATFORM_COUNT_MISMATCH",
    platforms.length,
    profile.expectedPlatformCount,
  );
  assertCount(
    "SUPPLIER_GROUP_COUNT_MISMATCH",
    supplierGroups.length,
    profile.expectedSupplierGroupCount,
  );
  assertCount(
    "SUPPLIER_COUNT_MISMATCH",
    suppliers.length,
    profile.expectedSupplierCount,
  );
  assertCount(
    "RESOURCE_COUNT_MISMATCH",
    resources.length,
    profile.expectedResourceCount,
  );

  const logos = readLogos(archive, platforms, profile.expectedLogoCount);
  const warnings: FirstBatchWarning[] = logicalDuplicateWarnings(resources);
  if (skippedCaseReferenceRows.length > 0) {
    warnings.push({
      code: "CASE_REFERENCE_NOT_HTTPS_SKIPPED",
      sourceRows: skippedCaseReferenceRows,
    });
  }
  return {
    assetBundleSha256: sha256(
      Buffer.from(
        logos
          .map((logo) => `${logo.assetUrl}\0${logo.contentSha256}\n`)
          .join(""),
      ),
    ),
    inputSha256,
    logos,
    platforms,
    resources,
    skippedStructuralRows,
    supplierGroupCount: supplierGroups.length,
    suppliers,
    warnings,
  };
}

function parsePlatform(row: unknown[], sourceRow: number): FirstBatchPlatform {
  const displayName = requiredText(row[2], "PLATFORM_NAME_MISSING", sourceRow);
  const normalizedName = normalizeMediaName(displayName);
  const region = requiredText(row[5], "PLATFORM_REGION_MISSING", sourceRow);
  const categories = platformCategories(
    displayName,
    requiredText(row[4], "PLATFORM_CATEGORY_MISSING", sourceRow),
    region,
    sourceRow,
  );
  return {
    id: deterministicUuid(`platform:${normalizedName}`),
    normalizedName,
    sourceRow,
    displayName,
    aliases: splitReviewedList(optionalText(row[3])),
    description: optionalText(row[7]),
    logoUrl: null,
    regionScope:
      region === "国内"
        ? "DOMESTIC"
        : region === "海外"
          ? "OVERSEAS"
          : invalidEnum("PLATFORM_REGION_INVALID", sourceRow),
    status: "INACTIVE",
    pointPrice: 1000,
    categories,
  };
}

function parseSupplierGroup(row: unknown[], sourceRow: number) {
  const platformName = requiredText(
    row[2],
    "SUPPLIER_PLATFORM_MISSING",
    sourceRow,
  );
  const displayName = requiredText(row[12], "SUPPLIER_NAME_MISSING", sourceRow);
  return {
    displayName,
    normalizedName: normalizeMediaName(displayName),
    platformNormalizedName: normalizeMediaName(platformName),
    sourceRow,
  };
}

function parseResource(
  row: unknown[],
  sourceRow: number,
  inputSha256: string,
): { resource: FirstBatchResource; skippedCaseReference: boolean } {
  const platformName = requiredText(
    row[2],
    "RESOURCE_PLATFORM_MISSING",
    sourceRow,
  );
  const supplierName = requiredText(
    row[12],
    "RESOURCE_SUPPLIER_MISSING",
    sourceRow,
  );
  const resourceName = requiredText(
    row[14],
    "RESOURCE_NAME_MISSING",
    sourceRow,
  );
  const accountIdentifier = optionalText(row[15]);
  const publicationMode = requiredText(
    row[16],
    "RESOURCE_MODE_MISSING",
    sourceRow,
  );
  const quality = requiredText(row[19], "RESOURCE_QUALITY_MISSING", sourceRow);
  const procurementCostYuan = requiredInteger(
    row[21],
    "RESOURCE_COST_INVALID",
    sourceRow,
  );
  const platformNormalizedName = normalizeMediaName(platformName);
  const supplierNormalizedName = normalizeMediaName(supplierName);
  const logicalKey = [
    platformNormalizedName,
    normalizeMediaName(resourceName),
    normalizeMediaName(accountIdentifier ?? ""),
  ].join("|");
  const caseReference = optionalHttpsUrl(row[20]);
  return {
    skippedCaseReference: Boolean(optionalText(row[20])) && !caseReference,
    resource: {
      id: deterministicUuid(`resource:${inputSha256}:${sourceRow}`),
      platformId: "",
      supplierId: "",
      platformNormalizedName,
      supplierNormalizedName,
      logicalKeyHash: sha256(Buffer.from(logicalKey)),
      sourceRow,
      resourceName,
      accountIdentifier,
      accountUrl: null,
      publicationMode:
        publicationMode === "首发"
          ? "FIRST_PUBLISH"
          : publicationMode === "转载"
            ? "REPOST"
            : invalidEnum("RESOURCE_MODE_INVALID", sourceRow),
      status: "INACTIVE",
      publicVisibility: "HIDDEN",
      publicAlias: null,
      qualityTier:
        quality === "常规"
          ? "MEDIUM"
          : invalidEnum("RESOURCE_QUALITY_INVALID", sourceRow),
      procurementCostYuan,
      caseUrl: caseReference,
      publicationNotes: optionalText(row[22]),
    },
  };
}

function platformCategories(
  displayName: string,
  classification: string,
  region: string,
  sourceRow: number,
): MediaCategory[] {
  if (region === "海外") {
    const approved =
      APPROVED_OVERSEAS_CATEGORIES[normalizeMediaName(displayName)];
    if (!approved) {
      throw new FirstBatchInputError("OVERSEAS_CATEGORY_MAPPING_MISSING", [
        sourceRow,
      ]);
    }
    return [...approved];
  }
  const selected = new Set<MediaCategory>();
  for (const token of splitReviewedList(classification)) {
    const category = CATEGORY_BY_LEDGER_TOKEN[token];
    if (category) selected.add(category);
  }
  const categories = MEDIA_CATEGORIES.filter((category) =>
    selected.has(category),
  );
  if (categories.length === 0) {
    throw new FirstBatchInputError("PLATFORM_CATEGORY_UNMAPPED", [sourceRow]);
  }
  return categories;
}

function aggregateSuppliers(
  groups: Array<{
    displayName: string;
    normalizedName: string;
    sourceRow: number;
  }>,
): FirstBatchSupplier[] {
  const suppliers = new Map<string, FirstBatchSupplier>();
  for (const group of groups) {
    const existing = suppliers.get(group.normalizedName);
    if (existing) {
      if (existing.displayName !== group.displayName) {
        throw new FirstBatchInputError("SUPPLIER_DISPLAY_NAME_CONFLICT", [
          ...existing.sourceRows,
          group.sourceRow,
        ]);
      }
      existing.sourceRows.push(group.sourceRow);
      continue;
    }
    suppliers.set(group.normalizedName, {
      id: deterministicUuid(`supplier:${group.normalizedName}`),
      normalizedName: group.normalizedName,
      sourceRows: [group.sourceRow],
      displayName: group.displayName,
      contactName: null,
      contactMethod: null,
      status: "INACTIVE",
      notes: null,
    });
  }
  return [...suppliers.values()].sort((left, right) =>
    left.normalizedName.localeCompare(right.normalizedName, "zh-CN"),
  );
}

function readLogos(
  archive: Unzipped,
  platforms: FirstBatchPlatform[],
  expectedLogoCount: number,
): FirstBatchLogo[] {
  const drawing = parseXmlEntry(archive, "xl/drawings/drawing1.xml") as {
    wsDr?: {
      absoluteAnchor?: unknown[];
      oneCellAnchor?: unknown[];
      twoCellAnchor?: unknown[];
    };
  };
  const anchors = asArray(drawing.wsDr?.oneCellAnchor);
  if (
    asArray(drawing.wsDr?.twoCellAnchor).length > 0 ||
    asArray(drawing.wsDr?.absoluteAnchor).length > 0
  ) {
    throw new FirstBatchInputError("LOGO_ANCHOR_SHAPE_INVALID");
  }
  const relationships = parseRelationships(
    archive,
    "xl/drawings/_rels/drawing1.xml.rels",
  );
  assertCount("LOGO_ANCHOR_COUNT_MISMATCH", anchors.length, expectedLogoCount);

  const byRow = new Map<number, { bytes: Uint8Array; sha256: string }>();
  for (const anchor of anchors) {
    const record = anchor as {
      from?: { col?: unknown; row?: unknown };
      pic?: { blipFill?: { blip?: { "@_embed"?: unknown } } };
    };
    const row = integerText(record.from?.row, "LOGO_ANCHOR_INVALID") + 1;
    const column = integerText(record.from?.col, "LOGO_ANCHOR_INVALID");
    if (column !== 1 || byRow.has(row)) {
      throw new FirstBatchInputError("LOGO_ANCHOR_INVALID", [row]);
    }
    const relationshipId = requiredScalar(
      record.pic?.blipFill?.blip?.["@_embed"],
      "LOGO_RELATION_MISSING",
    );
    const target = relationships.get(relationshipId);
    if (!target) {
      throw new FirstBatchInputError("LOGO_RELATION_MISSING", [row]);
    }
    const imagePath = normalizeArchiveTarget("xl/drawings", target);
    const bytes = archive[imagePath];
    if (!bytes || !isPng(bytes)) {
      throw new FirstBatchInputError("LOGO_PNG_INVALID", [row]);
    }
    byRow.set(row, { bytes, sha256: sha256(bytes) });
  }

  const orderedPlatforms = [...platforms].sort(
    (left, right) => left.sourceRow - right.sourceRow,
  );
  const logos = orderedPlatforms.map((platform, index) => {
    const image = byRow.get(platform.sourceRow);
    if (!image) {
      throw new FirstBatchInputError("PLATFORM_LOGO_MISSING", [
        platform.sourceRow,
      ]);
    }
    const ordinal = String(index + 1).padStart(2, "0");
    const assetFileName = `platform-${ordinal}-${image.sha256.slice(0, 8)}.png`;
    const assetUrl = `/media-logos/first-batch/${assetFileName}`;
    platform.logoUrl = assetUrl;
    return {
      assetFileName,
      assetUrl,
      bytes: image.bytes,
      contentSha256: image.sha256,
      platformNormalizedName: platform.normalizedName,
      sourceRow: platform.sourceRow,
    };
  });
  assertCount("LOGO_COUNT_MISMATCH", logos.length, expectedLogoCount);
  return logos;
}

function logicalDuplicateWarnings(
  resources: FirstBatchResource[],
): FirstBatchWarning[] {
  const groups = new Map<string, FirstBatchResource[]>();
  for (const resource of resources) {
    const group = groups.get(resource.logicalKeyHash) ?? [];
    group.push(resource);
    groups.set(resource.logicalKeyHash, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([keyHash, group]) => ({
      code: "SOURCE_LOGICAL_RESOURCE_DUPLICATE" as const,
      keyHash,
      sourceRows: group
        .map((resource) => resource.sourceRow)
        .sort((a, b) => a - b),
    }));
}

function onlySheet(
  workbook: unknown,
  expectedSheetName: string,
): { name: string; relationshipId: string } {
  const sheets = asArray(
    (workbook as { workbook?: { sheets?: { sheet?: unknown[] } } }).workbook
      ?.sheets?.sheet,
  );
  if (sheets.length !== 1)
    throw new FirstBatchInputError("SHEET_COUNT_INVALID");
  const sheet = sheets[0] as {
    "@_name"?: unknown;
    "@_id"?: unknown;
  };
  const name = requiredScalar(sheet["@_name"], "SHEET_NAME_INVALID");
  if (name !== expectedSheetName) {
    throw new FirstBatchInputError("SHEET_NAME_INVALID");
  }
  return {
    name,
    relationshipId: requiredScalar(sheet["@_id"], "WORKSHEET_RELATION_MISSING"),
  };
}

function readWorksheetRows(
  worksheet: unknown,
  sharedStrings: string[],
): Map<number, unknown[]> {
  const rowRecords = asArray(
    (worksheet as { worksheet?: { sheetData?: { row?: unknown[] } } }).worksheet
      ?.sheetData?.row,
  );
  const rows = new Map<number, unknown[]>();
  for (const record of rowRecords) {
    const row = record as { "@_r"?: unknown; c?: unknown[] };
    const rowNumber = integerText(row["@_r"], "WORKSHEET_ROW_INVALID");
    if (rows.has(rowNumber)) {
      throw new FirstBatchInputError("WORKSHEET_ROW_DUPLICATE", [rowNumber]);
    }
    const values: unknown[] = Array(25).fill(null);
    for (const cellRecord of asArray(row.c)) {
      const cell = cellRecord as {
        "@_r"?: unknown;
        "@_t"?: unknown;
        f?: unknown;
        is?: unknown;
        v?: unknown;
      };
      if (cell.f !== undefined && rowNumber >= 16) {
        throw new FirstBatchInputError("FORMULA_CELL_FORBIDDEN", [rowNumber]);
      }
      const reference = requiredScalar(cell["@_r"], "WORKSHEET_CELL_INVALID");
      const column = columnIndex(reference);
      if (column < 0 || column >= 25) continue;
      values[column] = cellValue(cell, sharedStrings, rowNumber);
    }
    rows.set(rowNumber, values);
  }
  return rows;
}

function cellValue(
  cell: { "@_t"?: unknown; is?: unknown; v?: unknown },
  sharedStrings: string[],
  rowNumber: number,
): unknown {
  const type = optionalScalar(cell["@_t"]);
  if (type === "inlineStr") return textNode(cell.is);
  if (type === "s") {
    const index = integerText(cell.v, "SHARED_STRING_INDEX_INVALID");
    const value = sharedStrings[index];
    if (value === undefined) {
      throw new FirstBatchInputError("SHARED_STRING_INDEX_INVALID", [
        rowNumber,
      ]);
    }
    return value;
  }
  if (type === "b") return optionalScalar(cell.v) === "1";
  if (type && type !== "n" && type !== "str") {
    throw new FirstBatchInputError("CELL_TYPE_UNSUPPORTED", [rowNumber]);
  }
  const raw = optionalScalar(cell.v);
  if (raw === null) return null;
  if (type === "str") return raw;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    throw new FirstBatchInputError("NUMERIC_CELL_INVALID", [rowNumber]);
  }
  return numeric;
}

function readSharedStrings(archive: Unzipped): string[] {
  if (!archive["xl/sharedStrings.xml"]) return [];
  const parsed = parseXmlEntry(archive, "xl/sharedStrings.xml") as {
    sst?: { si?: unknown[] };
  };
  return asArray(parsed.sst?.si).map((item) => textNode(item));
}

function validateHeaders(rows: Map<number, unknown[]>): void {
  const header = rows.get(16);
  if (!header || header.length < EXPECTED_HEADERS.length) {
    throw new FirstBatchInputError("HEADER_ROW_MISSING", [16]);
  }
  for (let index = 0; index < EXPECTED_HEADERS.length; index += 1) {
    if (header[index] !== EXPECTED_HEADERS[index]) {
      throw new FirstBatchInputError("HEADER_MISMATCH", [16]);
    }
  }
}

function parseRelationships(
  archive: Unzipped,
  entryPath: string,
): Map<string, string> {
  const parsed = parseXmlEntry(archive, entryPath) as {
    Relationships?: { Relationship?: unknown[] };
  };
  const result = new Map<string, string>();
  for (const item of asArray(parsed.Relationships?.Relationship)) {
    const relationship = item as {
      "@_Id"?: unknown;
      "@_Target"?: unknown;
    };
    const id = requiredScalar(relationship["@_Id"], "RELATION_INVALID");
    const target = requiredScalar(relationship["@_Target"], "RELATION_INVALID");
    if (result.has(id)) throw new FirstBatchInputError("RELATION_DUPLICATE");
    result.set(id, target);
  }
  return result;
}

function parseXmlEntry(archive: Unzipped, entryPath: string): unknown {
  const bytes = archive[entryPath];
  if (!bytes) throw new FirstBatchInputError("ARCHIVE_ENTRY_MISSING");
  const xml = strFromU8(bytes).replace(/^\uFEFF/, "");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new FirstBatchInputError("XML_DOCTYPE_FORBIDDEN");
  }
  try {
    return new XMLParser(XML_OPTIONS).parse(xml);
  } catch {
    throw new FirstBatchInputError("XML_INVALID");
  }
}

function normalizeArchiveTarget(base: string, target: string): string {
  const withoutLeadingSlash = target.replace(/^\/+/, "");
  const normalized = target.startsWith("/")
    ? posix.normalize(withoutLeadingSlash)
    : posix.normalize(posix.join(base, withoutLeadingSlash));
  if (normalized.startsWith("../") || normalized.includes("/../")) {
    throw new FirstBatchInputError("ARCHIVE_TARGET_INVALID");
  }
  return normalized;
}

function requiredText(value: unknown, code: string, sourceRow: number): string {
  const parsed = optionalText(value);
  if (!parsed) throw new FirstBatchInputError(code, [sourceRow]);
  return parsed;
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function optionalHttpsUrl(value: unknown): string | null {
  const text = optionalText(value);
  if (!text) return null;
  try {
    if (new URL(text).protocol !== "https:") throw new Error("protocol");
  } catch {
    return null;
  }
  return text;
}

function requiredInteger(
  value: unknown,
  code: string,
  sourceRow: number,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new FirstBatchInputError(code, [sourceRow]);
  }
  return value;
}

function splitReviewedList(value: string | null): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(/[；;]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function uniqueByNormalizedName<
  T extends { normalizedName: string; sourceRow: number },
>(values: T[], code: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    const existing = result.get(value.normalizedName);
    if (existing) {
      throw new FirstBatchInputError(code, [
        existing.sourceRow,
        value.sourceRow,
      ]);
    }
    result.set(value.normalizedName, value);
  }
  return result;
}

function deterministicUuid(name: string): string {
  const namespace = Buffer.from(UUID_NAMESPACE.replaceAll("-", ""), "hex");
  const digest = createHash("sha1")
    .update(namespace)
    .update(Buffer.from(name, "utf8"))
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function ownerPair(platform: string, supplier: string): string {
  return `${platform}\0${supplier}`;
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isPng(value: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((byte, index) => value[index] === byte);
}

function textNode(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const record = value as { "#text"?: unknown; t?: unknown; r?: unknown[] };
  if (typeof record["#text"] === "string") return record["#text"];
  if (record.t !== undefined) return textNode(record.t);
  return asArray(record.r)
    .map((run) => textNode(run))
    .join("");
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function requiredScalar(value: unknown, code: string): string {
  const parsed = optionalScalar(value);
  if (parsed === null) throw new FirstBatchInputError(code);
  return parsed;
}

function optionalScalar(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return null;
}

function integerText(value: unknown, code: string): number {
  const parsed = Number(requiredScalar(value, code));
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FirstBatchInputError(code);
  }
  return parsed;
}

function columnIndex(reference: string): number {
  const match = /^([A-Z]+)\d+$/.exec(reference);
  if (!match) throw new FirstBatchInputError("WORKSHEET_CELL_INVALID");
  let value = 0;
  for (const character of match[1]!) {
    value = value * 26 + character.charCodeAt(0) - 64;
  }
  return value - 1;
}

function invalidEnum(code: string, sourceRow: number): never {
  throw new FirstBatchInputError(code, [sourceRow]);
}

function assertCount(code: string, actual: number, expected: number): void {
  if (actual !== expected) throw new FirstBatchInputError(code);
}
