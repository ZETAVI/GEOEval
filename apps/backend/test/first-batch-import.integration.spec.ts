import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import {
  applyFirstBatchImport,
  FirstBatchOperationError,
  planFirstBatchImport,
  writeFirstBatchReceipt,
} from "../src/media-supply/import/first-batch-import.js";
import { parseFirstBatchWorkbookBytes } from "../src/media-supply/import/first-batch-workbook.js";
import { PostgresMediaSupplyRepository } from "../src/media-supply/infrastructure/postgres-media-supply.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { buildFirstBatchFixture } from "./first-batch-workbook.fixture.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
const temporaryRoots: string[] = [];

describe("controlled first-batch import persistence", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const service = new MediaSupplyService(
    new PostgresMediaSupplyRepository(prisma),
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => clearCustomerData(prisma));
  afterEach(async () => {
    await Promise.all(
      temporaryRoots
        .splice(0)
        .map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  it("plans read-only, applies once, and replays without duplicates", async () => {
    const actor = await prisma.account.create({
      data: { mobile: "+8613900005101", role: "ADMINISTRATOR" },
    });
    const fixture = buildFirstBatchFixture();
    const batch = parseFirstBatchWorkbookBytes(fixture.bytes, fixture.profile);
    const assetRoot = await prepareAssets(batch);

    const beforePlan = await databaseCounts(prisma);
    const plan = await planFirstBatchImport({
      actorAccountId: actor.id,
      assetRoot,
      batch,
      databaseUrl: config.databaseUrl,
      prisma,
    });
    expect(plan).toMatchObject({
      status: "READY",
      counts: {
        platforms: { expected: 1, new: 1, existing: 0, conflicts: 0 },
        suppliers: { expected: 1, new: 1, existing: 0, conflicts: 0 },
        resources: { expected: 1, new: 1, existing: 0, conflicts: 0 },
        logos: { expected: 1, existing: 1, conflicts: 0 },
      },
    });
    expect(plan.confirmation).toMatch(/^[a-f0-9]{64}$/);
    expect(await databaseCounts(prisma)).toEqual(beforePlan);

    const first = await applyFirstBatchImport({
      actorAccountId: actor.id,
      assetRoot,
      batch,
      confirmation: plan.confirmation!,
      databaseUrl: config.databaseUrl,
      prisma,
    });
    expect(first.applied).toEqual({
      audits: 3,
      categoryLinks: 1,
      platforms: 1,
      resources: 1,
      suppliers: 1,
    });
    expect(await databaseCounts(prisma)).toEqual({
      audits: 3,
      categoryLinks: 1,
      platforms: 1,
      resources: 1,
      suppliers: 1,
    });

    const platform = (await service.listAdminPlatforms())[0]!;
    const resource = (await service.listResources(platform.id))[0]!;
    expect(platform).toMatchObject({
      displayName: "Reuters",
      status: "INACTIVE",
      pointPrice: 1000,
      categories: ["PORTAL_MEDIA"],
      logoUrl: batch.logos[0]!.assetUrl,
    });
    expect(resource).toMatchObject({
      status: "INACTIVE",
      publicVisibility: "HIDDEN",
      procurementCostYuan: 123,
      supplier: {
        status: "INACTIVE",
        contactName: null,
        contactMethod: null,
      },
    });
    expect((await service.listCustomerPlatforms({})).items).toEqual([]);
    expect(await service.fulfillmentCandidates(platform.id)).toEqual([]);

    const receiptPath = join(assetRoot, "apply-receipt.json");
    await writeFirstBatchReceipt(receiptPath, first);
    expect((await stat(receiptPath)).mode & 0o777).toBe(0o600);
    const receiptText = await readFile(receiptPath, "utf8");
    expect(receiptText).not.toContain("测试供应商");
    expect(receiptText).not.toContain("测试内部说明");
    expect(receiptText).not.toContain("procurementCostYuan");

    const replayPlan = await planFirstBatchImport({
      actorAccountId: actor.id,
      assetRoot,
      batch,
      databaseUrl: config.databaseUrl,
      prisma,
    });
    expect(replayPlan.confirmation).toBe(plan.confirmation);
    expect(replayPlan.counts).toMatchObject({
      platforms: { new: 0, existing: 1, conflicts: 0 },
      suppliers: { new: 0, existing: 1, conflicts: 0 },
      resources: { new: 0, existing: 1, conflicts: 0 },
    });
    const replay = await applyFirstBatchImport({
      actorAccountId: actor.id,
      assetRoot,
      batch,
      confirmation: plan.confirmation!,
      databaseUrl: config.databaseUrl,
      prisma,
    });
    expect(replay.applied).toEqual({
      audits: 0,
      categoryLinks: 0,
      platforms: 0,
      resources: 0,
      suppliers: 0,
    });
    expect(await databaseCounts(prisma)).toEqual({
      audits: 3,
      categoryLinks: 1,
      platforms: 1,
      resources: 1,
      suppliers: 1,
    });
  });

  it("blocks conflicts and rolls back every write on a database constraint failure", async () => {
    let actor = await prisma.account.create({
      data: { mobile: "+8613900005102", role: "ADMINISTRATOR" },
    });
    const fixture = buildFirstBatchFixture();
    const batch = parseFirstBatchWorkbookBytes(fixture.bytes, fixture.profile);
    const assetRoot = await prepareAssets(batch);
    const initial = await planFirstBatchImport({
      actorAccountId: actor.id,
      assetRoot,
      batch,
      databaseUrl: config.databaseUrl,
      prisma,
    });
    await applyFirstBatchImport({
      actorAccountId: actor.id,
      assetRoot,
      batch,
      confirmation: initial.confirmation!,
      databaseUrl: config.databaseUrl,
      prisma,
    });
    await prisma.mediaPlatform.update({
      where: { normalizedName: batch.platforms[0]!.normalizedName },
      data: { description: "管理员已修改的当前资料" },
    });
    const conflict = await planFirstBatchImport({
      actorAccountId: actor.id,
      assetRoot,
      batch,
      databaseUrl: config.databaseUrl,
      prisma,
    });
    expect(conflict).toMatchObject({
      status: "BLOCKED",
      confirmation: null,
      conflicts: [expect.objectContaining({ code: "PLATFORM_CONFLICT" })],
    });
    await expect(
      applyFirstBatchImport({
        actorAccountId: actor.id,
        assetRoot,
        batch,
        confirmation: initial.confirmation!,
        databaseUrl: config.databaseUrl,
        prisma,
      }),
    ).rejects.toBeInstanceOf(FirstBatchOperationError);
    expect(await databaseCounts(prisma)).toEqual({
      audits: 3,
      categoryLinks: 1,
      platforms: 1,
      resources: 1,
      suppliers: 1,
    });

    await clearCustomerData(prisma);
    actor = await prisma.account.create({
      data: { mobile: "+8613900005103", role: "ADMINISTRATOR" },
    });
    await prisma.mediaPlatform.create({
      data: {
        id: batch.platforms[0]!.id,
        normalizedName: "occupied-import-id",
        displayName: "占用导入标识的平台",
        status: "INACTIVE",
        pointPrice: 1000,
      },
    });
    const idConflict = await planFirstBatchImport({
      actorAccountId: actor.id,
      assetRoot,
      batch,
      databaseUrl: config.databaseUrl,
      prisma,
    });
    expect(idConflict).toMatchObject({
      status: "BLOCKED",
      conflicts: [expect.objectContaining({ code: "PLATFORM_ID_CONFLICT" })],
    });

    await clearCustomerData(prisma);
    actor = await prisma.account.create({
      data: { mobile: "+8613900005104", role: "ADMINISTRATOR" },
    });
    const invalidBatch = structuredClone(batch);
    invalidBatch.resources[0]!.procurementCostYuan = -1;
    const invalidPlan = await planFirstBatchImport({
      actorAccountId: actor.id,
      assetRoot,
      batch: invalidBatch,
      databaseUrl: config.databaseUrl,
      prisma,
    });
    expect(invalidPlan.status).toBe("READY");
    await expect(
      applyFirstBatchImport({
        actorAccountId: actor.id,
        assetRoot,
        batch: invalidBatch,
        confirmation: invalidPlan.confirmation!,
        databaseUrl: config.databaseUrl,
        prisma,
      }),
    ).rejects.toThrow();
    expect(await databaseCounts(prisma)).toEqual({
      audits: 0,
      categoryLinks: 0,
      platforms: 0,
      resources: 0,
      suppliers: 0,
    });
  });
});

async function prepareAssets(
  batch: ReturnType<typeof parseFirstBatchWorkbookBytes>,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "geoeval-issue51-import-"));
  temporaryRoots.push(root);
  const directory = join(root, "media-logos", "first-batch");
  await mkdir(directory, { recursive: true });
  await Promise.all(
    batch.logos.map((logo) =>
      writeFile(join(directory, logo.assetFileName), logo.bytes),
    ),
  );
  return root;
}

async function databaseCounts(prisma: PrismaService) {
  const [platforms, categoryLinks, suppliers, resources, audits] =
    await Promise.all([
      prisma.mediaPlatform.count(),
      prisma.mediaPlatformCategory.count(),
      prisma.mediaSupplier.count(),
      prisma.mediaResource.count(),
      prisma.mediaCatalogAudit.count(),
    ]);
  return { platforms, categoryLinks, suppliers, resources, audits };
}
