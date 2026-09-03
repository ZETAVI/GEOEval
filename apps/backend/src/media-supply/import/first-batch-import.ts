import { createHash } from "node:crypto";
import { chmod, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { Prisma } from "../../generated/prisma/client.js";
import type { PrismaService } from "../../infrastructure/prisma.service.js";
import { normalizeMediaName } from "../domain/media-supply-normalization.js";
import type { MediaCategory } from "../domain/media-supply.types.js";
import {
  FIRST_BATCH_IMPORT_VERSION,
  type FirstBatchLogo,
  type FirstBatchPlatform,
  type FirstBatchResource,
  type FirstBatchSupplier,
  type FirstBatchWarning,
  type FirstBatchWorkbook,
} from "./first-batch-workbook.js";

type ImportClient = PrismaService | Prisma.TransactionClient;

export type FirstBatchEntityType =
  "ACTOR" | "ASSET" | "PLATFORM" | "SUPPLIER" | "RESOURCE";

export interface FirstBatchConflict {
  code: string;
  entityType: FirstBatchEntityType;
  keyHash?: string;
  sourceRows: number[];
}

export interface FirstBatchCount {
  conflicts: number;
  existing: number;
  expected: number;
  new: number;
  skipped: number;
}

export interface FirstBatchPlan {
  actorAccountHash: string;
  assetBundleSha256: string;
  confirmation: string | null;
  conflicts: FirstBatchConflict[];
  counts: {
    categoryLinks: FirstBatchCount;
    logos: FirstBatchCount;
    platforms: FirstBatchCount;
    resources: FirstBatchCount;
    suppliers: FirstBatchCount;
  };
  databaseTargetSha256: string;
  importerVersion: string;
  inputSha256: string;
  skippedStructuralRows: number;
  status: "BLOCKED" | "READY";
  supplierGroupCount: number;
  warnings: FirstBatchWarning[];
}

export type FirstBatchApplyReceipt = Omit<FirstBatchPlan, "status"> & {
  applied: {
    audits: number;
    categoryLinks: number;
    platforms: number;
    resources: number;
    suppliers: number;
  };
  status: "APPLIED";
};

interface AssetVerification {
  conflicts: FirstBatchConflict[];
  validLogoCount: number;
}

interface DatabaseComparison {
  actorConflict: FirstBatchConflict[];
  categoryLinks: FirstBatchCount;
  newPlatforms: FirstBatchPlatform[];
  newResources: Array<
    FirstBatchResource & { platformId: string; supplierId: string }
  >;
  newSuppliers: FirstBatchSupplier[];
  platformCount: FirstBatchCount;
  resourceCount: FirstBatchCount;
  supplierCount: FirstBatchCount;
  conflicts: FirstBatchConflict[];
}

export class FirstBatchOperationError extends Error {
  constructor(
    readonly code: string,
    readonly plan?: FirstBatchPlan,
  ) {
    super("The controlled first-batch operation could not complete");
    this.name = "FirstBatchOperationError";
  }
}

export async function planFirstBatchImport(input: {
  actorAccountId: string;
  assetRoot: string;
  batch: FirstBatchWorkbook;
  databaseUrl: string;
  prisma: PrismaService;
}): Promise<FirstBatchPlan> {
  const assets = await verifyFirstBatchAssets(input.batch, input.assetRoot);
  const database = await compareDatabase(
    input.prisma,
    input.batch,
    input.actorAccountId,
  );
  return publicPlan(input, assets, database);
}

export async function applyFirstBatchImport(input: {
  actorAccountId: string;
  assetRoot: string;
  batch: FirstBatchWorkbook;
  confirmation: string;
  databaseUrl: string;
  prisma: PrismaService;
}): Promise<FirstBatchApplyReceipt> {
  const assets = await verifyFirstBatchAssets(input.batch, input.assetRoot);
  const preflightDatabase = await compareDatabase(
    input.prisma,
    input.batch,
    input.actorAccountId,
  );
  const preflight = publicPlan(input, assets, preflightDatabase);
  assertApplicable(preflight, input.confirmation);

  return input.prisma.$transaction(
    async (tx) => {
      const database = await compareDatabase(
        tx,
        input.batch,
        input.actorAccountId,
      );
      const plan = publicPlan(input, assets, database);
      assertApplicable(plan, input.confirmation);

      if (database.newSuppliers.length > 0) {
        await tx.mediaSupplier.createMany({
          data: database.newSuppliers.map((supplier) => ({
            id: supplier.id,
            normalizedName: supplier.normalizedName,
            displayName: supplier.displayName,
            contactName: supplier.contactName,
            contactMethod: supplier.contactMethod,
            status: supplier.status,
            revision: 1,
            notes: supplier.notes,
          })),
        });
      }
      if (database.newPlatforms.length > 0) {
        await tx.mediaPlatform.createMany({
          data: database.newPlatforms.map((platform) => ({
            id: platform.id,
            normalizedName: platform.normalizedName,
            displayName: platform.displayName,
            aliases: platform.aliases,
            description: platform.description,
            logoUrl: platform.logoUrl,
            regionScope: platform.regionScope,
            status: platform.status,
            pointPrice: platform.pointPrice,
            revision: 1,
          })),
        });
        await tx.mediaPlatformCategory.createMany({
          data: database.newPlatforms.flatMap((platform) =>
            platform.categories.map((category) => ({
              platformId: platform.id,
              category,
            })),
          ),
        });
      }
      if (database.newResources.length > 0) {
        await tx.mediaResource.createMany({
          data: database.newResources.map((resource) => ({
            id: resource.id,
            platformId: resource.platformId,
            supplierId: resource.supplierId,
            resourceName: resource.resourceName,
            accountIdentifier: resource.accountIdentifier,
            accountUrl: resource.accountUrl,
            publicationMode: resource.publicationMode,
            status: resource.status,
            publicVisibility: resource.publicVisibility,
            publicAlias: resource.publicAlias,
            qualityTier: resource.qualityTier,
            procurementCostYuan: resource.procurementCostYuan,
            caseUrl: resource.caseUrl,
            publicationNotes: resource.publicationNotes,
            revision: 1,
          })),
        });
      }

      const reason = `首次媒体数据导入 ${input.batch.inputSha256.slice(0, 12)}`;
      const auditRows = [
        ...database.newPlatforms.map((platform) => ({
          actorAccountId: input.actorAccountId,
          entityType: "PLATFORM",
          entityId: platform.id,
          action: "IMPORT_CREATE",
          reason,
          afterState: toJson({
            ...platform,
            sourceRow: undefined,
            normalizedName: platform.normalizedName,
          }),
        })),
        ...database.newSuppliers.map((supplier) => ({
          actorAccountId: input.actorAccountId,
          entityType: "SUPPLIER",
          entityId: supplier.id,
          action: "IMPORT_CREATE",
          reason,
          afterState: toJson({
            ...supplier,
            sourceRows: undefined,
          }),
        })),
        ...database.newResources.map((resource) => ({
          actorAccountId: input.actorAccountId,
          entityType: "RESOURCE",
          entityId: resource.id,
          action: "IMPORT_CREATE",
          reason,
          afterState: toJson({
            ...resource,
            logicalKeyHash: undefined,
            platformNormalizedName: undefined,
            sourceRow: undefined,
            supplierNormalizedName: undefined,
          }),
        })),
      ];
      if (auditRows.length > 0) {
        await tx.mediaCatalogAudit.createMany({ data: auditRows });
      }

      return {
        ...plan,
        status: "APPLIED" as const,
        applied: {
          audits: auditRows.length,
          categoryLinks: database.categoryLinks.new,
          platforms: database.newPlatforms.length,
          resources: database.newResources.length,
          suppliers: database.newSuppliers.length,
        },
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 60_000,
    },
  );
}

export async function writeFirstBatchReceipt(
  receiptPath: string,
  receipt: FirstBatchApplyReceipt,
): Promise<void> {
  const absolute = resolve(receiptPath);
  const pending = `${absolute}.pending`;
  try {
    await writeFile(pending, `${JSON.stringify(receipt, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await chmod(pending, 0o600);
    await rename(pending, absolute);
  } catch {
    throw new FirstBatchOperationError("RECEIPT_WRITE_FAILED");
  }
}

export function assertFirstBatchReceiptTarget(input: {
  assetRoot: string;
  inputPath: string;
  receiptPath: string;
}): void {
  if (
    !isAbsolute(input.assetRoot) ||
    !isAbsolute(input.inputPath) ||
    !isAbsolute(input.receiptPath)
  ) {
    throw new FirstBatchOperationError("PATH_MUST_BE_ABSOLUTE");
  }
  const assetRoot = resolve(input.assetRoot);
  const inputPath = resolve(input.inputPath);
  const receiptPath = resolve(input.receiptPath);
  if (receiptPath === inputPath || isPathWithin(assetRoot, receiptPath)) {
    throw new FirstBatchOperationError("RECEIPT_TARGET_UNSAFE");
  }
}

export async function verifyFirstBatchAssets(
  batch: FirstBatchWorkbook,
  assetRoot: string,
): Promise<AssetVerification> {
  const root = resolve(assetRoot);
  const expectedNames = new Set(batch.logos.map((logo) => logo.assetFileName));
  const conflicts: FirstBatchConflict[] = [];
  let validLogoCount = 0;
  for (const logo of batch.logos) {
    const absolute = resolve(root, `.${logo.assetUrl}`);
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
      conflicts.push(assetConflict("ASSET_PATH_INVALID", logo));
      continue;
    }
    try {
      const bytes = await readFile(absolute);
      if (sha256(bytes) !== logo.contentSha256) {
        conflicts.push(assetConflict("ASSET_HASH_MISMATCH", logo));
      } else {
        validLogoCount += 1;
      }
    } catch {
      conflicts.push(assetConflict("ASSET_MISSING", logo));
    }
  }

  try {
    const actualNames = (
      await readdir(join(root, "media-logos", "first-batch"), {
        withFileTypes: true,
      })
    )
      .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
      .map((entry) => entry.name);
    if (
      actualNames.length !== expectedNames.size ||
      actualNames.some((name) => !expectedNames.has(name))
    ) {
      conflicts.push({
        code: "ASSET_SET_MISMATCH",
        entityType: "ASSET",
        sourceRows: [],
      });
    }
  } catch {
    conflicts.push({
      code: "ASSET_SET_MISSING",
      entityType: "ASSET",
      sourceRows: [],
    });
  }
  return { conflicts: orderedConflicts(conflicts), validLogoCount };
}

async function compareDatabase(
  client: ImportClient,
  batch: FirstBatchWorkbook,
  actorAccountId: string,
): Promise<DatabaseComparison> {
  const [actor, currentPlatforms, currentSuppliers] = await Promise.all([
    client.account.findUnique({
      where: { id: actorAccountId },
      select: { id: true, role: true },
    }),
    client.mediaPlatform.findMany({
      where: {
        OR: [
          {
            normalizedName: {
              in: batch.platforms.map((platform) => platform.normalizedName),
            },
          },
          { id: { in: batch.platforms.map((platform) => platform.id) } },
        ],
      },
      include: { categories: true },
    }),
    client.mediaSupplier.findMany({
      where: {
        OR: [
          {
            normalizedName: {
              in: batch.suppliers.map((supplier) => supplier.normalizedName),
            },
          },
          { id: { in: batch.suppliers.map((supplier) => supplier.id) } },
        ],
      },
    }),
  ]);

  const conflicts: FirstBatchConflict[] = [];
  const actorConflict =
    actor?.role === "ADMINISTRATOR"
      ? []
      : [
          {
            code: "ACTOR_NOT_ADMINISTRATOR",
            entityType: "ACTOR" as const,
            sourceRows: [],
          },
        ];
  const currentPlatformByName = new Map(
    currentPlatforms.map((platform) => [platform.normalizedName, platform]),
  );
  const currentSupplierByName = new Map(
    currentSuppliers.map((supplier) => [supplier.normalizedName, supplier]),
  );
  const currentPlatformById = new Map(
    currentPlatforms.map((platform) => [platform.id, platform]),
  );
  const currentSupplierById = new Map(
    currentSuppliers.map((supplier) => [supplier.id, supplier]),
  );
  const resolvedPlatformIds = new Map<string, string>();
  const resolvedSupplierIds = new Map<string, string>();
  const newPlatforms: FirstBatchPlatform[] = [];
  const newSuppliers: FirstBatchSupplier[] = [];
  let existingPlatforms = 0;
  let existingSuppliers = 0;
  let platformConflicts = 0;
  let supplierConflicts = 0;

  for (const platform of batch.platforms) {
    const current = currentPlatformByName.get(platform.normalizedName);
    resolvedPlatformIds.set(
      platform.normalizedName,
      current?.id ?? platform.id,
    );
    if (!current) {
      if (currentPlatformById.has(platform.id)) {
        platformConflicts += 1;
        conflicts.push({
          code: "PLATFORM_ID_CONFLICT",
          entityType: "PLATFORM",
          keyHash: keyHash(platform.normalizedName),
          sourceRows: [platform.sourceRow],
        });
      } else {
        newPlatforms.push(platform);
      }
    } else if (samePlatform(current, platform)) {
      existingPlatforms += 1;
    } else {
      platformConflicts += 1;
      conflicts.push({
        code: "PLATFORM_CONFLICT",
        entityType: "PLATFORM",
        keyHash: keyHash(platform.normalizedName),
        sourceRows: [platform.sourceRow],
      });
    }
  }

  for (const supplier of batch.suppliers) {
    const current = currentSupplierByName.get(supplier.normalizedName);
    resolvedSupplierIds.set(
      supplier.normalizedName,
      current?.id ?? supplier.id,
    );
    if (!current) {
      if (currentSupplierById.has(supplier.id)) {
        supplierConflicts += 1;
        conflicts.push({
          code: "SUPPLIER_ID_CONFLICT",
          entityType: "SUPPLIER",
          keyHash: keyHash(supplier.normalizedName),
          sourceRows: supplier.sourceRows,
        });
      } else {
        newSuppliers.push(supplier);
      }
    } else if (sameSupplier(current, supplier)) {
      existingSuppliers += 1;
    } else {
      supplierConflicts += 1;
      conflicts.push({
        code: "SUPPLIER_CONFLICT",
        entityType: "SUPPLIER",
        keyHash: keyHash(supplier.normalizedName),
        sourceRows: supplier.sourceRows,
      });
    }
  }

  const platformIds = [...new Set(resolvedPlatformIds.values())];
  const currentResources = await client.mediaResource.findMany({
    where: {
      OR: [
        { id: { in: batch.resources.map((resource) => resource.id) } },
        { platformId: { in: platformIds } },
      ],
    },
    include: { platform: { select: { normalizedName: true } } },
  });
  const currentResourceById = new Map(
    currentResources.map((resource) => [resource.id, resource]),
  );
  const desiredResourceIds = new Set(
    batch.resources.map((resource) => resource.id),
  );
  const externalLogicalKeys = new Map<string, string[]>();
  for (const resource of currentResources) {
    if (desiredResourceIds.has(resource.id)) continue;
    const logical = resourceLogicalKeyHash(
      resource.platform.normalizedName,
      resource.resourceName,
      resource.accountIdentifier,
    );
    const ids = externalLogicalKeys.get(logical) ?? [];
    ids.push(resource.id);
    externalLogicalKeys.set(logical, ids);
  }

  const newResources: Array<
    FirstBatchResource & { platformId: string; supplierId: string }
  > = [];
  let existingResources = 0;
  let resourceConflicts = 0;
  for (const resource of batch.resources) {
    const platformId = resolvedPlatformIds.get(
      resource.platformNormalizedName,
    )!;
    const supplierId = resolvedSupplierIds.get(
      resource.supplierNormalizedName,
    )!;
    const desired = { ...resource, platformId, supplierId };
    const current = currentResourceById.get(resource.id);
    if (current) {
      if (sameResource(current, desired)) {
        existingResources += 1;
      } else {
        resourceConflicts += 1;
        conflicts.push(resourceConflict("RESOURCE_ID_CONFLICT", resource));
      }
      continue;
    }
    if (externalLogicalKeys.has(resource.logicalKeyHash)) {
      resourceConflicts += 1;
      conflicts.push(
        resourceConflict("RESOURCE_LOGICAL_KEY_CONFLICT", resource),
      );
      continue;
    }
    newResources.push(desired);
  }

  const categoryExpected = batch.platforms.reduce(
    (total, platform) => total + platform.categories.length,
    0,
  );
  const newCategoryLinks = newPlatforms.reduce(
    (total, platform) => total + platform.categories.length,
    0,
  );
  const existingCategoryLinks = batch.platforms
    .filter((platform) => currentPlatformByName.has(platform.normalizedName))
    .filter((platform) =>
      samePlatform(
        currentPlatformByName.get(platform.normalizedName)!,
        platform,
      ),
    )
    .reduce((total, platform) => total + platform.categories.length, 0);

  return {
    actorConflict,
    conflicts: orderedConflicts(conflicts),
    newPlatforms,
    newResources,
    newSuppliers,
    categoryLinks: {
      expected: categoryExpected,
      new: newCategoryLinks,
      existing: existingCategoryLinks,
      conflicts:
        platformConflicts > 0
          ? categoryExpected - newCategoryLinks - existingCategoryLinks
          : 0,
      skipped: 0,
    },
    platformCount: {
      expected: batch.platforms.length,
      new: newPlatforms.length,
      existing: existingPlatforms,
      conflicts: platformConflicts,
      skipped: 0,
    },
    supplierCount: {
      expected: batch.suppliers.length,
      new: newSuppliers.length,
      existing: existingSuppliers,
      conflicts: supplierConflicts,
      skipped: 0,
    },
    resourceCount: {
      expected: batch.resources.length,
      new: newResources.length,
      existing: existingResources,
      conflicts: resourceConflicts,
      skipped: 0,
    },
  };
}

function publicPlan(
  input: {
    actorAccountId: string;
    batch: FirstBatchWorkbook;
    databaseUrl: string;
  },
  assets: AssetVerification,
  database: DatabaseComparison,
): FirstBatchPlan {
  const conflicts = orderedConflicts([
    ...assets.conflicts,
    ...database.actorConflict,
    ...database.conflicts,
  ]);
  const base = {
    actorAccountHash: keyHash(input.actorAccountId),
    assetBundleSha256: input.batch.assetBundleSha256,
    conflicts,
    counts: {
      categoryLinks: database.categoryLinks,
      logos: {
        expected: input.batch.logos.length,
        new: 0,
        existing: assets.validLogoCount,
        conflicts: input.batch.logos.length - assets.validLogoCount,
        skipped: 0,
      },
      platforms: database.platformCount,
      resources: database.resourceCount,
      suppliers: database.supplierCount,
    },
    databaseTargetSha256: databaseTargetHash(input.databaseUrl),
    importerVersion: FIRST_BATCH_IMPORT_VERSION,
    inputSha256: input.batch.inputSha256,
    skippedStructuralRows: input.batch.skippedStructuralRows,
    status: conflicts.length === 0 ? ("READY" as const) : ("BLOCKED" as const),
    supplierGroupCount: input.batch.supplierGroupCount,
    warnings: input.batch.warnings,
  };
  return {
    ...base,
    confirmation:
      base.status === "READY"
        ? sha256(
            Buffer.from(
              stableJson({
                actorAccountHash: base.actorAccountHash,
                assetBundleSha256: base.assetBundleSha256,
                databaseTargetSha256: base.databaseTargetSha256,
                expected: Object.fromEntries(
                  Object.entries(base.counts).map(([key, count]) => [
                    key,
                    count.expected,
                  ]),
                ),
                importerVersion: base.importerVersion,
                inputSha256: base.inputSha256,
                warnings: base.warnings,
              }),
              "utf8",
            ),
          )
        : null,
  };
}

function assertApplicable(plan: FirstBatchPlan, confirmation: string): void {
  if (plan.status !== "READY" || !plan.confirmation) {
    throw new FirstBatchOperationError("PLAN_BLOCKED", plan);
  }
  if (plan.confirmation !== confirmation) {
    throw new FirstBatchOperationError("PLAN_CONFIRMATION_MISMATCH", plan);
  }
}

function samePlatform(
  current: {
    aliases: string[];
    categories: Array<{ category: MediaCategory }>;
    description: string | null;
    displayName: string;
    logoUrl: string | null;
    pointPrice: number | null;
    regionScope: string;
    status: string;
  },
  desired: FirstBatchPlatform,
): boolean {
  return (
    current.displayName === desired.displayName &&
    sameArray(current.aliases, desired.aliases) &&
    current.description === desired.description &&
    current.logoUrl === desired.logoUrl &&
    current.regionScope === desired.regionScope &&
    current.status === desired.status &&
    current.pointPrice === desired.pointPrice &&
    sameSet(
      current.categories.map((entry) => entry.category),
      desired.categories,
    )
  );
}

function sameSupplier(
  current: {
    contactMethod: string | null;
    contactName: string | null;
    displayName: string;
    notes: string | null;
    status: string;
  },
  desired: FirstBatchSupplier,
): boolean {
  return (
    current.displayName === desired.displayName &&
    current.contactName === desired.contactName &&
    current.contactMethod === desired.contactMethod &&
    current.status === desired.status &&
    current.notes === desired.notes
  );
}

function sameResource(
  current: {
    accountIdentifier: string | null;
    accountUrl: string | null;
    caseUrl: string | null;
    platformId: string;
    procurementCostYuan: number | null;
    publicAlias: string | null;
    publicVisibility: string;
    publicationMode: string;
    publicationNotes: string | null;
    qualityTier: string;
    resourceName: string;
    status: string;
    supplierId: string;
  },
  desired: FirstBatchResource & { platformId: string; supplierId: string },
): boolean {
  return (
    current.platformId === desired.platformId &&
    current.supplierId === desired.supplierId &&
    current.resourceName === desired.resourceName &&
    current.accountIdentifier === desired.accountIdentifier &&
    current.accountUrl === desired.accountUrl &&
    current.publicationMode === desired.publicationMode &&
    current.status === desired.status &&
    current.publicVisibility === desired.publicVisibility &&
    current.publicAlias === desired.publicAlias &&
    current.qualityTier === desired.qualityTier &&
    current.procurementCostYuan === desired.procurementCostYuan &&
    current.caseUrl === desired.caseUrl &&
    current.publicationNotes === desired.publicationNotes
  );
}

function resourceLogicalKeyHash(
  platformNormalizedName: string,
  resourceName: string,
  accountIdentifier: string | null,
): string {
  return sha256(
    Buffer.from(
      [
        platformNormalizedName,
        normalizeMediaName(resourceName),
        normalizeMediaName(accountIdentifier ?? ""),
      ].join("|"),
    ),
  );
}

function resourceConflict(
  code: string,
  resource: FirstBatchResource,
): FirstBatchConflict {
  return {
    code,
    entityType: "RESOURCE",
    keyHash: resource.logicalKeyHash,
    sourceRows: [resource.sourceRow],
  };
}

function assetConflict(code: string, logo: FirstBatchLogo): FirstBatchConflict {
  return {
    code,
    entityType: "ASSET",
    keyHash: logo.contentSha256,
    sourceRows: [logo.sourceRow],
  };
}

function orderedConflicts(
  conflicts: FirstBatchConflict[],
): FirstBatchConflict[] {
  return [...conflicts].sort(
    (left, right) =>
      left.entityType.localeCompare(right.entityType) ||
      left.code.localeCompare(right.code) ||
      (left.sourceRows[0] ?? 0) - (right.sourceRows[0] ?? 0),
  );
}

function sameArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sameSet<T extends string>(left: T[], right: T[]): boolean {
  return (
    left.length === right.length && left.every((value) => right.includes(value))
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isPathWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return (
    path === "" ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
  );
}

function keyHash(value: string): string {
  return sha256(Buffer.from(value, "utf8"));
}

function databaseTargetHash(value: string): string {
  try {
    const url = new URL(value);
    const schema = url.searchParams.get("schema");
    return keyHash(
      `${url.protocol}//${url.host}${url.pathname}${schema ? `?schema=${schema}` : ""}`,
    );
  } catch {
    throw new FirstBatchOperationError("DATABASE_URL_INVALID");
  }
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
