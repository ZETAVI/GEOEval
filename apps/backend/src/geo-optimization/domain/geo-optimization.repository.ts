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
} from "./geo-optimization.types.js";

export const GEO_OPTIMIZATION_REPOSITORY = Symbol(
  "GEO_OPTIMIZATION_REPOSITORY",
);

export interface GeoOptimizationRepository {
  findGenerationByIdempotency(input: {
    accountId: string;
    brandId: string;
    idempotencyKey: string;
  }): Promise<ArticleGenerationView | undefined>;
  findLatestGeneration(input: {
    accountId: string;
    brandId: string;
  }): Promise<ArticleGenerationView | undefined>;
  prepareGeneration(
    input: StartGenerationInput,
  ): Promise<GenerationPreparation>;
  prepareRetry(input: {
    accountId: string;
    brandId: string;
    generationId: string;
  }): Promise<RetryPreparation>;
  completeGeneration(
    input: CompleteGenerationInput,
  ): Promise<ArticleGenerationView>;
  failGeneration(input: FailGenerationInput): Promise<ArticleGenerationView>;
  findCurrentArticle(input: {
    accountId: string;
    brandId: string;
  }): Promise<CoreArticleView | undefined>;
  saveArticle(input: SaveCoreArticleInput): Promise<CoreArticleView>;
  confirmArticle(input: ConfirmCoreArticleInput): Promise<CoreArticleView>;
  findConfirmedArticleReference(input: {
    accountId: string;
    brandId: string;
    articleId: string;
    revision: number;
  }): Promise<ConfirmedCoreArticleReference | undefined>;
}
