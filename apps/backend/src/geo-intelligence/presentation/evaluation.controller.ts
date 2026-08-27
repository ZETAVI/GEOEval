import {
  Controller,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../../identity/presentation/session-http.js";
import { SessionGuard } from "../../identity/presentation/session.guard.js";
import { EvaluationService } from "../application/evaluation.service.js";
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
} from "./evaluation.dto.js";

@ApiTags("evaluation")
@ApiExtraModels(
  EvaluationDefinitionResponse,
  EvaluationBrandSnapshotResponse,
  EvaluationQuestionResponse,
  EvaluationPlatformResponse,
  EvaluationRunResponse,
)
@UseGuards(SessionGuard)
@Controller()
export class EvaluationController {
  constructor(
    @Inject(EvaluationService)
    private readonly evaluations: EvaluationService,
  ) {}

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
