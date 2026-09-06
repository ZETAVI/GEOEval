import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";

import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { GeoOptimizationService } from "../application/geo-optimization.service.js";
import {
  ActiveArticleGenerationError,
  ArticleGenerationNotRetryableError,
  ArticleReplacementRequiredError,
  ArticleRevisionConflictError,
  BrandRevisionConflictError,
  CurrentBrandRequiredError,
  EvaluationGuidanceRequiredError,
  GeoOptimizationNotFoundError,
  GeoOptimizationValidationError,
} from "../domain/geo-optimization.errors.js";
import type {
  ArticleGenerationView,
  CoreArticleView,
  GeoOptimizationGenerationView,
  GeoOptimizationCoreArticleView,
} from "../domain/geo-optimization.types.js";
import {
  ConfirmCoreArticleRequest,
  GenerateCoreArticleRequest,
  GeoOptimizationArticleResponse,
  GeoOptimizationGenerationResponse,
  GeoOptimizationWorkspaceResponse,
  SaveCoreArticleRequest,
} from "./geo-optimization.dto.js";

@ApiTags("geo-optimization")
@ApiExtraModels(
  GeoOptimizationWorkspaceResponse,
  GeoOptimizationGenerationResponse,
  GeoOptimizationArticleResponse,
  GenerateCoreArticleRequest,
  SaveCoreArticleRequest,
  ConfirmCoreArticleRequest,
)
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller()
export class GeoOptimizationController {
  constructor(
    @Inject(GeoOptimizationService)
    private readonly optimization: GeoOptimizationService,
  ) {}

  @Get("geo-optimization/workspace")
  @ApiOkResponse({ type: GeoOptimizationWorkspaceResponse })
  workspace(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<GeoOptimizationWorkspaceResponse> {
    return translate(() => this.optimization.workspace(principal.accountId));
  }

  @Post("brands/:brandId/article-generations")
  @ApiCreatedResponse({ type: GeoOptimizationGenerationResponse })
  generate(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId") brandId: string,
    @Body() input: GenerateCoreArticleRequest,
  ): Promise<GeoOptimizationGenerationResponse> {
    return translate(() =>
      this.optimization
        .generate({ accountId: principal.accountId, brandId, ...input })
        .then(presentGeneration),
    );
  }

  @Post("brands/:brandId/article-generations/:generationId/retries")
  @HttpCode(200)
  @ApiOkResponse({ type: GeoOptimizationGenerationResponse })
  retry(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId") brandId: string,
    @Param("generationId") generationId: string,
  ): Promise<GeoOptimizationGenerationResponse> {
    return translate(() =>
      this.optimization
        .retry({ accountId: principal.accountId, brandId, generationId })
        .then(presentGeneration),
    );
  }

  @Patch("brands/:brandId/core-article/:articleId")
  @ApiOkResponse({ type: GeoOptimizationArticleResponse })
  save(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId") brandId: string,
    @Param("articleId") articleId: string,
    @Body() input: SaveCoreArticleRequest,
  ): Promise<GeoOptimizationArticleResponse> {
    return translate(() =>
      this.optimization
        .saveArticle({
          accountId: principal.accountId,
          brandId,
          articleId,
          ...input,
        })
        .then(presentArticle),
    );
  }

  @Post("brands/:brandId/core-article/:articleId/confirmations")
  @HttpCode(200)
  @ApiOkResponse({ type: GeoOptimizationArticleResponse })
  confirm(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId") brandId: string,
    @Param("articleId") articleId: string,
    @Body() input: ConfirmCoreArticleRequest,
  ): Promise<GeoOptimizationArticleResponse> {
    return translate(() =>
      this.optimization
        .confirmArticle({
          accountId: principal.accountId,
          brandId,
          articleId,
          ...input,
        })
        .then(presentArticle),
    );
  }
}

function presentGeneration(
  generation: ArticleGenerationView,
): GeoOptimizationGenerationView {
  return {
    id: generation.id,
    brandId: generation.brandId,
    status: generation.status,
    attemptCount: generation.attemptCount,
    failure: generation.failure,
    startedAt: generation.startedAt,
    finishedAt: generation.finishedAt,
    createdAt: generation.createdAt,
    updatedAt: generation.updatedAt,
  };
}

function presentArticle(
  article: CoreArticleView,
): GeoOptimizationCoreArticleView {
  const {
    accountId: _accountId,
    source: _source,
    ...customerArticle
  } = article;
  return customerArticle;
}

async function translate<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (
      error instanceof GeoOptimizationNotFoundError ||
      error instanceof CurrentBrandRequiredError
    ) {
      throw new NotFoundException(error.message);
    }
    if (
      error instanceof BrandRevisionConflictError ||
      error instanceof ArticleRevisionConflictError ||
      error instanceof ActiveArticleGenerationError ||
      error instanceof ArticleReplacementRequiredError ||
      error instanceof ArticleGenerationNotRetryableError
    ) {
      throw new ConflictException(error.message);
    }
    if (
      error instanceof EvaluationGuidanceRequiredError ||
      error instanceof GeoOptimizationValidationError
    ) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
