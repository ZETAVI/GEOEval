import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  ActiveArticleGenerationError,
  ArticleGenerationNotRetryableError,
  ArticleReplacementRequiredError,
  ArticleRevisionConflictError,
  GeoOptimizationNotFoundError,
} from "../domain/geo-optimization.errors.js";
import type { GeoOptimizationRepository } from "../domain/geo-optimization.repository.js";
import type {
  ArticleGenerationView,
  CompleteGenerationInput,
  ConfirmCoreArticleInput,
  ConfirmedCoreArticleReference,
  CoreArticleView,
  FailGenerationInput,
  GenerationPreparation,
  RetryPreparation,
  SaveCoreArticleInput,
  StartGenerationInput,
} from "../domain/geo-optimization.types.js";
import { parseWriterRequest } from "../domain/writer.contract.js";

const articleInclude = {
  sourceGeneration: { include: { snapshot: true } },
} as const;

export const ABANDONED_DETERMINISTIC_GENERATION_MS = 5 * 60 * 1000;

type StoredArticle = Prisma.CoreArticleGetPayload<{
  include: typeof articleInclude;
}>;

@Injectable()
export class PostgresGeoOptimizationRepository implements GeoOptimizationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findGenerationByIdempotency(input: {
    accountId: string;
    brandId: string;
    idempotencyKey: string;
  }): Promise<ArticleGenerationView | undefined> {
    const generation = await this.prisma.articleGeneration.findUnique({
      where: {
        accountId_brandId_idempotencyKey: {
          accountId: input.accountId,
          brandId: input.brandId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    return generation ? mapGeneration(generation) : undefined;
  }

  async findLatestGeneration(input: {
    accountId: string;
    brandId: string;
  }): Promise<ArticleGenerationView | undefined> {
    const generation = await this.prisma.articleGeneration.findFirst({
      where: { accountId: input.accountId, brandId: input.brandId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return generation ? mapGeneration(generation) : undefined;
  }

  async prepareGeneration(
    input: StartGenerationInput,
  ): Promise<GenerationPreparation> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.articleGeneration.findUnique({
          where: {
            accountId_brandId_idempotencyKey: {
              accountId: input.accountId,
              brandId: input.brandId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) {
          return { kind: "EXISTING", generation: mapGeneration(existing) };
        }

        const currentArticle = await lockCurrentArticle(
          transaction,
          input.accountId,
          input.brandId,
        );
        assertReplacementRevision(
          currentArticle?.revision,
          input.expectedArticleRevision,
        );
        const active = await transaction.articleGeneration.findFirst({
          where: {
            accountId: input.accountId,
            brandId: input.brandId,
            status: "RUNNING",
          },
        });
        if (active) throw new ActiveArticleGenerationError();

        const snapshot = await transaction.writerInputSnapshot.create({
          data: {
            accountId: input.accountId,
            brandId: input.brandId,
            sourceBrandRevision: input.sourceBrandRevision,
            sourceWritingContextFingerprint:
              input.sourceWritingContextFingerprint,
            evaluationGuidanceId: input.evaluationGuidanceId,
            evaluationGuidanceRunId: input.evaluationGuidanceRunId,
            requestContractVersion: input.writerRequest.contractVersion,
            writerRequest: input.writerRequest as Prisma.InputJsonValue,
            generationPolicyId: input.writerRequest.generationPolicy.id,
            generationPolicyVersion:
              input.writerRequest.generationPolicy.version,
            generationPolicyHash: input.writerRequest.generationPolicy.hash,
          },
        });
        const generation = await transaction.articleGeneration.create({
          data: {
            accountId: input.accountId,
            brandId: input.brandId,
            snapshotId: snapshot.id,
            idempotencyKey: input.idempotencyKey,
            expectedArticleRevision: input.expectedArticleRevision,
          },
        });
        return {
          kind: "STARTED",
          generation: mapGeneration(generation),
          writerRequest: input.writerRequest,
        };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.findGenerationByIdempotency(input);
      if (existing) return { kind: "EXISTING", generation: existing };
      throw new ActiveArticleGenerationError();
    }
  }

  async prepareRetry(input: {
    accountId: string;
    brandId: string;
    generationId: string;
  }): Promise<RetryPreparation> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const locked = await lockGeneration(
          transaction,
          input.accountId,
          input.brandId,
          input.generationId,
        );
        if (!locked) throw new GeoOptimizationNotFoundError();
        const existing = await transaction.articleGeneration.findUniqueOrThrow({
          where: { id: input.generationId },
          include: { snapshot: true },
        });
        if (
          existing.status === "RUNNING" &&
          existing.startedAt.getTime() >
            Date.now() - ABANDONED_DETERMINISTIC_GENERATION_MS
        ) {
          return { kind: "EXISTING", generation: mapGeneration(existing) };
        }
        if (existing.status !== "FAILED" && existing.status !== "RUNNING") {
          throw new ArticleGenerationNotRetryableError();
        }
        const active = await transaction.articleGeneration.findFirst({
          where: {
            accountId: input.accountId,
            brandId: input.brandId,
            status: "RUNNING",
            id: { not: input.generationId },
          },
        });
        if (active) throw new ActiveArticleGenerationError();
        const generation = await transaction.articleGeneration.update({
          where: { id: input.generationId },
          data: {
            status: "RUNNING",
            attemptCount: { increment: 1 },
            failureCode: null,
            failureMessage: null,
            startedAt: new Date(),
            finishedAt: null,
          },
        });
        return {
          kind: "STARTED",
          generation: mapGeneration(generation),
          writerRequest: parseWriterRequest(existing.snapshot.writerRequest),
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActiveArticleGenerationError();
      throw error;
    }
  }

  async completeGeneration(
    input: CompleteGenerationInput,
  ): Promise<ArticleGenerationView> {
    return this.prisma.$transaction(async (transaction) => {
      const locked = await lockGeneration(
        transaction,
        input.accountId,
        input.brandId,
        input.generationId,
      );
      if (!locked) throw new GeoOptimizationNotFoundError();
      const generation = await transaction.articleGeneration.findUniqueOrThrow({
        where: { id: input.generationId },
      });
      if (generation.status !== "RUNNING") return mapGeneration(generation);

      const currentArticle = await lockCurrentArticle(
        transaction,
        input.accountId,
        input.brandId,
      );
      if (
        !matchesExpectedRevision(
          currentArticle?.revision,
          generation.expectedArticleRevision,
        )
      ) {
        const notApplied = await transaction.articleGeneration.update({
          where: { id: generation.id },
          data: { status: "NOT_APPLIED", finishedAt: new Date() },
        });
        return mapGeneration(notApplied);
      }

      if (currentArticle) {
        await transaction.coreArticle.update({
          where: { id: currentArticle.id },
          data: {
            title: input.result.title,
            bodyMarkdown: input.result.bodyMarkdown,
            status: "DRAFT",
            revision: { increment: 1 },
            sourceGenerationId: generation.id,
            confirmedRevision: null,
            confirmedAt: null,
          },
        });
      } else {
        await transaction.coreArticle.create({
          data: {
            accountId: input.accountId,
            brandId: input.brandId,
            title: input.result.title,
            bodyMarkdown: input.result.bodyMarkdown,
            sourceGenerationId: generation.id,
          },
        });
      }
      const completed = await transaction.articleGeneration.update({
        where: { id: generation.id },
        data: { status: "SUCCEEDED", finishedAt: new Date() },
      });
      return mapGeneration(completed);
    });
  }

  async failGeneration(
    input: FailGenerationInput,
  ): Promise<ArticleGenerationView> {
    return this.prisma.$transaction(async (transaction) => {
      const locked = await lockGeneration(
        transaction,
        input.accountId,
        input.brandId,
        input.generationId,
      );
      if (!locked) throw new GeoOptimizationNotFoundError();
      const generation = await transaction.articleGeneration.findUniqueOrThrow({
        where: { id: input.generationId },
      });
      if (generation.status !== "RUNNING") return mapGeneration(generation);
      return mapGeneration(
        await transaction.articleGeneration.update({
          where: { id: generation.id },
          data: {
            status: "FAILED",
            failureCode: input.failureCode,
            failureMessage: input.failureMessage,
            finishedAt: new Date(),
          },
        }),
      );
    });
  }

  async findCurrentArticle(input: {
    accountId: string;
    brandId: string;
  }): Promise<CoreArticleView | undefined> {
    const article = await this.prisma.coreArticle.findFirst({
      where: { accountId: input.accountId, brandId: input.brandId },
      include: articleInclude,
    });
    return article ? mapArticle(article) : undefined;
  }

  async saveArticle(input: SaveCoreArticleInput): Promise<CoreArticleView> {
    return this.prisma.$transaction(async (transaction) => {
      const locked = await lockArticle(
        transaction,
        input.accountId,
        input.brandId,
        input.articleId,
      );
      if (!locked) throw new GeoOptimizationNotFoundError();
      if (locked.revision !== input.expectedRevision) {
        throw new ArticleRevisionConflictError();
      }
      const article = await transaction.coreArticle.update({
        where: { id: input.articleId },
        data: {
          title: input.title,
          bodyMarkdown: input.bodyMarkdown,
          status: "DRAFT",
          revision: { increment: 1 },
          confirmedRevision: null,
          confirmedAt: null,
        },
        include: articleInclude,
      });
      return mapArticle(article);
    });
  }

  async confirmArticle(
    input: ConfirmCoreArticleInput,
  ): Promise<CoreArticleView> {
    return this.prisma.$transaction(async (transaction) => {
      const locked = await lockArticle(
        transaction,
        input.accountId,
        input.brandId,
        input.articleId,
      );
      if (!locked) throw new GeoOptimizationNotFoundError();
      if (locked.revision !== input.expectedRevision) {
        throw new ArticleRevisionConflictError();
      }
      const current = await transaction.coreArticle.findUniqueOrThrow({
        where: { id: input.articleId },
        include: articleInclude,
      });
      if (
        current.status === "CONFIRMED" &&
        current.confirmedRevision === current.revision
      ) {
        return mapArticle(current);
      }
      const article = await transaction.coreArticle.update({
        where: { id: input.articleId },
        data: {
          status: "CONFIRMED",
          confirmedRevision: current.revision,
          confirmedAt: new Date(),
        },
        include: articleInclude,
      });
      return mapArticle(article);
    });
  }

  async findConfirmedArticleReference(input: {
    accountId: string;
    brandId: string;
    articleId: string;
    revision: number;
  }): Promise<ConfirmedCoreArticleReference | undefined> {
    const article = await this.prisma.coreArticle.findFirst({
      where: {
        id: input.articleId,
        accountId: input.accountId,
        brandId: input.brandId,
        revision: input.revision,
        status: "CONFIRMED",
        confirmedRevision: input.revision,
      },
      select: { id: true },
    });
    return article
      ? {
          accountId: input.accountId,
          brandId: input.brandId,
          articleId: article.id,
          revision: input.revision,
        }
      : undefined;
  }
}

async function lockGeneration(
  transaction: Prisma.TransactionClient,
  accountId: string,
  brandId: string,
  generationId: string,
) {
  return (
    await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "article_generations"
      WHERE "id" = CAST(${generationId} AS UUID)
        AND "account_id" = CAST(${accountId} AS UUID)
        AND "brand_id" = CAST(${brandId} AS UUID)
      FOR UPDATE
    `
  )[0];
}

async function lockCurrentArticle(
  transaction: Prisma.TransactionClient,
  accountId: string,
  brandId: string,
) {
  return (
    await transaction.$queryRaw<Array<{ id: string; revision: number }>>`
      SELECT "id", "revision"
      FROM "core_articles"
      WHERE "account_id" = CAST(${accountId} AS UUID)
        AND "brand_id" = CAST(${brandId} AS UUID)
      FOR UPDATE
    `
  )[0];
}

async function lockArticle(
  transaction: Prisma.TransactionClient,
  accountId: string,
  brandId: string,
  articleId: string,
) {
  return (
    await transaction.$queryRaw<Array<{ id: string; revision: number }>>`
      SELECT "id", "revision"
      FROM "core_articles"
      WHERE "id" = CAST(${articleId} AS UUID)
        AND "account_id" = CAST(${accountId} AS UUID)
        AND "brand_id" = CAST(${brandId} AS UUID)
      FOR UPDATE
    `
  )[0];
}

function assertReplacementRevision(
  currentRevision: number | undefined,
  expectedRevision: number | null,
) {
  if (currentRevision === undefined && expectedRevision === null) return;
  if (currentRevision !== undefined && expectedRevision === null) {
    throw new ArticleReplacementRequiredError();
  }
  if (currentRevision !== expectedRevision) {
    throw new ArticleRevisionConflictError();
  }
}

function matchesExpectedRevision(
  currentRevision: number | undefined,
  expectedRevision: number | null,
) {
  return expectedRevision === null
    ? currentRevision === undefined
    : currentRevision === expectedRevision;
}

function mapGeneration(input: {
  id: string;
  accountId: string;
  brandId: string;
  snapshotId: string;
  idempotencyKey: string;
  status: ArticleGenerationView["status"];
  attemptCount: number;
  expectedArticleRevision: number | null;
  failureCode: string | null;
  failureMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ArticleGenerationView {
  return {
    id: input.id,
    accountId: input.accountId,
    brandId: input.brandId,
    snapshotId: input.snapshotId,
    idempotencyKey: input.idempotencyKey,
    status: input.status,
    attemptCount: input.attemptCount,
    expectedArticleRevision: input.expectedArticleRevision,
    failure:
      input.failureCode && input.failureMessage
        ? { code: input.failureCode, message: input.failureMessage }
        : null,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function mapArticle(article: StoredArticle): CoreArticleView {
  return {
    id: article.id,
    accountId: article.accountId,
    brandId: article.brandId,
    title: article.title,
    bodyMarkdown: article.bodyMarkdown,
    status: article.status,
    revision: article.revision,
    source: {
      generationId: article.sourceGenerationId,
      snapshotId: article.sourceGeneration.snapshotId,
      brandRevision: article.sourceGeneration.snapshot.sourceBrandRevision,
      writingContextFingerprint:
        article.sourceGeneration.snapshot.sourceWritingContextFingerprint,
      evaluationGuidanceId:
        article.sourceGeneration.snapshot.evaluationGuidanceId,
    },
    confirmedRevision: article.confirmedRevision,
    confirmedAt: article.confirmedAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
