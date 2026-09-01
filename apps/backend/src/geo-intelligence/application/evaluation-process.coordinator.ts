import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import { AiExecutionService } from "../../ai-execution/application/ai-execution.service.js";
import {
  EVALUATION_PROCESS_REPOSITORY,
  type EvaluationProcessRepository,
} from "../domain/evaluation-process.repository.js";
import {
  parseAcceptedEvidence,
  type AcceptedInterpretation,
} from "../domain/evaluation-process.types.js";
import {
  EVALUATION_PROCESS_COMPLETED,
  type EvaluationProcessResult,
} from "../domain/evaluation-process.result.js";
import {
  SAMPLE_PARSER_CONTRACT_VERSION,
  SampleParserSemanticError,
} from "../domain/sample-parser.contract.js";
import {
  SAMPLE_PARSER_MODEL_CONTRACT_VERSION,
  parseAndProjectSampleParserModelOutput,
} from "../domain/sample-parser-model.contract.js";
import { evaluationBrandTextContext } from "../domain/evaluation-brand-snapshot.js";
import { buildSampleParserTask } from "../sample-parser.policy.js";
import { EvaluationSynthesisCoordinator } from "./evaluation-synthesis.coordinator.js";

const MAX_ACQUISITION_ATTEMPTS = 2;

const INTERPRETATION_ROUTES = [
  {
    routePolicyId: "evaluation.interpretation.qwen-primary@1",
    requestedModel: "qwen3.8-flash",
  },
  {
    routePolicyId: "evaluation.interpretation.qwen-primary@1",
    requestedModel: "qwen3.8-flash",
  },
  {
    routePolicyId: "evaluation.interpretation.hy3-fallback@1",
    requestedModel: "hy3",
  },
] as const;

const runStartedSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
});

const acquisitionWorkSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
  sampleId: z.string().uuid(),
  attemptNumber: z.number().int().min(1).max(MAX_ACQUISITION_ATTEMPTS),
});

const interpretationWorkSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
  sampleId: z.string().uuid(),
  attemptNumber: z.number().int().min(1).max(INTERPRETATION_ROUTES.length),
});

const readinessSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
});

@Injectable()
export class EvaluationProcessCoordinator {
  constructor(
    @Inject(EVALUATION_PROCESS_REPOSITORY)
    private readonly repository: EvaluationProcessRepository,
    @Inject(AiExecutionService)
    private readonly aiExecution: AiExecutionService,
    @Inject(EvaluationSynthesisCoordinator)
    private readonly synthesis: EvaluationSynthesisCoordinator,
  ) {}

  async process(event: {
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<EvaluationProcessResult> {
    switch (event.eventType) {
      case "evaluation.run.started": {
        const payload = runStartedSchema.parse(event.payload);
        await this.repository.initializeRun(payload.runId, payload.cycleId);
        return EVALUATION_PROCESS_COMPLETED;
      }
      case "evaluation.sample.acquire.requested": {
        return this.acquire(acquisitionWorkSchema.parse(event.payload));
      }
      case "evaluation.sample.interpret.requested": {
        return this.interpret(interpretationWorkSchema.parse(event.payload));
      }
      case "evaluation.run.readiness.requested": {
        const payload = readinessSchema.parse(event.payload);
        await this.repository.evaluateReadiness(payload.runId, payload.cycleId);
        return EVALUATION_PROCESS_COMPLETED;
      }
      case "evaluation.run.synthesize.requested": {
        return this.synthesis.process(event.payload);
      }
      default:
        throw new Error(`Unsupported evaluation event ${event.eventType}`);
    }
  }

  async reconcile(limit = 100): Promise<number> {
    const sampleRecovered = await this.repository.reconcile(limit);
    const synthesisRecovered = await this.synthesis.reconcile(limit);
    return sampleRecovered + synthesisRecovered;
  }

  private async acquire(payload: z.infer<typeof acquisitionWorkSchema>) {
    const context = await this.repository.getSampleContext(
      payload.sampleId,
      payload.runId,
      payload.cycleId,
    );
    if (!context || context.status !== "PENDING") {
      return EVALUATION_PROCESS_COMPLETED;
    }
    const brand = evaluationBrandTextContext(context.brandSnapshot);
    const outcome = await this.aiExecution.execute({
      runId: context.runId,
      cycleId: context.cycleId,
      sampleId: context.sampleId,
      purpose: "EVALUATION_ACQUISITION",
      attemptNumber: payload.attemptNumber,
      routePolicyId: context.routePolicyId,
      requestedModel: context.requestedModel,
      correlationId: context.correlationId,
      input: {
        taskKind: "EVALUATION_ACQUISITION",
        systemInstruction: context.objectivityInstruction,
        companyName: context.companyName,
        query: context.query,
        questionOrdinal: context.questionOrdinal,
        platformLabel: context.platformLabel,
        province: brand.province,
        city: brand.city,
      },
    });
    if (outcome.kind === "DEFERRED") return outcome;
    if (outcome.kind === "FAILED") {
      await this.handleFailure({
        context,
        purpose: "EVALUATION_ACQUISITION",
        attemptId: outcome.attemptId,
        attemptNumber: payload.attemptNumber,
        failureClass: outcome.failureClass,
        retryable: outcome.retryable,
      });
      return EVALUATION_PROCESS_COMPLETED;
    }
    const evidence = parseAcceptedEvidence(outcome.output);
    await this.repository.acceptEvidence({
      context,
      attemptId: outcome.attemptId,
      evidence,
    });
    return EVALUATION_PROCESS_COMPLETED;
  }

  private async interpret(payload: z.infer<typeof interpretationWorkSchema>) {
    const context = await this.repository.getSampleContext(
      payload.sampleId,
      payload.runId,
      payload.cycleId,
    );
    if (
      !context ||
      context.status !== "EVIDENCE_ACCEPTED" ||
      !context.evidence
    ) {
      return EVALUATION_PROCESS_COMPLETED;
    }
    const brand = evaluationBrandTextContext(context.brandSnapshot);
    const parserTask = buildSampleParserTask({
      companyName: brand.companyName,
      primaryIndustry: brand.primaryIndustry,
      secondaryIndustry: brand.secondaryIndustry,
      region: [brand.province, brand.city, brand.terminalRegion]
        .filter(Boolean)
        .join(""),
      characteristicOne: brand.characteristicOne,
      characteristicTwo: brand.characteristicTwo,
      questionKind: context.questionKind,
      question: context.query,
      originalAnswer: context.evidence.answerContent,
    });
    const route = INTERPRETATION_ROUTES[payload.attemptNumber - 1]!;
    const outcome = await this.aiExecution.execute({
      runId: context.runId,
      cycleId: context.cycleId,
      sampleId: context.sampleId,
      purpose: "EVALUATION_INTERPRETATION",
      attemptNumber: payload.attemptNumber,
      routePolicyId: route.routePolicyId,
      requestedModel: route.requestedModel,
      correlationId: context.correlationId,
      input: parserTask,
    });
    if (outcome.kind === "DEFERRED") return outcome;
    if (outcome.kind === "FAILED") {
      await this.handleFailure({
        context,
        purpose: "EVALUATION_INTERPRETATION",
        attemptId: outcome.attemptId,
        attemptNumber: payload.attemptNumber,
        failureClass: outcome.failureClass,
        retryable: outcome.retryable,
      });
      return EVALUATION_PROCESS_COMPLETED;
    }
    let output;
    try {
      output = parseAndProjectSampleParserModelOutput(outcome.output, {
        questionKind: context.questionKind,
        companyName: context.companyName,
        originalAnswer: context.evidence.answerContent,
      });
    } catch (error) {
      if (
        !(error instanceof z.ZodError) &&
        !(error instanceof SampleParserSemanticError)
      ) {
        throw error;
      }
      await this.aiExecution.rejectSemantics(outcome.attemptId, {
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        modelContractVersion: SAMPLE_PARSER_MODEL_CONTRACT_VERSION,
        domainContractVersion: SAMPLE_PARSER_CONTRACT_VERSION,
      });
      await this.handleFailure({
        context,
        purpose: "EVALUATION_INTERPRETATION",
        attemptId: outcome.attemptId,
        attemptNumber: payload.attemptNumber,
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        retryable: true,
        reason: "Parser output failed the accepted semantic contract",
      });
      return EVALUATION_PROCESS_COMPLETED;
    }
    const interpretation: AcceptedInterpretation = {
      mentioned: output.mentioned,
      position: output.position,
      semanticContractVersion: SAMPLE_PARSER_CONTRACT_VERSION,
      semanticPayload: output.semantic,
    };
    await this.repository.acceptInterpretation({
      context,
      attemptId: outcome.attemptId,
      interpretation,
    });
    return EVALUATION_PROCESS_COMPLETED;
  }

  private async handleFailure(input: {
    context: Awaited<
      ReturnType<EvaluationProcessRepository["getSampleContext"]>
    > & {};
    purpose: "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION";
    attemptId: string;
    attemptNumber: number;
    failureClass: string;
    retryable: boolean;
    reason?: string;
  }): Promise<void> {
    const failure = {
      runId: input.context.runId,
      cycleId: input.context.cycleId,
      sampleId: input.context.sampleId,
      purpose: input.purpose,
      attemptId: input.attemptId,
      attemptNumber: input.attemptNumber,
      failureClass: input.failureClass,
      reason: input.reason ?? "Deterministic purpose policy exhausted",
      correlationId: input.context.correlationId,
    };
    const maximumAttempts =
      input.purpose === "EVALUATION_ACQUISITION"
        ? MAX_ACQUISITION_ATTEMPTS
        : INTERPRETATION_ROUTES.length;
    if (input.retryable && input.attemptNumber < maximumAttempts) {
      await this.repository.scheduleRetry(failure);
      return;
    }
    await this.repository.exhaustStage(failure);
  }
}
