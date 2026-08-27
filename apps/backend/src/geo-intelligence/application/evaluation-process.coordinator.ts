import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import { AiExecutionService } from "../../ai-execution/application/ai-execution.service.js";
import {
  EVALUATION_PROCESS_REPOSITORY,
  type EvaluationProcessRepository,
} from "../domain/evaluation-process.repository.js";
import type {
  AcceptedEvidence,
  AcceptedInterpretation,
} from "../domain/evaluation-process.types.js";

const MAX_PURPOSE_ATTEMPTS = 2;

const runStartedSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
});

const sampleWorkSchema = z.object({
  cycleId: z.string().uuid(),
  sampleId: z.string().uuid(),
  attemptNumber: z.number().int().min(1).max(MAX_PURPOSE_ATTEMPTS),
});

const readinessSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
});

const acquisitionOutputSchema = z.object({
  kind: z.literal("ACQUISITION"),
  answerContent: z.string().min(1),
  answerFormat: z.literal("MARKDOWN"),
  sourceMetadata: z.array(z.record(z.string(), z.unknown())),
  searchUsed: z.boolean(),
  returnedModel: z.string().min(1),
});

const interpretationOutputSchema = z
  .object({
    kind: z.literal("INTERPRETATION"),
    mentioned: z.boolean(),
    position: z.number().int().positive().nullable(),
    relevantDescription: z.string().min(1).nullable(),
    characteristics: z.array(z.record(z.string(), z.unknown())).max(10),
    objectiveSummary: z.string().min(1),
    structuredEvidence: z.record(z.string(), z.unknown()),
  })
  .superRefine((value, context) => {
    if (value.mentioned && value.position === null) {
      context.addIssue({
        code: "custom",
        message: "A mentioned brand requires a relative position",
      });
    }
    if (!value.mentioned && value.position !== null) {
      context.addIssue({
        code: "custom",
        message: "A non-mentioned brand cannot have a position",
      });
    }
  });

@Injectable()
export class EvaluationProcessCoordinator {
  constructor(
    @Inject(EVALUATION_PROCESS_REPOSITORY)
    private readonly repository: EvaluationProcessRepository,
    @Inject(AiExecutionService)
    private readonly aiExecution: AiExecutionService,
  ) {}

  async process(event: {
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    switch (event.eventType) {
      case "evaluation.run.started": {
        const payload = runStartedSchema.parse(event.payload);
        await this.repository.initializeRun(payload.runId, payload.cycleId);
        return;
      }
      case "evaluation.sample.acquire.requested": {
        await this.acquire(sampleWorkSchema.parse(event.payload));
        return;
      }
      case "evaluation.sample.interpret.requested": {
        await this.interpret(sampleWorkSchema.parse(event.payload));
        return;
      }
      case "evaluation.run.readiness.requested": {
        const payload = readinessSchema.parse(event.payload);
        await this.repository.evaluateReadiness(payload.runId, payload.cycleId);
        return;
      }
      default:
        throw new Error(`Unsupported evaluation event ${event.eventType}`);
    }
  }

  reconcile(limit = 100): Promise<number> {
    return this.repository.reconcile(limit);
  }

  private async acquire(payload: z.infer<typeof sampleWorkSchema>) {
    const context = await this.repository.getSampleContext(
      payload.sampleId,
      payload.cycleId,
    );
    if (!context || context.status !== "PENDING") return;
    const outcome = await this.aiExecution.execute({
      cycleId: context.cycleId,
      sampleId: context.sampleId,
      purpose: "EVALUATION_ACQUISITION",
      attemptNumber: payload.attemptNumber,
      routePolicyId: context.routePolicyId,
      providerKey: context.platformKey,
      requestedModel: context.requestedModel,
      correlationId: context.correlationId,
      input: {
        companyName: context.companyName,
        query: context.query,
        questionOrdinal: context.questionOrdinal,
        platformLabel: context.platformLabel,
      },
    });
    if (outcome.kind === "FAILED") {
      await this.handleFailure({
        context,
        purpose: "EVALUATION_ACQUISITION",
        attemptId: outcome.attemptId,
        attemptNumber: payload.attemptNumber,
        failureClass: outcome.failureClass,
        retryable: outcome.retryable,
      });
      return;
    }
    const output = acquisitionOutputSchema.parse(outcome.output);
    const evidence: AcceptedEvidence = output;
    await this.repository.acceptEvidence({
      context,
      attemptId: outcome.attemptId,
      evidence,
    });
  }

  private async interpret(payload: z.infer<typeof sampleWorkSchema>) {
    const context = await this.repository.getSampleContext(
      payload.sampleId,
      payload.cycleId,
    );
    if (
      !context ||
      context.status !== "EVIDENCE_ACCEPTED" ||
      !context.evidence
    ) {
      return;
    }
    const outcome = await this.aiExecution.execute({
      cycleId: context.cycleId,
      sampleId: context.sampleId,
      purpose: "EVALUATION_INTERPRETATION",
      attemptNumber: payload.attemptNumber,
      routePolicyId: "evaluation.interpretation.deterministic@1",
      providerKey: "deterministic-parser",
      requestedModel: "deterministic-parser-v1",
      correlationId: context.correlationId,
      input: {
        companyName: context.companyName,
        answerContent: context.evidence.answerContent,
        questionOrdinal: context.questionOrdinal,
        platformLabel: context.platformLabel,
      },
    });
    if (outcome.kind === "FAILED") {
      await this.handleFailure({
        context,
        purpose: "EVALUATION_INTERPRETATION",
        attemptId: outcome.attemptId,
        attemptNumber: payload.attemptNumber,
        failureClass: outcome.failureClass,
        retryable: outcome.retryable,
      });
      return;
    }
    const output = interpretationOutputSchema.parse(outcome.output);
    const interpretation: AcceptedInterpretation = output;
    await this.repository.acceptInterpretation({
      context,
      attemptId: outcome.attemptId,
      interpretation,
    });
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
  }): Promise<void> {
    const failure = {
      cycleId: input.context.cycleId,
      sampleId: input.context.sampleId,
      purpose: input.purpose,
      attemptId: input.attemptId,
      attemptNumber: input.attemptNumber,
      failureClass: input.failureClass,
      reason: "Deterministic purpose policy exhausted",
      correlationId: input.context.correlationId,
    };
    if (input.retryable && input.attemptNumber < MAX_PURPOSE_ATTEMPTS) {
      await this.repository.scheduleRetry(failure);
      return;
    }
    await this.repository.exhaustStage(failure);
  }
}
