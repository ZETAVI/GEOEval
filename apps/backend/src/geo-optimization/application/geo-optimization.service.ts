import { Inject, Injectable } from "@nestjs/common";

import { BrandService } from "../../brand/application/brand.service.js";
import { EvaluationOptimizationGuidanceService } from "../../geo-intelligence/application/evaluation-optimization-guidance.service.js";
import {
  ArticleRevisionConflictError,
  BrandRevisionConflictError,
  CurrentBrandRequiredError,
  EvaluationGuidanceRequiredError,
  GeoOptimizationNotFoundError,
  GeoOptimizationValidationError,
} from "../domain/geo-optimization.errors.js";
import {
  GEO_OPTIMIZATION_REPOSITORY,
  type GeoOptimizationRepository,
} from "../domain/geo-optimization.repository.js";
import type {
  ArticleGenerationView,
  ConfirmedCoreArticleReference,
  CoreArticleView,
  GenerationPreparation,
  GeoOptimizationWorkspaceView,
  RetryPreparation,
} from "../domain/geo-optimization.types.js";
import {
  WriterContractError,
  buildWriterRequest,
  normalizeWriterResult,
} from "../domain/writer.contract.js";
import {
  CORE_ARTICLE_WRITER,
  type CoreArticleWriter,
} from "../domain/writer.port.js";

export type GenerateCoreArticleCommand = {
  accountId: string;
  brandId: string;
  idempotencyKey: string;
  expectedBrandRevision: number;
  expectedArticleRevision?: number;
};

@Injectable()
export class GeoOptimizationService {
  constructor(
    @Inject(BrandService) private readonly brands: BrandService,
    @Inject(EvaluationOptimizationGuidanceService)
    private readonly guidance: EvaluationOptimizationGuidanceService,
    @Inject(GEO_OPTIMIZATION_REPOSITORY)
    private readonly repository: GeoOptimizationRepository,
    @Inject(CORE_ARTICLE_WRITER)
    private readonly writer: CoreArticleWriter,
  ) {}

  async generate(
    command: GenerateCoreArticleCommand,
  ): Promise<ArticleGenerationView> {
    const idempotencyKey = normalizeIdempotencyKey(command.idempotencyKey);
    assertPositiveRevision(command.expectedBrandRevision, "品牌版本");
    if (command.expectedArticleRevision !== undefined) {
      assertPositiveRevision(command.expectedArticleRevision, "文章版本");
    }
    const duplicate = await this.repository.findGenerationByIdempotency({
      accountId: command.accountId,
      brandId: command.brandId,
      idempotencyKey,
    });
    if (duplicate) return duplicate;

    const currentBrand = await this.brands.current(command.accountId);
    if (!currentBrand || currentBrand.id !== command.brandId) {
      throw new CurrentBrandRequiredError();
    }
    const brand = await this.brands.writerPurposeView(
      command.accountId,
      command.brandId,
    );
    if (
      brand.revision !== command.expectedBrandRevision ||
      currentBrand.revision !== command.expectedBrandRevision
    ) {
      throw new BrandRevisionConflictError();
    }
    const guidance = await this.guidance.latest(
      command.accountId,
      command.brandId,
    );
    if (!guidance) throw new EvaluationGuidanceRequiredError();
    const writerRequest = buildWriterRequest(brand, guidance);
    const preparation = await this.repository.prepareGeneration({
      accountId: command.accountId,
      brandId: command.brandId,
      idempotencyKey,
      sourceBrandRevision: brand.revision,
      sourceWritingContextFingerprint: brand.writingContextFingerprint,
      evaluationGuidanceId: guidance.reference.guidanceId,
      evaluationGuidanceRunId: guidance.reference.runId,
      expectedArticleRevision: command.expectedArticleRevision ?? null,
      writerRequest,
    });
    return this.execute(preparation);
  }

  async retry(input: {
    accountId: string;
    brandId: string;
    generationId: string;
  }): Promise<ArticleGenerationView> {
    const preparation = await this.repository.prepareRetry(input);
    return this.execute(preparation);
  }

  async workspace(accountId: string): Promise<GeoOptimizationWorkspaceView> {
    const brand = await this.brands.current(accountId);
    if (!brand) {
      return {
        brand: null,
        guidance: null,
        latestGeneration: null,
        article: null,
        articleFreshness: null,
      };
    }
    const [guidance, latestGeneration, article] = await Promise.all([
      this.guidance.latest(accountId, brand.id),
      this.repository.findLatestGeneration({ accountId, brandId: brand.id }),
      this.repository.findCurrentArticle({ accountId, brandId: brand.id }),
    ]);
    return {
      brand: {
        id: brand.id,
        companyName: brand.companyName,
        primaryIndustryId: brand.primaryIndustryId,
        secondaryIndustryId: brand.secondaryIndustryId,
        otherProductOrService: brand.otherProductOrService,
        flagshipProductOrService: brand.flagshipProductOrService,
        characteristics: brand.characteristics.map((item) => ({ ...item })),
        articleInformation: {
          ...brand.articleInformation,
          suitableAudienceContexts: [
            ...brand.articleInformation.suitableAudienceContexts,
          ],
          desiredPositioning: [...brand.articleInformation.desiredPositioning],
        },
        revision: brand.revision,
        primaryIndustryLabel: brand.primaryIndustryLabel,
        secondaryIndustryLabel: brand.secondaryIndustryLabel,
        storeLocation: brand.storeLocation
          ? {
              placeName: brand.storeLocation.placeName,
              formattedAddress: brand.storeLocation.formattedAddress,
              coordinate: { ...brand.storeLocation.coordinate },
              officialRegion: brand.storeLocation.officialRegion,
              queryLocality: { ...brand.storeLocation.queryLocality },
              verifiedAt: brand.storeLocation.verifiedAt,
            }
          : null,
        readyForEvaluation: brand.readyForEvaluation,
        missingFields: [...brand.missingFields],
        readyForArticleGeneration: brand.readyForArticleGeneration,
        articleInformationMissingFields: [
          ...brand.articleInformationMissingFields,
        ],
      },
      guidance: guidance
        ? {
            guidanceId: guidance.reference.guidanceId,
            acceptedAt: guidance.reference.acceptedAt,
            brandInformationChanged: guidance.brandInformationChanged,
            customerDirections: guidance.customerDirections.map(
              (direction) => ({
                ...direction,
                evidence: {
                  ...direction.evidence,
                  platforms: [...direction.evidence.platforms],
                },
              }),
            ),
          }
        : null,
      latestGeneration: latestGeneration
        ? {
            id: latestGeneration.id,
            brandId: latestGeneration.brandId,
            status: latestGeneration.status,
            attemptCount: latestGeneration.attemptCount,
            failure: latestGeneration.failure,
            startedAt: latestGeneration.startedAt,
            finishedAt: latestGeneration.finishedAt,
            createdAt: latestGeneration.createdAt,
            updatedAt: latestGeneration.updatedAt,
          }
        : null,
      article: article
        ? {
            id: article.id,
            brandId: article.brandId,
            title: article.title,
            bodyMarkdown: article.bodyMarkdown,
            status: article.status,
            revision: article.revision,
            confirmedRevision: article.confirmedRevision,
            confirmedAt: article.confirmedAt,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
          }
        : null,
      articleFreshness: article
        ? {
            brandInformationChanged:
              article.source.writingContextFingerprint !==
              brand.writingContextFingerprint,
            guidanceChanged:
              guidance !== null &&
              article.source.evaluationGuidanceId !==
                guidance.reference.guidanceId,
          }
        : null,
    };
  }

  latestGeneration(
    accountId: string,
    brandId: string,
  ): Promise<ArticleGenerationView | undefined> {
    return this.repository.findLatestGeneration({ accountId, brandId });
  }

  async publishingContext(accountId: string) {
    const brand = await this.brands.current(accountId);
    if (!brand) return { brand: null, article: null };
    const article = await this.repository.findCurrentArticle({
      accountId,
      brandId: brand.id,
    });
    return {
      brand: { id: brand.id, companyName: brand.companyName },
      article: article
        ? {
            id: article.id,
            title: article.title,
            revision: article.revision,
            status: article.status,
            confirmedRevision: article.confirmedRevision,
          }
        : null,
    };
  }

  currentArticle(
    accountId: string,
    brandId: string,
  ): Promise<CoreArticleView | undefined> {
    return this.repository.findCurrentArticle({ accountId, brandId });
  }

  saveArticle(input: {
    accountId: string;
    brandId: string;
    articleId: string;
    expectedRevision: number;
    title: string;
    bodyMarkdown: string;
  }): Promise<CoreArticleView> {
    assertPositiveRevision(input.expectedRevision, "文章版本");
    const content = normalizeArticleContent(input.title, input.bodyMarkdown);
    return this.repository.saveArticle({ ...input, ...content });
  }

  confirmArticle(input: {
    accountId: string;
    brandId: string;
    articleId: string;
    expectedRevision: number;
  }): Promise<CoreArticleView> {
    assertPositiveRevision(input.expectedRevision, "文章版本");
    return this.repository.confirmArticle(input);
  }

  async confirmedArticleReference(input: {
    accountId: string;
    brandId: string;
    articleId: string;
    revision: number;
  }): Promise<ConfirmedCoreArticleReference> {
    assertPositiveRevision(input.revision, "文章版本");
    const reference =
      await this.repository.findConfirmedArticleReference(input);
    if (!reference) throw new GeoOptimizationNotFoundError("未找到已确认文章");
    return reference;
  }

  private async execute(
    preparation: GenerationPreparation | RetryPreparation,
  ): Promise<ArticleGenerationView> {
    if (preparation.kind === "EXISTING") return preparation.generation;
    let result;
    try {
      result = normalizeWriterResult(
        await this.writer.write(preparation.writerRequest),
      );
    } catch (error) {
      const invalidResult = error instanceof WriterContractError;
      return this.repository.failGeneration({
        accountId: preparation.generation.accountId,
        brandId: preparation.generation.brandId,
        generationId: preparation.generation.id,
        failureCode: invalidResult ? "INVALID_WRITER_RESULT" : "WRITER_FAILED",
        failureMessage: invalidResult
          ? "生成结果格式不正确，请重试"
          : "文章生成失败，请重试",
      });
    }
    return this.repository.completeGeneration({
      accountId: preparation.generation.accountId,
      brandId: preparation.generation.brandId,
      generationId: preparation.generation.id,
      result,
    });
  }
}

function normalizeIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 120) {
    throw new GeoOptimizationValidationError("生成请求标识格式不正确");
  }
  return normalized;
}

function assertPositiveRevision(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new GeoOptimizationValidationError(`${label}格式不正确`);
  }
}

function normalizeArticleContent(title: string, bodyMarkdown: string) {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  const normalizedBody = bodyMarkdown.trim();
  if (!normalizedTitle || normalizedTitle.length > 200) {
    throw new GeoOptimizationValidationError("文章标题不能为空且最多 200 个字");
  }
  if (!normalizedBody || normalizedBody.length > 100_000) {
    throw new GeoOptimizationValidationError(
      "文章正文不能为空且最多 100000 个字",
    );
  }
  return { title: normalizedTitle, bodyMarkdown: normalizedBody };
}
