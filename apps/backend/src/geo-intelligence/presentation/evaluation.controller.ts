import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../../identity/presentation/session-http.js";
import { SessionGuard } from "../../identity/presentation/session.guard.js";
import { EvaluationService } from "../application/evaluation.service.js";
import { EvaluationReportService } from "../application/evaluation-report.service.js";
import type { EvaluationReportView } from "../domain/evaluation-report.view.js";
import type {
  EvaluationDefinitionView,
  EvaluationRunView,
} from "../domain/evaluation.types.js";
import {
  EvaluationBrandSnapshotResponse,
  EvaluationDefinitionResponse,
  EvaluationPlatformResponse,
  EvaluationQuestionResponse,
  EvaluationRunResponse,
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
  EvaluationBrandSnapshotResponse,
  EvaluationQuestionResponse,
  EvaluationPlatformResponse,
  EvaluationRunResponse,
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
@UseGuards(SessionGuard)
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
    @Req() request: AuthenticatedRequest,
    @Param("brandId") brandId: string,
  ): Promise<CurrentEvaluationReportResponse> {
    return this.reports
      .current(request.geoevalAccount!.id, brandId)
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
    @Req() request: AuthenticatedRequest,
    @Param("brandId") brandId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<EvaluationReportHistoryResponse> {
    return this.reports.history(
      request.geoevalAccount!.id,
      brandId,
      limit,
      cursor,
    );
  }

  @Get("brands/:brandId/evaluation-reports/:reportId")
  @ApiOkResponse({ type: EvaluationReportResponse })
  @ApiParam({ name: "brandId", type: String })
  @ApiParam({ name: "reportId", type: String })
  reportDetail(
    @Req() request: AuthenticatedRequest,
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
  ): Promise<EvaluationReportResponse> {
    return this.reports
      .detail(request.geoevalAccount!.id, brandId, reportId)
      .then(presentReport);
  }

  @Put("brands/:brandId/evaluation-definition")
  @ApiOkResponse({ type: EvaluationDefinitionResponse })
  prepareDefinition(
    @Req() request: AuthenticatedRequest,
    @Param("brandId") brandId: string,
  ): Promise<EvaluationDefinitionResponse> {
    return this.evaluations
      .prepareDefinition(request.geoevalAccount!.id, brandId)
      .then(presentDefinition);
  }

  @Post("evaluation-definitions/:definitionId/runs")
  @ApiCreatedResponse({ type: EvaluationRunResponse })
  startRun(
    @Req() request: AuthenticatedRequest,
    @Param("definitionId") definitionId: string,
  ): Promise<EvaluationRunResponse> {
    return this.evaluations
      .startRun(request.geoevalAccount!.id, definitionId)
      .then(presentRun);
  }

  @Post("evaluation-runs/:runId/retries")
  @HttpCode(200)
  @ApiOkResponse({ type: EvaluationRunResponse })
  @ApiParam({ name: "runId", type: String })
  retryRun(
    @Req() request: AuthenticatedRequest,
    @Param("runId") runId: string,
  ): Promise<EvaluationRunResponse> {
    return this.evaluations
      .retryRun(request.geoevalAccount!.id, runId)
      .then(presentRun);
  }
}

function presentReport(report: EvaluationReportView): EvaluationReportResponse {
  return {
    id: report.id,
    runId: report.runId,
    definitionId: report.definitionId,
    brandId: report.brandId,
    brandSnapshot: report.brandSnapshot,
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
    brandSnapshot: definition.brandSnapshot,
    questions: definition.questions,
    platforms: definition.platforms.map(({ key, label }) => ({ key, label })),
    run: definition.run ? presentRun(definition.run) : null,
    createdAt: definition.createdAt,
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
    startedAt: run.startedAt,
    updatedAt: run.updatedAt,
  };
}
