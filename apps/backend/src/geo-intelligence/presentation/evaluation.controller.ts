import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { EvaluationService } from "../application/evaluation.service.js";
import { EvaluationReportService } from "../application/evaluation-report.service.js";
import type { EvaluationReportView } from "../domain/evaluation-report.view.js";
import { publicEvaluationBrandSnapshot } from "../domain/evaluation-brand-snapshot.js";
import type { EvaluationDefinitionPreparationView } from "../domain/evaluation-question-preparation.types.js";
import type {
  EvaluationDefinitionView,
  EvaluationRunView,
} from "../domain/evaluation.types.js";
import {
  EvaluationBrandSnapshotResponse,
  EvaluationDefinitionResponse,
  EvaluationDefinitionPreparationResponse,
  CurrentEvaluationDefinitionPreparationResponse,
  EvaluationPlatformResponse,
  EvaluationQuestionResponse,
  EvaluationRunResponse,
  EvaluationPlatformProgressResponse,
  CurrentEvaluationReportResponse,
  EvaluationReportResponse,
  EvaluationReportDocumentResponse,
  EvaluationReportOverviewResponse,
  EvaluationRecommendationIndexResponse,
  EvaluationCoverageResponse,
  EvaluationTypicalPositionResponse,
  EvaluationPlatformReportResponse,
  EvaluationThemesResponse,
  EvaluationThemeResponse,
  EvaluationCompetitorResponse,
  EvaluationDirectionResponse,
  EvaluationEvidenceSummaryResponse,
  EvaluationReportQuestionResponse,
  EvaluationReportSampleResponse,
  EvaluationHighlightRangeResponse,
  EvaluationReportHistoryResponse,
  EvaluationReportSummaryResponse,
} from "./evaluation.dto.js";

@ApiTags("evaluation")
@ApiExtraModels(
  EvaluationDefinitionResponse,
  EvaluationDefinitionPreparationResponse,
  CurrentEvaluationDefinitionPreparationResponse,
  EvaluationBrandSnapshotResponse,
  EvaluationQuestionResponse,
  EvaluationPlatformResponse,
  EvaluationRunResponse,
  EvaluationPlatformProgressResponse,
  CurrentEvaluationReportResponse,
  EvaluationReportResponse,
  EvaluationReportDocumentResponse,
  EvaluationReportOverviewResponse,
  EvaluationRecommendationIndexResponse,
  EvaluationCoverageResponse,
  EvaluationTypicalPositionResponse,
  EvaluationPlatformReportResponse,
  EvaluationThemesResponse,
  EvaluationThemeResponse,
  EvaluationCompetitorResponse,
  EvaluationDirectionResponse,
  EvaluationEvidenceSummaryResponse,
  EvaluationReportQuestionResponse,
  EvaluationReportSampleResponse,
  EvaluationHighlightRangeResponse,
  EvaluationReportHistoryResponse,
  EvaluationReportSummaryResponse,
)
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller()
export class EvaluationController {
  constructor(
    @Inject(EvaluationService)
    private readonly evaluations: EvaluationService,
    @Inject(EvaluationReportService)
    private readonly reports: EvaluationReportService,
  ) {}

  @Get("brands/:brandId/evaluation-report")
  @ApiOkResponse({ type: CurrentEvaluationReportResponse })
  @ApiParam({ name: "brandId", type: String })
  currentReport(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId") brandId: string,
  ): Promise<CurrentEvaluationReportResponse> {
    return this.reports
      .current(principal.accountId, brandId)
      .then((report) => ({ report: report ? presentReport(report) : null }));
  }

  @Get("brands/:brandId/evaluation-reports")
  @ApiOkResponse({ type: EvaluationReportHistoryResponse })
  @ApiParam({ name: "brandId", type: String })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    minimum: 1,
    maximum: 20,
  })
  @ApiQuery({ name: "cursor", required: false, type: String })
  reportHistory(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId") brandId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<EvaluationReportHistoryResponse> {
    return this.reports.history(principal.accountId, brandId, limit, cursor);
  }

  @Get("brands/:brandId/evaluation-reports/:reportId")
  @ApiOkResponse({ type: EvaluationReportResponse })
  @ApiParam({ name: "brandId", type: String })
  @ApiParam({ name: "reportId", type: String })
  reportDetail(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
  ): Promise<EvaluationReportResponse> {
    return this.reports
      .detail(principal.accountId, brandId, reportId)
      .then(presentReport);
  }

  @Get("brands/:brandId/evaluation-definition")
  @ApiOkResponse({ type: CurrentEvaluationDefinitionPreparationResponse })
  @ApiParam({ name: "brandId", type: String })
  observeDefinition(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId") brandId: string,
  ): Promise<CurrentEvaluationDefinitionPreparationResponse> {
    return this.evaluations
      .observeDefinition(principal.accountId, brandId)
      .then((preparation) => ({
        preparation: preparation
          ? presentDefinitionPreparation(preparation)
          : null,
      }));
  }

  @Put("brands/:brandId/evaluation-definition")
  @ApiOkResponse({ type: EvaluationDefinitionPreparationResponse })
  @ApiParam({ name: "brandId", type: String })
  prepareDefinition(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId") brandId: string,
  ): Promise<EvaluationDefinitionPreparationResponse> {
    return this.evaluations
      .prepareDefinition(principal.accountId, brandId)
      .then(presentDefinitionPreparation);
  }

  @Post("evaluation-question-preparations/:preparationId/retries")
  @HttpCode(200)
  @ApiOkResponse({ type: EvaluationDefinitionPreparationResponse })
  @ApiParam({ name: "preparationId", type: String })
  retryDefinitionPreparation(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("preparationId") preparationId: string,
  ): Promise<EvaluationDefinitionPreparationResponse> {
    return this.evaluations
      .retryDefinitionPreparation(principal.accountId, preparationId)
      .then(presentDefinitionPreparation);
  }

  @Post("evaluation-definitions/:definitionId/runs")
  @ApiCreatedResponse({ type: EvaluationRunResponse })
  startRun(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("definitionId") definitionId: string,
  ): Promise<EvaluationRunResponse> {
    return this.evaluations
      .startRun(principal.accountId, definitionId)
      .then(presentRun);
  }

  @Post("evaluation-runs/:runId/retries")
  @HttpCode(200)
  @ApiOkResponse({ type: EvaluationRunResponse })
  @ApiParam({ name: "runId", type: String })
  retryRun(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("runId") runId: string,
  ): Promise<EvaluationRunResponse> {
    return this.evaluations
      .retryRun(principal.accountId, runId)
      .then(presentRun);
  }
}

function presentReport(report: EvaluationReportView): EvaluationReportResponse {
  return {
    id: report.id,
    runId: report.runId,
    definitionId: report.definitionId,
    brandId: report.brandId,
    brandSnapshot: publicEvaluationBrandSnapshot(report.brandSnapshot),
    brandInformationChanged: report.brandInformationChanged,
    startedAt: report.startedAt,
    acceptedAt: report.acceptedAt,
    document: report.document,
    questions: report.questions,
  };
}

function presentDefinition(
  definition: EvaluationDefinitionView,
): EvaluationDefinitionResponse {
  return {
    id: definition.id,
    brandId: definition.brandId,
    brandSnapshot: publicEvaluationBrandSnapshot(definition.brandSnapshot),
    questions: definition.questions,
    platforms: definition.platforms.map(({ key, label }) => ({ key, label })),
    run: definition.run ? presentRun(definition.run) : null,
    createdAt: definition.createdAt,
  };
}

function presentDefinitionPreparation(
  preparation: EvaluationDefinitionPreparationView,
): EvaluationDefinitionPreparationResponse {
  return {
    status: preparation.status,
    preparationId: preparation.preparationId,
    definition: preparation.definition
      ? presentDefinition(preparation.definition)
      : null,
  };
}

function presentRun(run: EvaluationRunView): EvaluationRunResponse {
  return {
    id: run.id,
    definitionId: run.definitionId,
    brandId: run.brandId,
    status: run.status,
    expectedSampleCount: run.expectedSampleCount,
    processedSampleCount: run.processedSampleCount,
    validSampleCount: run.validSampleCount,
    unavailableSampleCount: run.unavailableSampleCount,
    phase: run.phase,
    platformProgress: run.platformProgress,
    startedAt: run.startedAt,
    updatedAt: run.updatedAt,
  };
}
