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
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { z } from "zod";

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

const revision = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const generateBody = z.strictObject({
  idempotencyKey: z.string().trim().min(8).max(120),
  expectedBrandRevision: revision,
  expectedArticleRevision: revision.optional(),
});
const saveBody = z.strictObject({
  expectedRevision: revision,
  title: z.string().trim().min(1).max(200),
  bodyMarkdown: z.string().trim().min(1).max(100000),
});
const confirmBody = z.strictObject({ expectedRevision: revision });

function parseBody<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException("提交内容格式不正确，请检查后重试");
  return result.data;
}

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
  @ApiParam({ name: "brandId", type: String, format: "uuid" })
  @ApiCreatedResponse({ type: GeoOptimizationGenerationResponse })
  @ApiBody({ type: GenerateCoreArticleRequest })
  generate(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId", new ParseUUIDPipe()) brandId: string,
    @Body() input: GenerateCoreArticleRequest,
  ): Promise<GeoOptimizationGenerationResponse> {
    return translate(() => {
      const parsed = parseBody(generateBody, input);
      return this.optimization
        .generate({
          idempotencyKey: parsed.idempotencyKey,
          expectedBrandRevision: parsed.expectedBrandRevision,
          ...(parsed.expectedArticleRevision === undefined
            ? {}
            : { expectedArticleRevision: parsed.expectedArticleRevision }),
          accountId: principal.accountId,
          brandId,
        })
        .then(presentGeneration);
    });
  }

  @Post("brands/:brandId/article-generations/:generationId/retries")
  @ApiParam({ name: "brandId", type: String, format: "uuid" })
  @ApiParam({ name: "generationId", type: String, format: "uuid" })
  @HttpCode(200)
  @ApiOkResponse({ type: GeoOptimizationGenerationResponse })
  retry(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId", new ParseUUIDPipe()) brandId: string,
    @Param("generationId", new ParseUUIDPipe()) generationId: string,
  ): Promise<GeoOptimizationGenerationResponse> {
    return translate(() =>
      this.optimization
        .retry({ accountId: principal.accountId, brandId, generationId })
        .then(presentGeneration),
    );
  }

  @Patch("brands/:brandId/core-article/:articleId")
  @ApiParam({ name: "brandId", type: String, format: "uuid" })
  @ApiParam({ name: "articleId", type: String, format: "uuid" })
  @ApiOkResponse({ type: GeoOptimizationArticleResponse })
  @ApiBody({ type: SaveCoreArticleRequest })
  save(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId", new ParseUUIDPipe()) brandId: string,
    @Param("articleId", new ParseUUIDPipe()) articleId: string,
    @Body() input: SaveCoreArticleRequest,
  ): Promise<GeoOptimizationArticleResponse> {
    return translate(() =>
      this.optimization
        .saveArticle({
          ...parseBody(saveBody, input),
          accountId: principal.accountId,
          brandId,
          articleId,
        })
        .then(presentArticle),
    );
  }

  @Post("brands/:brandId/core-article/:articleId/confirmations")
  @ApiParam({ name: "brandId", type: String, format: "uuid" })
  @ApiParam({ name: "articleId", type: String, format: "uuid" })
  @HttpCode(200)
  @ApiOkResponse({ type: GeoOptimizationArticleResponse })
  @ApiBody({ type: ConfirmCoreArticleRequest })
  confirm(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId", new ParseUUIDPipe()) brandId: string,
    @Param("articleId", new ParseUUIDPipe()) articleId: string,
    @Body() input: ConfirmCoreArticleRequest,
  ): Promise<GeoOptimizationArticleResponse> {
    return translate(() =>
      this.optimization
        .confirmArticle({
          ...parseBody(confirmBody, input),
          accountId: principal.accountId,
          brandId,
          articleId,
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
