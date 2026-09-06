import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { BrandService } from "../src/brand/application/brand.service.js";
import { createApiApp } from "../src/api-app.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";
import { EvaluationOptimizationGuidanceService } from "../src/geo-intelligence/application/evaluation-optimization-guidance.service.js";
import { EVALUATION_REPORT_DOCUMENT_VERSION } from "../src/geo-intelligence/domain/evaluation-report.document.js";
import { OVERALL_SYNTHESIS_CONTRACT_VERSION } from "../src/geo-intelligence/domain/overall-synthesis.contract.js";
import { PostgresEvaluationReportRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-report.repository.js";
import { GeoOptimizationService } from "../src/geo-optimization/application/geo-optimization.service.js";
import {
  ActiveArticleGenerationError,
  ArticleGenerationNotRetryableError,
  ArticleReplacementRequiredError,
  ArticleRevisionConflictError,
  EvaluationGuidanceRequiredError,
  GeoOptimizationNotFoundError,
} from "../src/geo-optimization/domain/geo-optimization.errors.js";
import type {
  WriterRequest,
  WriterResult,
} from "../src/geo-optimization/domain/writer.contract.js";
import { buildWriterRequest } from "../src/geo-optimization/domain/writer.contract.js";
import type { CoreArticleWriter } from "../src/geo-optimization/domain/writer.port.js";
import { DeterministicCoreArticleWriter } from "../src/geo-optimization/infrastructure/deterministic-core-article.writer.js";
import {
  ABANDONED_DETERMINISTIC_GENERATION_MS,
  PostgresGeoOptimizationRepository,
} from "../src/geo-optimization/infrastructure/postgres-geo-optimization.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import {
  clearCustomerData,
  readyCoffeeBrandInput,
  TEST_STORE_LOCATION_RECEIPTS,
} from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { browserMutationHeaders } from "./http-test-headers.js";

const config = loadIntegrationApiConfig();

describe("GEO Optimization core article lifecycle", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const brands = new BrandService(
    new PostgresBrandRepository(prisma),
    new BrandReferenceData(),
    TEST_STORE_LOCATION_RECEIPTS,
  );
  const reportRepository = new PostgresEvaluationReportRepository(prisma);
  const guidance = new EvaluationOptimizationGuidanceService(
    brands,
    reportRepository,
  );
  const repository = new PostgresGeoOptimizationRepository(prisma);
  const deterministicWriter = new DeterministicCoreArticleWriter();
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    await prisma.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
  beforeEach(async () => clearCustomerData(prisma));

  it("generates idempotently, confirms an exact revision and returns edits to draft", async () => {
    const context = await createContext();
    const write = vi.fn((request: WriterRequest) =>
      deterministicWriter.write(request),
    );
    const service = optimizationService({ write });

    const generated = await service.generate({
      accountId: context.accountId,
      brandId: context.brand.id,
      idempotencyKey: "generation-one",
      expectedBrandRevision: context.brand.revision,
    });
    expect(generated).toMatchObject({
      status: "SUCCEEDED",
      attemptCount: 1,
      expectedArticleRevision: null,
    });
    const article = await service.currentArticle(
      context.accountId,
      context.brand.id,
    );
    expect(article).toMatchObject({
      status: "DRAFT",
      revision: 1,
      source: {
        generationId: generated.id,
        brandRevision: context.brand.revision,
        evaluationGuidanceId: context.guidanceId,
      },
    });
    const workspace = await service.workspace(context.accountId);
    expect(workspace).toMatchObject({
      brand: { id: context.brand.id, revision: context.brand.revision },
      guidance: { guidanceId: context.guidanceId },
      latestGeneration: { id: generated.id, status: "SUCCEEDED" },
      article: { id: article!.id, revision: article!.revision },
      articleFreshness: {
        brandInformationChanged: false,
        guidanceChanged: false,
      },
    });
    const customerWorkspace = JSON.stringify(workspace);
    for (const protectedField of [
      "writerGuidance",
      "writingContextFingerprint",
      "snapshotId",
      "idempotencyKey",
      "evaluationInputFingerprint",
      "providerPlaceId",
      "contactMobile",
    ]) {
      expect(customerWorkspace).not.toContain(protectedField);
    }

    await expect(
      service.generate({
        accountId: context.accountId,
        brandId: context.brand.id,
        idempotencyKey: "generation-one",
        expectedBrandRevision: context.brand.revision,
      }),
    ).resolves.toEqual(generated);
    expect(write).toHaveBeenCalledTimes(1);
    expect(await prisma.articleGeneration.count()).toBe(1);
    expect(await prisma.writerInputSnapshot.count()).toBe(1);

    const confirmed = await service.confirmArticle({
      accountId: context.accountId,
      brandId: context.brand.id,
      articleId: article!.id,
      expectedRevision: article!.revision,
    });
    expect(confirmed).toMatchObject({
      status: "CONFIRMED",
      revision: 1,
      confirmedRevision: 1,
      confirmedAt: expect.any(Date),
    });
    await expect(
      service.confirmedArticleReference({
        accountId: context.accountId,
        brandId: context.brand.id,
        articleId: confirmed.id,
        revision: confirmed.revision,
      }),
    ).resolves.toEqual({
      accountId: context.accountId,
      brandId: context.brand.id,
      articleId: confirmed.id,
      revision: 1,
    });

    const edited = await service.saveArticle({
      accountId: context.accountId,
      brandId: context.brand.id,
      articleId: confirmed.id,
      expectedRevision: confirmed.revision,
      title: "  用户修订后的核心文章  ",
      bodyMarkdown: "\n# 用户修订后的正文\n",
    });
    expect(edited).toMatchObject({
      title: "用户修订后的核心文章",
      bodyMarkdown: "# 用户修订后的正文",
      status: "DRAFT",
      revision: 2,
      confirmedRevision: null,
      confirmedAt: null,
    });
    await expect(
      service.confirmArticle({
        accountId: context.accountId,
        brandId: context.brand.id,
        articleId: confirmed.id,
        expectedRevision: 1,
      }),
    ).rejects.toBeInstanceOf(ArticleRevisionConflictError);
    await expect(
      service.confirmedArticleReference({
        accountId: context.accountId,
        brandId: context.brand.id,
        articleId: confirmed.id,
        revision: 1,
      }),
    ).rejects.toBeInstanceOf(GeoOptimizationNotFoundError);
    await expect(
      prisma.coreArticle.update({
        where: { id: edited.id },
        data: { bodyMarkdown: "x".repeat(100_001) },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.coreArticle.update({
        where: { id: edited.id },
        data: { status: "CONFIRMED" },
      }),
    ).rejects.toThrow();

    const otherAccount = await prisma.account.create({
      data: { mobile: "+8613900000702" },
    });
    await expect(
      service.currentArticle(otherAccount.id, context.brand.id),
    ).resolves.toBeUndefined();
    await expect(
      service.saveArticle({
        accountId: otherAccount.id,
        brandId: context.brand.id,
        articleId: confirmed.id,
        expectedRevision: edited.revision,
        title: "越权修改",
        bodyMarkdown: "越权正文",
      }),
    ).rejects.toBeInstanceOf(GeoOptimizationNotFoundError);
  });

  it("requires explicit replacement and does not apply a result over a newer edit", async () => {
    const context = await createContext();
    const initialService = optimizationService(deterministicWriter);
    await initialService.generate({
      accountId: context.accountId,
      brandId: context.brand.id,
      idempotencyKey: "initial-generation",
      expectedBrandRevision: context.brand.revision,
    });
    const article = (await initialService.currentArticle(
      context.accountId,
      context.brand.id,
    ))!;

    await expect(
      initialService.generate({
        accountId: context.accountId,
        brandId: context.brand.id,
        idempotencyKey: "replacement-missing",
        expectedBrandRevision: context.brand.revision,
      }),
    ).rejects.toBeInstanceOf(ArticleReplacementRequiredError);

    const deferred = deferredWriterResult();
    const write = vi.fn(() => deferred.promise);
    const replacementService = optimizationService({ write });
    const pending = replacementService.generate({
      accountId: context.accountId,
      brandId: context.brand.id,
      idempotencyKey: "replacement-running",
      expectedBrandRevision: context.brand.revision,
      expectedArticleRevision: article.revision,
    });
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));

    await expect(
      replacementService.generate({
        accountId: context.accountId,
        brandId: context.brand.id,
        idempotencyKey: "second-active-request",
        expectedBrandRevision: context.brand.revision,
        expectedArticleRevision: article.revision,
      }),
    ).rejects.toBeInstanceOf(ActiveArticleGenerationError);

    const edited = await initialService.saveArticle({
      accountId: context.accountId,
      brandId: context.brand.id,
      articleId: article.id,
      expectedRevision: article.revision,
      title: "生成期间保存的新标题",
      bodyMarkdown: "生成期间保存的新正文",
    });
    deferred.resolve({
      title: "本应替换的生成标题",
      bodyMarkdown: "本应替换的生成正文",
    });
    await expect(pending).resolves.toMatchObject({ status: "NOT_APPLIED" });
    await expect(
      initialService.currentArticle(context.accountId, context.brand.id),
    ).resolves.toMatchObject({
      id: article.id,
      revision: edited.revision,
      title: "生成期间保存的新标题",
      bodyMarkdown: "生成期间保存的新正文",
    });
    expect(await prisma.articleGeneration.count()).toBe(2);
    expect(await prisma.writerInputSnapshot.count()).toBe(2);
  });

  it("retries a failed generation with the same frozen Snapshot", async () => {
    const context = await createContext();
    const initialService = optimizationService(deterministicWriter);
    await initialService.generate({
      accountId: context.accountId,
      brandId: context.brand.id,
      idempotencyKey: "successful-baseline",
      expectedBrandRevision: context.brand.revision,
    });
    const baselineArticle = (await initialService.currentArticle(
      context.accountId,
      context.brand.id,
    ))!;
    const requests: WriterRequest[] = [];
    const write = vi.fn(async (request: WriterRequest) => {
      requests.push(request);
      if (requests.length === 1) throw new Error("controlled Writer failure");
      return deterministicWriter.write(request);
    });
    const service = optimizationService({ write });

    const failed = await service.generate({
      accountId: context.accountId,
      brandId: context.brand.id,
      idempotencyKey: "retryable-generation",
      expectedBrandRevision: context.brand.revision,
      expectedArticleRevision: baselineArticle.revision,
    });
    expect(failed).toMatchObject({
      status: "FAILED",
      attemptCount: 1,
      failure: { code: "WRITER_FAILED" },
    });
    await expect(
      service.currentArticle(context.accountId, context.brand.id),
    ).resolves.toMatchObject({
      id: baselineArticle.id,
      revision: baselineArticle.revision,
      title: baselineArticle.title,
    });

    const changedBrand = await brands.update(
      context.accountId,
      context.brand.id,
      {
        expectedRevision: context.brand.revision,
        articleInformation: {
          ...context.brand.articleInformation,
          supplementalBackground: "失败后新保存的品牌背景",
        },
      },
    );
    expect(changedBrand.revision).toBe(context.brand.revision + 1);

    const retried = await service.retry({
      accountId: context.accountId,
      brandId: context.brand.id,
      generationId: failed.id,
    });
    expect(retried).toMatchObject({ status: "SUCCEEDED", attemptCount: 2 });
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
    expect(JSON.stringify(requests[1])).not.toContain("失败后新保存的品牌背景");
    expect(
      await prisma.writerInputSnapshot.count({
        where: { generation: { is: { id: failed.id } } },
      }),
    ).toBe(1);
    await expect(
      service.currentArticle(context.accountId, context.brand.id),
    ).resolves.toMatchObject({
      id: baselineArticle.id,
      revision: baselineArticle.revision + 1,
      source: { brandRevision: context.brand.revision },
    });
    await expect(service.workspace(context.accountId)).resolves.toMatchObject({
      articleFreshness: {
        brandInformationChanged: true,
        guidanceChanged: false,
      },
    });

    const evaluationChangedBrand = await brands.update(
      context.accountId,
      context.brand.id,
      {
        expectedRevision: changedBrand.revision,
        characteristics: [
          {
            ...changedBrand.characteristics[0]!,
            title: "安静办公与会议",
          },
          changedBrand.characteristics[1]!,
        ],
      },
    );
    const newerGuidanceId = await seedAcceptedGuidance(
      context.accountId,
      context.brand.id,
      { evaluationFingerprint: evaluationChangedBrand.evaluationFingerprint },
    );
    await expect(service.workspace(context.accountId)).resolves.toMatchObject({
      guidance: { guidanceId: newerGuidanceId },
      articleFreshness: {
        brandInformationChanged: true,
        guidanceChanged: true,
      },
    });
    await expect(
      service.retry({
        accountId: context.accountId,
        brandId: context.brand.id,
        generationId: failed.id,
      }),
    ).rejects.toBeInstanceOf(ArticleGenerationNotRetryableError);
  });

  it("keeps generation unavailable when no successful guidance exists", async () => {
    const accountId = (
      await prisma.account.create({ data: { mobile: "+8613900000703" } })
    ).id;
    const brand = await brands.create(
      accountId,
      readyCoffeeBrandInput(accountId, {
        companyName: "尚未评测咖啡",
        articleInformation: {
          price: { mode: "NEGOTIABLE" },
          suitableAudienceContexts: ["需要商务交流空间的顾客"],
          supplementalBackground: null,
          desiredPositioning: [],
        },
      }),
    );
    const service = optimizationService(deterministicWriter);

    await expect(service.workspace(accountId)).resolves.toMatchObject({
      brand: { id: brand.id },
      guidance: null,
      article: null,
    });
    await expect(
      service.generate({
        accountId,
        brandId: brand.id,
        idempotencyKey: "missing-guidance",
        expectedBrandRevision: brand.revision,
      }),
    ).rejects.toBeInstanceOf(EvaluationGuidanceRequiredError);
    expect(await prisma.articleGeneration.count()).toBe(0);
    expect(await prisma.writerInputSnapshot.count()).toBe(0);
  });

  it("records an invalid Writer result as a safe retryable failure", async () => {
    const context = await createContext();
    const service = optimizationService({
      write: async () => ({ title: "", bodyMarkdown: "" }),
    });

    await expect(
      service.generate({
        accountId: context.accountId,
        brandId: context.brand.id,
        idempotencyKey: "invalid-writer-result",
        expectedBrandRevision: context.brand.revision,
      }),
    ).resolves.toMatchObject({
      status: "FAILED",
      failure: {
        code: "INVALID_WRITER_RESULT",
        message: "生成结果格式不正确，请重试",
      },
    });
    expect(
      await service.currentArticle(context.accountId, context.brand.id),
    ).toBeUndefined();
  });

  it("observes a recent running execution and recovers an abandoned deterministic attempt", async () => {
    const context = await createContext();
    const brand = await brands.writerPurposeView(
      context.accountId,
      context.brand.id,
    );
    const acceptedGuidance = await guidance.latest(
      context.accountId,
      context.brand.id,
    );
    const preparation = await repository.prepareGeneration({
      accountId: context.accountId,
      brandId: context.brand.id,
      idempotencyKey: "abandoned-generation",
      sourceBrandRevision: brand.revision,
      sourceWritingContextFingerprint: brand.writingContextFingerprint,
      evaluationGuidanceId: acceptedGuidance!.reference.guidanceId,
      evaluationGuidanceRunId: acceptedGuidance!.reference.runId,
      expectedArticleRevision: null,
      writerRequest: buildWriterRequest(brand, acceptedGuidance!),
    });
    expect(preparation.kind).toBe("STARTED");
    const write = vi.fn((request: WriterRequest) =>
      deterministicWriter.write(request),
    );
    const service = optimizationService({ write });

    await expect(
      service.retry({
        accountId: context.accountId,
        brandId: context.brand.id,
        generationId: preparation.generation.id,
      }),
    ).resolves.toMatchObject({ status: "RUNNING", attemptCount: 1 });
    expect(write).not.toHaveBeenCalled();

    await prisma.articleGeneration.update({
      where: { id: preparation.generation.id },
      data: {
        startedAt: new Date(
          Date.now() - ABANDONED_DETERMINISTIC_GENERATION_MS - 1,
        ),
      },
    });
    await expect(
      service.retry({
        accountId: context.accountId,
        brandId: context.brand.id,
        generationId: preparation.generation.id,
      }),
    ).resolves.toMatchObject({ status: "SUCCEEDED", attemptCount: 2 });
    expect(write).toHaveBeenCalledTimes(1);
    expect(await prisma.writerInputSnapshot.count()).toBe(1);
  });

  it("serializes concurrent first-generation commands at the database boundary", async () => {
    const context = await createContext();
    const deferred = deferredWriterResult();
    const write = vi.fn(() => deferred.promise);
    const service = optimizationService({ write });
    const commands = ["concurrent-first", "concurrent-second"].map(
      (idempotencyKey) =>
        service
          .generate({
            accountId: context.accountId,
            brandId: context.brand.id,
            idempotencyKey,
            expectedBrandRevision: context.brand.revision,
          })
          .then(
            (value) => ({ status: "fulfilled" as const, value }),
            (reason: unknown) => ({ status: "rejected" as const, reason }),
          ),
    );
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    deferred.resolve({ title: "并发生成标题", bodyMarkdown: "并发生成正文" });
    const results = await Promise.all(commands);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof ActiveArticleGenerationError,
      ),
    ).toHaveLength(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(await prisma.articleGeneration.count()).toBe(1);
    expect(await prisma.writerInputSnapshot.count()).toBe(1);
  });

  it("rejects cross-Brand guidance references and mismatched frozen Request metadata", async () => {
    const first = await createContext();
    const second = await createContext("+8613900000704");
    const brand = await brands.writerPurposeView(
      first.accountId,
      first.brand.id,
    );
    const firstGuidance = await guidance.latest(
      first.accountId,
      first.brand.id,
    );
    const secondGuidance = await guidance.latest(
      second.accountId,
      second.brand.id,
    );
    const writerRequest = buildWriterRequest(brand, firstGuidance!);
    const snapshotData = {
      accountId: first.accountId,
      brandId: first.brand.id,
      sourceBrandRevision: brand.revision,
      sourceWritingContextFingerprint: brand.writingContextFingerprint,
      requestContractVersion: writerRequest.contractVersion,
      writerRequest,
      generationPolicyId: writerRequest.generationPolicy.id,
      generationPolicyVersion: writerRequest.generationPolicy.version,
      generationPolicyHash: writerRequest.generationPolicy.hash,
    };

    await expect(
      prisma.writerInputSnapshot.create({
        data: {
          ...snapshotData,
          evaluationGuidanceId: secondGuidance!.reference.guidanceId,
          evaluationGuidanceRunId: secondGuidance!.reference.runId,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.writerInputSnapshot.create({
        data: {
          ...snapshotData,
          evaluationGuidanceId: firstGuidance!.reference.guidanceId,
          evaluationGuidanceRunId: firstGuidance!.reference.runId,
          requestContractVersion: "writer-request-mismatch",
        },
      }),
    ).rejects.toThrow();
    expect(await prisma.writerInputSnapshot.count()).toBe(0);
  });

  it("exposes a customer-safe HTTP workspace and revision-conditional commands", async () => {
    const cookie = await login(baseUrl, "13900000701");
    const accountResponse = await fetch(`${baseUrl}/identity/me`, {
      headers: { cookie },
    });
    const account = (await accountResponse.json()) as { id: string };

    const emptyResponse = await fetch(`${baseUrl}/geo-optimization/workspace`, {
      headers: { cookie },
    });
    expect(emptyResponse.status).toBe(200);
    expect(await emptyResponse.json()).toEqual({
      brand: null,
      guidance: null,
      latestGeneration: null,
      article: null,
      articleFreshness: null,
    });

    const brand = await brands.create(
      account.id,
      readyCoffeeBrandInput(account.id, {
        companyName: "HTTP 优化测试品牌",
        articleInformation: {
          price: { mode: "RANGE", minimum: 28, maximum: 68 },
          suitableAudienceContexts: ["需要安静办公的顾客"],
          supplementalBackground: "团队持有专业咖啡师认证",
          desiredPositioning: ["本地精品咖啡代表"],
        },
      }),
    );
    await seedAcceptedGuidance(account.id, brand.id, {
      evaluationFingerprint: brand.evaluationFingerprint,
    });

    const workspaceResponse = await fetch(
      `${baseUrl}/geo-optimization/workspace`,
      { headers: { cookie } },
    );
    expect(workspaceResponse.status).toBe(200);
    const workspace = await workspaceResponse.json();
    expect(workspace).toMatchObject({
      brand: { id: brand.id, revision: brand.revision },
      guidance: { customerDirections: expect.any(Array) },
      article: null,
    });
    for (const protectedField of [
      "writerGuidance",
      "snapshotId",
      "idempotencyKey",
      "writingContextFingerprint",
      "contactMobile",
    ]) {
      expect(JSON.stringify(workspace)).not.toContain(protectedField);
    }

    const generateResponse = await fetch(
      `${baseUrl}/brands/${brand.id}/article-generations`,
      {
        method: "POST",
        headers: browserMutationHeaders(cookie),
        body: JSON.stringify({
          idempotencyKey: "http-generation-one",
          expectedBrandRevision: brand.revision,
        }),
      },
    );
    expect(generateResponse.status).toBe(201);
    const generation = await generateResponse.json();
    expect(generation).toMatchObject({ status: "SUCCEEDED", attemptCount: 1 });
    expect(generation).not.toHaveProperty("snapshotId");
    expect(generation).not.toHaveProperty("idempotencyKey");

    const generatedWorkspace = await fetch(
      `${baseUrl}/geo-optimization/workspace`,
      { headers: { cookie } },
    ).then((response) => response.json());
    const article = generatedWorkspace.article as {
      id: string;
      revision: number;
      title: string;
    };
    expect(article).toMatchObject({ revision: 1, status: "DRAFT" });

    const missingReplacement = await fetch(
      `${baseUrl}/brands/${brand.id}/article-generations`,
      {
        method: "POST",
        headers: browserMutationHeaders(cookie),
        body: JSON.stringify({
          idempotencyKey: "http-replacement-without-revision",
          expectedBrandRevision: brand.revision,
        }),
      },
    );
    expect(missingReplacement.status).toBe(409);

    const saveResponse = await fetch(
      `${baseUrl}/brands/${brand.id}/core-article/${article.id}`,
      {
        method: "PATCH",
        headers: browserMutationHeaders(cookie),
        body: JSON.stringify({
          expectedRevision: article.revision,
          title: `${article.title}（已编辑）`,
          bodyMarkdown: "# 客户保存的正文",
        }),
      },
    );
    expect(saveResponse.status).toBe(200);
    const saved = await saveResponse.json();
    expect(saved).toMatchObject({ revision: 2, status: "DRAFT" });
    expect(saved).not.toHaveProperty("source");

    const staleConfirmation = await fetch(
      `${baseUrl}/brands/${brand.id}/core-article/${article.id}/confirmations`,
      {
        method: "POST",
        headers: browserMutationHeaders(cookie),
        body: JSON.stringify({ expectedRevision: 1 }),
      },
    );
    expect(staleConfirmation.status).toBe(409);

    const confirmResponse = await fetch(
      `${baseUrl}/brands/${brand.id}/core-article/${article.id}/confirmations`,
      {
        method: "POST",
        headers: browserMutationHeaders(cookie),
        body: JSON.stringify({ expectedRevision: saved.revision }),
      },
    );
    expect(confirmResponse.status).toBe(200);
    expect(await confirmResponse.json()).toMatchObject({
      revision: 2,
      confirmedRevision: 2,
      status: "CONFIRMED",
    });
  });

  function optimizationService(writer: CoreArticleWriter) {
    return new GeoOptimizationService(brands, guidance, repository, writer);
  }

  it("publishes command bodies and every route parameter in OpenAPI", async () => {
    const document = await fetch(`${baseUrl}/openapi-json`).then((response) =>
      response.json(),
    );
    const commands = [
      [
        "/brands/{brandId}/article-generations",
        "post",
        "GenerateCoreArticleRequest",
      ],
      [
        "/brands/{brandId}/core-article/{articleId}",
        "patch",
        "SaveCoreArticleRequest",
      ],
      [
        "/brands/{brandId}/core-article/{articleId}/confirmations",
        "post",
        "ConfirmCoreArticleRequest",
      ],
    ];
    for (const [path, method, schema] of commands) {
      const operation = document.paths[path!][method!];
      expect(
        operation.requestBody.content["application/json"].schema.$ref,
      ).toBe(`#/components/schemas/${schema}`);
      expect(
        operation.parameters
          .map((parameter: { name: string }) => parameter.name)
          .sort(),
      ).toEqual(
        path!.includes("{articleId}") ? ["articleId", "brandId"] : ["brandId"],
      );
    }
    const retry =
      document.paths[
        "/brands/{brandId}/article-generations/{generationId}/retries"
      ].post;
    expect(
      retry.parameters
        .map((parameter: { name: string }) => parameter.name)
        .sort(),
    ).toEqual(["brandId", "generationId"]);
  });

  it("rejects body-controlled identity and malformed HTTP commands before mutation", async () => {
    const victim = await createContext();
    const service = optimizationService(deterministicWriter);
    await service.generate({
      accountId: victim.accountId,
      brandId: victim.brand.id,
      idempotencyKey: "victim-baseline",
      expectedBrandRevision: victim.brand.revision,
    });
    const before = (await service.currentArticle(
      victim.accountId,
      victim.brand.id,
    ))!;
    const cookie = await login(baseUrl, "13900000709");
    const commands = [
      {
        path: `brands/${victim.brand.id}/article-generations`,
        method: "POST",
        body: {
          accountId: victim.accountId,
          expectedBrandRevision: victim.brand.revision,
          expectedArticleRevision: before.revision,
          idempotencyKey: "hostile-request",
        },
      },
      {
        path: `brands/${victim.brand.id}/core-article/${before.id}`,
        method: "PATCH",
        body: {
          accountId: victim.accountId,
          expectedRevision: before.revision,
          title: "越权标题",
          bodyMarkdown: "越权正文",
        },
      },
      {
        path: `brands/${victim.brand.id}/core-article/${before.id}/confirmations`,
        method: "POST",
        body: {
          accountId: victim.accountId,
          expectedRevision: before.revision,
        },
      },
    ];
    for (const command of commands) {
      const response = await fetch(`${baseUrl}/${command.path}`, {
        method: command.method,
        headers: browserMutationHeaders(cookie),
        body: JSON.stringify(command.body),
      });
      expect(response.status).toBe(400);
    }
    expect(
      await service.currentArticle(victim.accountId, victim.brand.id),
    ).toEqual(before);
    expect(await prisma.articleGeneration.count()).toBe(1);
    for (const body of [
      {},
      { idempotencyKey: 7, expectedBrandRevision: 1 },
      { idempotencyKey: "malformed-key", expectedBrandRevision: "1" },
    ]) {
      const response = await fetch(
        `${baseUrl}/brands/${victim.brand.id}/article-generations`,
        {
          method: "POST",
          headers: browserMutationHeaders(cookie),
          body: JSON.stringify(body),
        },
      );
      expect(response.status).toBe(400);
    }
    const foreignSave = await fetch(
      `${baseUrl}/brands/${victim.brand.id}/core-article/${before.id}`,
      {
        method: "PATCH",
        headers: browserMutationHeaders(cookie),
        body: JSON.stringify({
          expectedRevision: before.revision,
          title: "越权",
          bodyMarkdown: "越权",
        }),
      },
    );
    expect(foreignSave.status).toBe(404);
  });

  async function createContext(mobile = "+8613900000701") {
    const accountId = (await prisma.account.create({ data: { mobile } })).id;
    const brand = await brands.create(
      accountId,
      readyCoffeeBrandInput(accountId, {
        companyName: "星河咖啡",
        articleInformation: {
          price: { mode: "RANGE", minimum: 28, maximum: 68 },
          suitableAudienceContexts: ["需要安静办公的顾客"],
          supplementalBackground: "团队持有专业咖啡师认证",
          desiredPositioning: ["本地精品咖啡代表"],
        },
      }),
    );
    const guidanceId = await seedAcceptedGuidance(accountId, brand.id, {
      evaluationFingerprint: brand.evaluationFingerprint,
    });
    return { accountId, brand, guidanceId };
  }

  async function seedAcceptedGuidance(
    accountId: string,
    brandId: string,
    input: { evaluationFingerprint: string },
  ) {
    const definition = await prisma.evaluationDefinition.create({
      data: {
        accountId,
        brandId,
        inputFingerprint: input.evaluationFingerprint,
        brandSnapshot: { fixture: true },
        questionGeneratorId: "fixture-generator",
        questionGeneratorVersion: "1.0.0",
        questionGeneratorHash: "1".repeat(64),
        platformPolicy: { fixture: true },
        objectivityProfileId: "fixture-objectivity",
        objectivityProfileVersion: "1.0.0",
        objectivityProfileHash: "2".repeat(64),
        objectivityProfileContent: "fixture",
      },
    });
    const run = await prisma.evaluationRun.create({
      data: {
        accountId,
        brandId,
        definitionId: definition.id,
        inputFingerprint: input.evaluationFingerprint,
        status: "COMPLETED",
        stage: "REPORT_ACCEPTED",
        correlationId: randomUUID(),
      },
    });
    const cycle = await prisma.evaluationExecutionCycle.create({
      data: { runId: run.id, sequence: 1, status: "COMPLETED" },
    });
    const attempt = await prisma.aiSynthesisAttempt.create({
      data: {
        runId: run.id,
        cycleId: cycle.id,
        attemptNumber: 1,
        status: "SUCCEEDED",
        routePolicyId: "fixture-route",
        providerKey: "fixture-provider",
        requestedModel: "fixture-model",
        requestPayload: { fixture: true },
        correlationId: run.correlationId,
        finishedAt: new Date(),
      },
    });
    const synthesis = await prisma.evaluationSynthesis.create({
      data: {
        runId: run.id,
        acceptedAttemptId: attempt.id,
        semanticContractVersion: OVERALL_SYNTHESIS_CONTRACT_VERSION,
        semanticPayload: { fixture: true },
      },
    });
    const report = await prisma.evaluationReport.create({
      data: {
        runId: run.id,
        synthesisId: synthesis.id,
        metricPolicyVersion: "evaluation.report-metrics@1",
        documentContractVersion: EVALUATION_REPORT_DOCUMENT_VERSION,
        publicDocument: reportDocument(),
      },
    });
    const accepted = await prisma.evaluationOptimizationGuidance.create({
      data: {
        runId: run.id,
        synthesisId: synthesis.id,
        guidancePayload: guidancePayload(),
      },
    });
    expect(report.id).toEqual(expect.any(String));
    return accepted.id;
  }
});

function guidancePayload() {
  const sampleId = randomUUID();
  return {
    summary: "强化本地精品咖啡与办公场景认知",
    priorities: [
      {
        guidanceId: "priority-local",
        label: "本地认知",
        detail: "持续说明所在区域与核心服务",
        evidenceRefs: [{ sampleId, observationId: null }],
      },
    ],
    writingAngles: [
      {
        guidanceId: "angle-work",
        label: "办公场景",
        detail: "突出安静座位和稳定网络",
        evidenceRefs: [{ sampleId, observationId: null }],
      },
    ],
    cautions: ["不要编造未提供的信息"],
  };
}

function reportDocument() {
  return {
    overview: {
      recommendationAssessment: "当前推荐表现仍有提升空间。",
      brandPerception: "安静办公场景有一定认知。",
      recommendationIndex: {
        score: 2.5,
        stars: 2.5,
        mentionRate: 0.25,
        mentionCount: 1,
        validOpenSampleCount: 4,
      },
      typicalPosition: { kind: "SINGLE" as const, position: 3 },
      coverage: {
        validSampleCount: 20,
        totalSampleCount: 20,
        missingSampleCount: 0,
      },
    },
    platforms: [],
    themes: { positive: [], negative: [] },
    competitors: [],
    directions: [
      {
        directionId: "direction-local",
        currentProblem: "本地品牌认知不够集中。",
        recommendedDirection: "围绕精品咖啡与办公体验持续表达。",
        intendedImprovement: "提高目标客户对品牌的清晰认知。",
        evidence: { sampleCount: 4, platforms: ["deepseek"] },
      },
    ],
    limitations: [],
  };
}

async function login(baseUrl: string, mobile: string): Promise<string> {
  const challengeResponse = await fetch(`${baseUrl}/identity/challenges`, {
    method: "POST",
    headers: browserMutationHeaders(),
    body: JSON.stringify({ mobile }),
  });
  const challenge = (await challengeResponse.json()) as {
    challengeId: string;
    developmentCode: string;
  };
  const sessionResponse = await fetch(`${baseUrl}/identity/sessions`, {
    method: "POST",
    headers: browserMutationHeaders(),
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      mobile,
      code: challenge.developmentCode,
    }),
  });
  return sessionResponse.headers.get("set-cookie")!;
}

function deferredWriterResult() {
  let resolve!: (result: WriterResult) => void;
  const promise = new Promise<WriterResult>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}
