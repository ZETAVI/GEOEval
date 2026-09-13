import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import { AiSynthesisExecutionService } from "../../ai-execution/application/ai-synthesis-execution.service.js";
import { buildBrandNameResolutionTask } from "../brand-name-resolution.policy.js";
import {
  BRAND_NAME_RESOLUTION_CONTRACT_VERSION,
  BRAND_NAME_RESOLUTION_MODEL_CONTRACT_VERSION,
  BrandNameResolutionSemanticError,
  parseBrandNameResolution,
} from "../domain/brand-name-resolution.contract.js";
import {
  EVALUATION_SYNTHESIS_REPOSITORY,
  type EvaluationSynthesisRepository,
} from "../domain/evaluation-synthesis.repository.js";
import type { EvaluationSynthesisContext } from "../domain/evaluation-synthesis.types.js";
import {
  EVALUATION_PROCESS_COMPLETED,
  type EvaluationProcessResult,
} from "../domain/evaluation-process.result.js";
import { OVERALL_SYNTHESIS_CONTRACT_VERSION } from "../domain/overall-synthesis.contract.js";
import {
  REPORT_COMPOSITION_MODEL_CONTRACT_VERSION,
  ReportCompositionSemanticError,
  parseAndProjectReportComposition,
} from "../domain/report-composition.contract.js";
import { buildReportCompositionTask } from "../report-composition.policy.js";

const ANALYSIS_ROUTES = {
  BRAND_NAME_RESOLUTION: {
    routePolicyId: "evaluation.brand-name-resolution.deepseek@1",
    requestedModel: "deepseek-v4-flash-0731",
  },
  REPORT_COMPOSITION: {
    routePolicyId: "evaluation.report-composition.deepseek@1",
    requestedModel: "deepseek-v4-flash-0731",
  },
} as const;
const MAX_ANALYSIS_ATTEMPTS = 2;

const synthesisWorkSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
  attemptNumber: z.number().int().min(1).max(MAX_ANALYSIS_ATTEMPTS),
  purpose: z
    .enum(["BRAND_NAME_RESOLUTION", "REPORT_COMPOSITION"])
    .default("BRAND_NAME_RESOLUTION"),
});

@Injectable()
export class EvaluationSynthesisCoordinator {
  constructor(
    @Inject(EVALUATION_SYNTHESIS_REPOSITORY)
    private readonly repository: EvaluationSynthesisRepository,
    @Inject(AiSynthesisExecutionService)
    private readonly aiExecution: AiSynthesisExecutionService,
  ) {}

  async process(
    payload: Record<string, unknown>,
  ): Promise<EvaluationProcessResult> {
    const work = synthesisWorkSchema.parse(payload);
    const context = await this.repository.getContext(work.runId, work.cycleId);
    if (!context) return EVALUATION_PROCESS_COMPLETED;
    if (work.purpose === "REPORT_COMPOSITION" && !context.resolution) {
      return EVALUATION_PROCESS_COMPLETED;
    }
    const route = ANALYSIS_ROUTES[work.purpose];
    const outcome = await this.aiExecution.execute({
      runId: context.runId,
      cycleId: context.cycleId,
      purpose: work.purpose,
      attemptNumber: work.attemptNumber,
      routePolicyId: route.routePolicyId,
      requestedModel: route.requestedModel,
      correlationId: context.correlationId,
      input:
        work.purpose === "BRAND_NAME_RESOLUTION"
          ? buildBrandNameResolutionTask(context.samples)
          : buildReportCompositionTask({
              brand: context.brand,
              samples: context.samples,
              metrics: context.metrics,
              resolution: context.resolution!,
            }),
    });
    if (outcome.kind === "DEFERRED") return outcome;
    if (outcome.kind === "FAILED") {
      await this.handleFailure({
        context,
        purpose: work.purpose,
        attemptId: outcome.attemptId,
        attemptNumber: work.attemptNumber,
        failureClass: outcome.failureClass,
        retryable: outcome.retryable,
        reason: `${work.purpose} execution failed`,
      });
      return EVALUATION_PROCESS_COMPLETED;
    }

    try {
      if (work.purpose === "BRAND_NAME_RESOLUTION") {
        const resolution = parseBrandNameResolution(
          outcome.output,
          context.samples,
          context.brand.companyName,
        );
        await this.repository.acceptResolution({
          runId: context.runId,
          cycleId: context.cycleId,
          attemptId: outcome.attemptId,
          resolution,
        });
      } else {
        const projected = parseAndProjectReportComposition({
          output: outcome.output,
          focusBrand: context.brand.companyName,
          samples: context.samples,
          metrics: context.metrics,
          resolution: context.resolution!,
        });
        await this.repository.acceptReport({
          runId: context.runId,
          cycleId: context.cycleId,
          attemptId: outcome.attemptId,
          synthesis: projected.synthesis,
          metrics: projected.metrics,
        });
      }
    } catch (error) {
      if (
        !(error instanceof z.ZodError) &&
        !(error instanceof BrandNameResolutionSemanticError) &&
        !(error instanceof ReportCompositionSemanticError)
      ) {
        throw error;
      }
      await this.aiExecution.rejectSemantics(outcome.attemptId, {
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        modelContractVersion:
          work.purpose === "BRAND_NAME_RESOLUTION"
            ? BRAND_NAME_RESOLUTION_MODEL_CONTRACT_VERSION
            : REPORT_COMPOSITION_MODEL_CONTRACT_VERSION,
        domainContractVersion:
          work.purpose === "BRAND_NAME_RESOLUTION"
            ? BRAND_NAME_RESOLUTION_CONTRACT_VERSION
            : OVERALL_SYNTHESIS_CONTRACT_VERSION,
      });
      await this.handleFailure({
        context,
        purpose: work.purpose,
        attemptId: outcome.attemptId,
        attemptNumber: work.attemptNumber,
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        retryable: true,
        reason: `${work.purpose} output failed its semantic contract`,
      });
    }
    return EVALUATION_PROCESS_COMPLETED;
  }

  reconcile(limit: number): Promise<number> {
    return this.repository.reconcile(limit);
  }

  private async handleFailure(input: {
    context: EvaluationSynthesisContext;
    purpose: "BRAND_NAME_RESOLUTION" | "REPORT_COMPOSITION";
    attemptId: string;
    attemptNumber: number;
    failureClass: string;
    retryable: boolean;
    reason: string;
  }): Promise<void> {
    const failure = {
      runId: input.context.runId,
      cycleId: input.context.cycleId,
      purpose: input.purpose,
      attemptId: input.attemptId,
      attemptNumber: input.attemptNumber,
      failureClass: input.failureClass,
      reason: input.reason,
      correlationId: input.context.correlationId,
    };
    if (input.retryable && input.attemptNumber < MAX_ANALYSIS_ATTEMPTS) {
      await this.repository.scheduleRetry(failure);
      return;
    }
    await this.repository.exhaust(failure);
  }
}
