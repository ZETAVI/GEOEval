import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { EvaluationProcessRepository } from "../domain/evaluation-process.repository.js";
import type {
  AcceptedEvidence,
  AcceptedInterpretation,
  EvaluationSampleWorkContext,
  StageFailureInput,
} from "../domain/evaluation-process.types.js";

const TERMINAL_SAMPLE_STATUSES = [
  "INTERPRETATION_ACCEPTED",
  "ACQUISITION_EXHAUSTED",
  "INTERPRETATION_EXHAUSTED",
] as const;

const platformPolicySchema = z.array(
  z.object({
    key: z.string(),
    routePolicyId: z.string(),
    model: z.string(),
  }),
);

const brandSnapshotSchema = z.object({ companyName: z.string().min(1) });

@Injectable()
export class PostgresEvaluationProcessRepository implements EvaluationProcessRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async initializeRun(runId: string, cycleId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const run = await transaction.evaluationRun.findFirstOrThrow({
        where: {
          id: runId,
          status: "EVALUATING",
          executionCycles: { some: { id: cycleId, status: "ACTIVE" } },
        },
        include: { samples: { select: { id: true } } },
      });
      await transaction.evaluationRun.updateMany({
        where: { id: runId, stage: "QUEUED" },
        data: { stage: "PROCESSING_EVIDENCE" },
      });
      await transaction.productOutboxEvent.createMany({
        data: run.samples.map((sample) =>
          acquisitionEvent({
            cycleId,
            sampleId: sample.id,
            attemptNumber: 1,
            correlationId: run.correlationId,
          }),
        ),
        skipDuplicates: true,
      });
    });
  }

  async getSampleContext(
    sampleId: string,
    cycleId: string,
  ): Promise<EvaluationSampleWorkContext | undefined> {
    const sample = await this.prisma.evaluationSample.findFirst({
      where: { id: sampleId, cycleId },
      include: {
        evidence: { select: { answerContent: true } },
        question: { select: { content: true, ordinal: true } },
        run: {
          select: {
            id: true,
            correlationId: true,
            definition: {
              select: { brandSnapshot: true, platformPolicy: true },
            },
          },
        },
      },
    });
    if (!sample) return undefined;
    const platforms = platformPolicySchema.parse(
      sample.run.definition.platformPolicy,
    );
    const platform = platforms.find((item) => item.key === sample.platformKey);
    if (!platform) {
      throw new Error(`No platform policy for sample ${sample.id}`);
    }
    const snapshot = brandSnapshotSchema.parse(
      sample.run.definition.brandSnapshot,
    );
    return {
      runId: sample.run.id,
      cycleId: sample.cycleId,
      sampleId: sample.id,
      status: sample.status,
      companyName: snapshot.companyName,
      query: sample.question.content,
      questionOrdinal: sample.question.ordinal,
      platformKey: sample.platformKey,
      platformLabel: sample.platformLabel,
      routePolicyId: platform.routePolicyId,
      requestedModel: platform.model,
      correlationId: sample.run.correlationId,
      evidence: sample.evidence,
    };
  }

  async acceptEvidence(input: {
    context: EvaluationSampleWorkContext;
    attemptId: string;
    evidence: AcceptedEvidence;
  }): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const transitioned = await transaction.evaluationSample.updateMany({
          where: { id: input.context.sampleId, status: "PENDING" },
          data: { status: "EVIDENCE_ACCEPTED" },
        });
        if (transitioned.count === 0) return;
        await transaction.evaluationSampleEvidence.create({
          data: {
            sampleId: input.context.sampleId,
            acceptedAttemptId: input.attemptId,
            answerContent: input.evidence.answerContent,
            answerFormat: input.evidence.answerFormat,
            sourceMetadata: input.evidence
              .sourceMetadata as Prisma.InputJsonValue,
            searchUsed: input.evidence.searchUsed,
            returnedModel: input.evidence.returnedModel,
          },
        });
        await transaction.productOutboxEvent.create({
          data: interpretationEvent({
            cycleId: input.context.cycleId,
            sampleId: input.context.sampleId,
            attemptNumber: 1,
            correlationId: input.context.correlationId,
          }),
        });
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  async acceptInterpretation(input: {
    context: EvaluationSampleWorkContext;
    attemptId: string;
    interpretation: AcceptedInterpretation;
  }): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const transitioned = await transaction.evaluationSample.updateMany({
          where: {
            id: input.context.sampleId,
            status: "EVIDENCE_ACCEPTED",
          },
          data: { status: "INTERPRETATION_ACCEPTED" },
        });
        if (transitioned.count === 0) return;
        await transaction.evaluationSampleInterpretation.create({
          data: {
            sampleId: input.context.sampleId,
            acceptedAttemptId: input.attemptId,
            mentioned: input.interpretation.mentioned,
            position: input.interpretation.position,
            relevantDescription: input.interpretation.relevantDescription,
            characteristics: input.interpretation
              .characteristics as Prisma.InputJsonValue,
            objectiveSummary: input.interpretation.objectiveSummary,
            structuredEvidence: input.interpretation
              .structuredEvidence as Prisma.InputJsonValue,
          },
        });
        await appendReadinessEvent(transaction, input.context);
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  async scheduleRetry(input: StageFailureInput): Promise<void> {
    const nextAttemptNumber = input.attemptNumber + 1;
    await this.prisma.productOutboxEvent.upsert({
      where: {
        businessKey: stageBusinessKey(
          input.sampleId,
          input.purpose,
          nextAttemptNumber,
        ),
      },
      create:
        input.purpose === "EVALUATION_ACQUISITION"
          ? acquisitionEvent({
              cycleId: input.cycleId,
              sampleId: input.sampleId,
              attemptNumber: nextAttemptNumber,
              correlationId: input.correlationId,
            })
          : interpretationEvent({
              cycleId: input.cycleId,
              sampleId: input.sampleId,
              attemptNumber: nextAttemptNumber,
              correlationId: input.correlationId,
            }),
      update: {},
    });
  }

  async exhaustStage(input: StageFailureInput): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const sample = await transaction.evaluationSample.findFirstOrThrow({
          where: { id: input.sampleId, cycleId: input.cycleId },
          select: { runId: true, status: true },
        });
        const expectedStatus =
          input.purpose === "EVALUATION_ACQUISITION"
            ? "PENDING"
            : "EVIDENCE_ACCEPTED";
        if (sample.status !== expectedStatus) return;
        await transaction.evaluationStageExhaustion.create({
          data: {
            cycleId: input.cycleId,
            sampleId: input.sampleId,
            purpose: input.purpose,
            lastAttemptId: input.attemptId,
            failureClass: input.failureClass,
            reason: input.reason,
          },
        });
        await transaction.evaluationSample.update({
          where: { id: input.sampleId },
          data: {
            status:
              input.purpose === "EVALUATION_ACQUISITION"
                ? "ACQUISITION_EXHAUSTED"
                : "INTERPRETATION_EXHAUSTED",
          },
        });
        await appendReadinessEvent(transaction, {
          runId: sample.runId,
          cycleId: input.cycleId,
          sampleId: input.sampleId,
          correlationId: input.correlationId,
        });
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  async evaluateReadiness(runId: string, cycleId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const counts = await transaction.evaluationSample.groupBy({
        by: ["status"],
        where: { runId, cycleId },
        _count: { _all: true },
      });
      const countOf = (status: (typeof TERMINAL_SAMPLE_STATUSES)[number]) =>
        counts.find((item) => item.status === status)?._count._all ?? 0;
      const valid = countOf("INTERPRETATION_ACCEPTED");
      const terminal = TERMINAL_SAMPLE_STATUSES.reduce(
        (total, status) => total + countOf(status),
        0,
      );
      if (terminal < 20) return;
      if (valid >= 17) {
        await transaction.evaluationExecutionCycle.updateMany({
          where: { id: cycleId, runId, status: "ACTIVE" },
          data: { status: "READY_FOR_SYNTHESIS" },
        });
        await transaction.evaluationRun.updateMany({
          where: { id: runId, status: "EVALUATING" },
          data: { stage: "READY_FOR_SYNTHESIS" },
        });
        return;
      }
      await transaction.evaluationExecutionCycle.updateMany({
        where: { id: cycleId, runId, status: "ACTIVE" },
        data: { status: "EXHAUSTED" },
      });
      await transaction.evaluationRun.updateMany({
        where: { id: runId, status: "EVALUATING" },
        data: { status: "PLEASE_RETRY" },
      });
    });
  }

  async reconcile(limit: number): Promise<number> {
    const samples = await this.prisma.evaluationSample.findMany({
      where: {
        run: { status: "EVALUATING", stage: "PROCESSING_EVIDENCE" },
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
      include: { run: { select: { correlationId: true } } },
    });
    let recovered = 0;
    for (const sample of samples) {
      const purpose =
        sample.status === "PENDING"
          ? "EVALUATION_ACQUISITION"
          : sample.status === "EVIDENCE_ACCEPTED"
            ? "EVALUATION_INTERPRETATION"
            : undefined;
      if (!purpose) continue;
      const attemptNumber = 1;
      const result = await this.prisma.productOutboxEvent.createMany({
        data: [
          eventForPurpose(purpose, {
            cycleId: sample.cycleId,
            sampleId: sample.id,
            attemptNumber,
            correlationId: sample.run.correlationId,
          }),
        ],
        skipDuplicates: true,
      });
      recovered += result.count;
    }
    return recovered;
  }
}

type EventIdentity = {
  cycleId: string;
  sampleId: string;
  attemptNumber: number;
  correlationId: string;
};

function acquisitionEvent(input: EventIdentity) {
  return eventForPurpose("EVALUATION_ACQUISITION", input);
}

function interpretationEvent(input: EventIdentity) {
  return eventForPurpose("EVALUATION_INTERPRETATION", input);
}

function eventForPurpose(
  purpose: "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION",
  input: EventIdentity,
) {
  return {
    businessKey: stageBusinessKey(input.sampleId, purpose, input.attemptNumber),
    aggregateType: "evaluation_sample",
    aggregateId: input.sampleId,
    eventType:
      purpose === "EVALUATION_ACQUISITION"
        ? "evaluation.sample.acquire.requested"
        : "evaluation.sample.interpret.requested",
    payload: {
      cycleId: input.cycleId,
      sampleId: input.sampleId,
      attemptNumber: input.attemptNumber,
    },
    correlationId: input.correlationId,
  };
}

function stageBusinessKey(
  sampleId: string,
  purpose: "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION",
  attemptNumber: number,
): string {
  const stage =
    purpose === "EVALUATION_ACQUISITION" ? "acquisition" : "interpretation";
  return `evaluation-sample:${sampleId}:${stage}:${attemptNumber}`;
}

async function appendReadinessEvent(
  transaction: Prisma.TransactionClient,
  input: {
    runId: string;
    cycleId: string;
    sampleId: string;
    correlationId: string;
  },
): Promise<void> {
  await transaction.productOutboxEvent.create({
    data: {
      businessKey: `evaluation-sample:${input.sampleId}:readiness`,
      aggregateType: "evaluation_run",
      aggregateId: input.runId,
      eventType: "evaluation.run.readiness.requested",
      payload: { runId: input.runId, cycleId: input.cycleId },
      correlationId: input.correlationId,
    },
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
