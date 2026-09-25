import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  evaluationBrandTextContext,
  parseEvaluationBrandSnapshot,
} from "../domain/evaluation-brand-snapshot.js";
import type { EvaluationProcessRepository } from "../domain/evaluation-process.repository.js";
import {
  evaluationReadinessRequestedEvent,
  evaluationRetryRequiredEvent,
  sampleWorkRequestedEvent,
} from "../domain/evaluation-process.events.js";
import { synthesisRequestedEvent } from "../domain/evaluation-synthesis.events.js";
import type {
  AcceptedEvidence,
  AcceptedInterpretation,
  BrowserSamplingBatchContext,
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

@Injectable()
export class PostgresEvaluationProcessRepository implements EvaluationProcessRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async initializeRun(
    runId: string,
    cycleId: string,
    sampling:
      | { mode: "ai-provider" }
      | { mode: "browser-control-plane"; accountAlias: string },
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const run = await transaction.evaluationRun.findFirstOrThrow({
        where: {
          id: runId,
          status: "EVALUATING",
          executionCycles: { some: { id: cycleId, status: "ACTIVE" } },
        },
        include: {
          definition: { select: { questionGeneratorVersion: true } },
          samples: {
            include: {
              question: { select: { ordinal: true } },
            },
          },
        },
      });
      await transaction.evaluationRun.updateMany({
        where: { id: runId, stage: "QUEUED" },
        data: { stage: "PROCESSING_EVIDENCE" },
      });
      if (sampling.mode === "browser-control-plane") {
        const grouped = groupSamplesByPlatform(run.samples);
        for (const [platformKey, samples] of grouped) {
          const ordered = [...samples].sort(
            (left, right) => left.question.ordinal - right.question.ordinal,
          );
          const batchId = randomUUID();
          const questionSetVersion = `${run.definitionId}:${run.definition.questionGeneratorVersion}`;
          await transaction.evaluationSamplingBatch.upsert({
            where: { cycleId_platformKey: { cycleId, platformKey } },
            create: {
              id: batchId,
              runId,
              cycleId,
              platformKey,
              accountAlias: sampling.accountAlias,
              questionSetVersion,
              idempotencyKey: browserSamplingIdempotencyKey({
                runId,
                cycleId,
                questionSetVersion,
                platformKey,
                accountAlias: sampling.accountAlias,
              }),
              expectedCount: ordered.length,
              sampleIds: ordered.map((sample) => sample.id),
            },
            update: {},
          });
        }
      }
      const workSamples =
        sampling.mode === "browser-control-plane"
          ? browserBatchLeaders(run.samples)
          : run.samples;
      await transaction.productOutboxEvent.createMany({
        data: workSamples.map((sample) =>
          sampleWorkRequestedEvent({
            runId,
            cycleId,
            sampleId: sample.id,
            purpose: "EVALUATION_ACQUISITION",
            attemptNumber: 1,
            correlationId: run.correlationId,
          }),
        ),
        skipDuplicates: true,
      });
    });
  }

  async getOrCreateBrowserSamplingBatch(input: {
    sampleId: string;
    runId: string;
    cycleId: string;
    accountAlias: string;
  }): Promise<BrowserSamplingBatchContext | undefined> {
    const selected = await this.prisma.evaluationSample.findFirst({
      where: {
        id: input.sampleId,
        runId: input.runId,
        run: {
          status: "EVALUATING",
          stage: "PROCESSING_EVIDENCE",
          executionCycles: {
            some: { id: input.cycleId, status: "ACTIVE" },
          },
        },
      },
      select: {
        platformKey: true,
        run: {
          select: {
            definitionId: true,
            correlationId: true,
            definition: { select: { questionGeneratorVersion: true } },
          },
        },
      },
    });
    if (!selected) return undefined;
    const questionSetVersion = `${selected.run.definitionId}:${selected.run.definition.questionGeneratorVersion}`;
    const existingBatch = await this.prisma.evaluationSamplingBatch.findUnique({
      where: {
        cycleId_platformKey: {
          cycleId: input.cycleId,
          platformKey: selected.platformKey,
        },
      },
      select: { id: true },
    });
    if (!existingBatch) {
      const pendingSamples = await this.prisma.evaluationSample.findMany({
        where: {
          runId: input.runId,
          platformKey: selected.platformKey,
          status: "PENDING",
        },
        include: { question: { select: { ordinal: true } } },
        orderBy: { question: { ordinal: "asc" } },
      });
      if (pendingSamples.length === 0) return undefined;
      try {
        await this.prisma.evaluationSamplingBatch.create({
          data: {
            runId: input.runId,
            cycleId: input.cycleId,
            platformKey: selected.platformKey,
            accountAlias: input.accountAlias,
            questionSetVersion,
            idempotencyKey: browserSamplingIdempotencyKey({
              runId: input.runId,
              cycleId: input.cycleId,
              questionSetVersion,
              platformKey: selected.platformKey,
              accountAlias: input.accountAlias,
            }),
            expectedCount: pendingSamples.length,
            sampleIds: pendingSamples.map((sample) => sample.id),
          },
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    let batch = await this.prisma.evaluationSamplingBatch.findUnique({
      where: {
        cycleId_platformKey: {
          cycleId: input.cycleId,
          platformKey: selected.platformKey,
        },
      },
      include: { run: { select: { correlationId: true } } },
    });
    if (!batch) return undefined;
    if (!Array.isArray(batch.sampleIds)) {
      throw new Error(`Browser sampling batch ${batch.id} has invalid samples`);
    }
    const sampleIds = batch.sampleIds.filter(
      (value): value is string => typeof value === "string",
    );
    const samples = await this.prisma.evaluationSample.findMany({
      where: { id: { in: sampleIds }, runId: input.runId },
      include: {
        question: { select: { id: true, content: true, ordinal: true } },
      },
    });
    const sampleById = new Map(samples.map((sample) => [sample.id, sample]));
    return {
      batchId: batch.id,
      runId: batch.runId,
      cycleId: batch.cycleId,
      platformKey: batch.platformKey,
      accountAlias: batch.accountAlias,
      idempotencyKey: batch.idempotencyKey,
      externalTaskId: batch.externalTaskId,
      status: batch.status,
      createdAt: batch.createdAt,
      submittedAt: batch.submittedAt,
      correlationId: batch.run.correlationId,
      samples: sampleIds.map((id) => {
        const sample = sampleById.get(id);
        if (!sample) {
          throw new Error(
            `Browser sampling batch ${batch.id} lost sample ${id}`,
          );
        }
        return {
          sampleId: sample.id,
          questionId: sample.question.id,
          query: sample.question.content,
          questionOrdinal: sample.question.ordinal,
          status: sample.status,
        };
      }),
    };
  }

  async markBrowserSamplingBatchSubmitted(
    batchId: string,
    externalTaskId: string,
  ): Promise<void> {
    await this.prisma.evaluationSamplingBatch.updateMany({
      where: { id: batchId, status: "PENDING" },
      data: {
        status: "SUBMITTED",
        externalTaskId,
        submittedAt: new Date(),
      },
    });
  }

  async completeBrowserSamplingBatch(input: {
    batchId: string;
    acquiredCount: number;
    failedCount: number;
    lateCount: number;
  }): Promise<void> {
    await this.prisma.evaluationSamplingBatch.updateMany({
      where: { id: input.batchId, status: { in: ["PENDING", "SUBMITTED"] } },
      data: {
        status: "COMPLETED",
        acquiredCount: input.acquiredCount,
        failedCount: input.failedCount,
        lateCount: input.lateCount,
        completedAt: new Date(),
      },
    });
  }

  async getSampleContext(
    sampleId: string,
    runId: string,
    cycleId: string,
  ): Promise<EvaluationSampleWorkContext | undefined> {
    const sample = await this.prisma.evaluationSample.findFirst({
      where: {
        id: sampleId,
        runId,
        run: {
          status: "EVALUATING",
          stage: "PROCESSING_EVIDENCE",
          executionCycles: {
            some: { id: cycleId, status: "ACTIVE" },
          },
        },
      },
      include: {
        evidence: { select: { answerContent: true } },
        question: { select: { content: true, kind: true, ordinal: true } },
        run: {
          select: {
            id: true,
            correlationId: true,
            definition: {
              select: {
                brandSnapshot: true,
                platformPolicy: true,
                objectivityProfileContent: true,
              },
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
    const snapshot = parseEvaluationBrandSnapshot(
      sample.run.definition.brandSnapshot,
    );
    return {
      runId: sample.run.id,
      cycleId,
      sampleId: sample.id,
      status: sample.status,
      companyName: evaluationBrandTextContext(snapshot).companyName,
      brandSnapshot: snapshot,
      query: sample.question.content,
      questionKind: sample.question.kind,
      questionOrdinal: sample.question.ordinal,
      platformKey: sample.platformKey,
      platformLabel: sample.platformLabel,
      routePolicyId: platform.routePolicyId,
      requestedModel: platform.model,
      objectivityInstruction: sample.run.definition.objectivityProfileContent,
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
            searchObservation: input.evidence.searchObservation,
            returnedModel: input.evidence.returnedModel,
          },
        });
        await transaction.productOutboxEvent.create({
          data: sampleWorkRequestedEvent({
            runId: input.context.runId,
            cycleId: input.context.cycleId,
            sampleId: input.context.sampleId,
            purpose: "EVALUATION_INTERPRETATION",
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
            semanticContractVersion:
              input.interpretation.semanticContractVersion,
            semanticPayload: input.interpretation
              .semanticPayload as Prisma.InputJsonValue,
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
        businessKey: sampleWorkRequestedEvent({
          runId: input.runId,
          cycleId: input.cycleId,
          sampleId: input.sampleId,
          purpose: input.purpose,
          attemptNumber: nextAttemptNumber,
          correlationId: input.correlationId,
        }).businessKey,
      },
      create: sampleWorkRequestedEvent({
        runId: input.runId,
        cycleId: input.cycleId,
        sampleId: input.sampleId,
        purpose: input.purpose,
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
          where: {
            id: input.sampleId,
            runId: input.runId,
            run: {
              status: "EVALUATING",
              stage: "PROCESSING_EVIDENCE",
              executionCycles: {
                some: { id: input.cycleId, status: "ACTIVE" },
              },
            },
          },
          select: { runId: true, status: true },
        });
        const expectedStatus =
          input.purpose === "EVALUATION_ACQUISITION"
            ? "PENDING"
            : "EVIDENCE_ACCEPTED";
        if (sample.status !== expectedStatus) return;
        await transaction.evaluationStageExhaustion.create({
          data: {
            runId: input.runId,
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
      const lifecycle = await transaction.evaluationExecutionCycle.findFirst({
        where: {
          id: cycleId,
          runId,
          status: "ACTIVE",
          run: {
            status: "EVALUATING",
            stage: "PROCESSING_EVIDENCE",
          },
        },
        select: {
          run: {
            select: {
              accountId: true,
              brandId: true,
              correlationId: true,
              definition: { select: { brandSnapshot: true } },
            },
          },
        },
      });
      if (!lifecycle) return;
      const counts = await transaction.evaluationSample.groupBy({
        by: ["status"],
        where: { runId },
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
          where: {
            id: runId,
            status: "EVALUATING",
            stage: "PROCESSING_EVIDENCE",
          },
          data: { stage: "READY_FOR_SYNTHESIS" },
        });
        const ready = await transaction.evaluationExecutionCycle.findFirst({
          where: {
            id: cycleId,
            runId,
            status: "READY_FOR_SYNTHESIS",
            run: {
              status: "EVALUATING",
              stage: "READY_FOR_SYNTHESIS",
            },
          },
          select: { run: { select: { correlationId: true } } },
        });
        if (ready) {
          await transaction.productOutboxEvent.createMany({
            data: [
              synthesisRequestedEvent({
                runId,
                cycleId,
                purpose: "BRAND_NAME_RESOLUTION",
                attemptNumber: 1,
                correlationId: ready.run.correlationId,
              }),
            ],
            skipDuplicates: true,
          });
        }
        return;
      }
      const exhaustedCycle =
        await transaction.evaluationExecutionCycle.updateMany({
          where: { id: cycleId, runId, status: "ACTIVE" },
          data: { status: "EXHAUSTED" },
        });
      const exhaustedRun = await transaction.evaluationRun.updateMany({
        where: {
          id: runId,
          status: "EVALUATING",
          stage: "PROCESSING_EVIDENCE",
        },
        data: { status: "PLEASE_RETRY" },
      });
      if (exhaustedCycle.count === 0) return;
      if (exhaustedRun.count !== 1) {
        throw new Error(
          "Evidence exhaustion lost its eligible lifecycle state",
        );
      }
      const snapshot = parseEvaluationBrandSnapshot(
        lifecycle.run.definition.brandSnapshot,
      );
      await transaction.productOutboxEvent.create({
        data: evaluationRetryRequiredEvent({
          accountId: lifecycle.run.accountId,
          brandId: lifecycle.run.brandId,
          brandName: evaluationBrandTextContext(snapshot).companyName,
          runId,
          cycleId,
          stage: "EVIDENCE",
          correlationId: lifecycle.run.correlationId,
        }),
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
      include: {
        attempts: {
          select: {
            cycleId: true,
            purpose: true,
            attemptNumber: true,
            status: true,
            retryable: true,
          },
        },
        run: {
          select: {
            correlationId: true,
            executionCycles: {
              where: { status: "ACTIVE" },
              orderBy: { sequence: "desc" },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
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
      const cycle = sample.run.executionCycles[0];
      if (!cycle) continue;
      const attemptNumber = recoveryAttemptNumber(
        sample.attempts.filter(
          (attempt) =>
            attempt.cycleId === cycle.id && attempt.purpose === purpose,
        ),
        purpose,
      );
      const result = await this.prisma.productOutboxEvent.createMany({
        data: [
          sampleWorkRequestedEvent({
            runId: sample.runId,
            cycleId: cycle.id,
            sampleId: sample.id,
            purpose,
            attemptNumber,
            correlationId: sample.run.correlationId,
          }),
        ],
        skipDuplicates: true,
      });
      recovered += result.count;
    }
    const activeCycles = await this.prisma.evaluationExecutionCycle.findMany({
      where: {
        status: "ACTIVE",
        run: { status: "EVALUATING", stage: "PROCESSING_EVIDENCE" },
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
      select: {
        id: true,
        runId: true,
        run: {
          select: {
            correlationId: true,
            samples: { select: { id: true, status: true } },
          },
        },
      },
    });
    for (const cycle of activeCycles) {
      if (
        cycle.run.samples.length !== 20 ||
        cycle.run.samples.some(
          (sample) =>
            !TERMINAL_SAMPLE_STATUSES.includes(
              sample.status as (typeof TERMINAL_SAMPLE_STATUSES)[number],
            ),
        )
      ) {
        continue;
      }
      const result = await this.prisma.productOutboxEvent.createMany({
        data: [
          evaluationReadinessRequestedEvent({
            runId: cycle.runId,
            cycleId: cycle.id,
            correlationId: cycle.run.correlationId,
          }),
        ],
        skipDuplicates: true,
      });
      recovered += result.count;
    }
    return recovered;
  }
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
    data: evaluationReadinessRequestedEvent({
      runId: input.runId,
      cycleId: input.cycleId,
      sourceSampleId: input.sampleId,
      correlationId: input.correlationId,
    }),
  });
}

function recoveryAttemptNumber(
  attempts: Array<{
    attemptNumber: number;
    status: "STARTED" | "SUCCEEDED" | "FAILED";
    retryable: boolean | null;
  }>,
  purpose: "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION",
): number {
  const latest = [...attempts].sort(
    (left, right) => right.attemptNumber - left.attemptNumber,
  )[0];
  if (!latest) return 1;
  const maximumAttempts = purpose === "EVALUATION_ACQUISITION" ? 2 : 3;
  return latest.status === "FAILED" && latest.retryable === true
    ? Math.min(latest.attemptNumber + 1, maximumAttempts)
    : latest.attemptNumber;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function groupSamplesByPlatform<T extends { platformKey: string }>(
  samples: readonly T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const sample of samples) {
    const group = grouped.get(sample.platformKey) ?? [];
    group.push(sample);
    grouped.set(sample.platformKey, group);
  }
  return grouped;
}

function browserBatchLeaders<
  T extends { platformKey: string; question: { ordinal: number } },
>(samples: readonly T[]): T[] {
  return [...groupSamplesByPlatform(samples).values()].map(
    (group) =>
      [...group].sort(
        (left, right) => left.question.ordinal - right.question.ordinal,
      )[0]!,
  );
}

function browserSamplingIdempotencyKey(input: {
  runId: string;
  cycleId: string;
  questionSetVersion: string;
  platformKey: string;
  accountAlias: string;
}): string {
  return createHash("sha256")
    .update(
      [
        input.runId,
        input.cycleId,
        input.questionSetVersion,
        input.platformKey,
        input.accountAlias,
      ].join(":"),
    )
    .digest("hex");
}
