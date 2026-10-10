import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { buildAttemptEnvelope } from "../../ai-execution/domain/ai-attempt.envelope.js";
import { samplingCycleWindowData } from "./evaluation-sampling-window.js";
import {
  evaluationBrandTextContext,
  parseEvaluationBrandSnapshot,
} from "../domain/evaluation-brand-snapshot.js";
import type { EvaluationProcessRepository } from "../domain/evaluation-process.repository.js";
import {
  evaluationReadinessRequestedEvent,
  evaluationRetryRequiredEvent,
  sampleWorkRequestedEvent,
  samplingWindowRequestedEvent,
} from "../domain/evaluation-process.events.js";
import { synthesisRequestedEvent } from "../domain/evaluation-synthesis.events.js";
import type {
  AcceptedEvidence,
  AcceptedInterpretation,
  BrowserSamplingBatchContext,
  EvidenceAcceptanceResult,
  EvaluationSamplingWindow,
  ExecutionSamplingBatchContext,
  ExecutionSamplingItem,
  ExecutionSamplingSnapshot,
  ExecutionSamplingRequest,
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
      | { mode: "browser-control-plane"; accountAlias: string }
      | {
          mode: "execution-center";
          accountAlias: string;
          centerRef: string;
        } = { mode: "ai-provider" },
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const run = await transaction.evaluationRun.findFirst({
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
      if (!run) return;
      await transaction.evaluationRun.updateMany({
        where: { id: runId, stage: "QUEUED" },
        data: { stage: "PROCESSING_EVIDENCE" },
      });
      const currentCycle =
        await transaction.evaluationExecutionCycle.findUniqueOrThrow({
          where: { id: cycleId },
        });
      if (currentCycle.samplingClosedAt) return;
      // A persisted P4 cycle never silently turns into a fresh legacy batch.
      if (
        currentCycle.samplingStartedAt &&
        sampling.mode !== "execution-center"
      )
        return;
      if (sampling.mode === "execution-center") {
        const pending = run.samples.filter(
          (sample) => sample.status === "PENDING",
        );
        if (pending.length) {
          const cycle = await ensureSamplingWindow(transaction, runId, cycleId);
          for (const [platformKey, samples] of groupSamplesByPlatform(
            pending,
          )) {
            const batch = await reserveExecutionBatch(transaction, {
              runId,
              cycleId,
              platformKey,
              accountAlias: sampling.accountAlias,
              centerRef: sampling.centerRef,
              deadlineAt: cycle.deadlineAt,
            });
            if (!batch) continue;
            await transaction.productOutboxEvent.createMany({
              data: [
                sampleWorkRequestedEvent({
                  runId,
                  cycleId,
                  sampleId: samples.sort(
                    (a, b) => a.question.ordinal - b.question.ordinal,
                  )[0]!.id,
                  purpose: "EVALUATION_ACQUISITION",
                  attemptNumber: 1,
                  executionChannel: "WEB",
                  correlationId: run.correlationId,
                }),
              ],
              skipDuplicates: true,
            });
          }
          await transaction.productOutboxEvent.createMany({
            data: ["fallback", "deadline"].map((stage) =>
              samplingWindowRequestedEvent({
                runId,
                cycleId,
                stage: stage as "fallback" | "deadline",
                correlationId: run.correlationId,
              }),
            ),
            skipDuplicates: true,
          });
        }
        return;
      }
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
    return this.readSampleContext(sampleId, runId, cycleId);
  }

  async getOrCreateExecutionSamplingBatch(input: {
    sampleId: string;
    runId: string;
    cycleId: string;
    accountAlias: string;
    centerRef: string;
  }): Promise<ExecutionSamplingBatchContext | undefined> {
    return this.prisma.$transaction(async (transaction) => {
      const sample = await transaction.evaluationSample.findFirst({
        where: { id: input.sampleId, runId: input.runId },
        select: { platformKey: true },
      });
      if (!sample) return undefined;
      const cycle = await transaction.evaluationExecutionCycle.findFirst({
        where: {
          id: input.cycleId,
          runId: input.runId,
          status: "ACTIVE",
          run: {
            status: "EVALUATING",
            stage: { in: ["QUEUED", "PROCESSING_EVIDENCE"] },
          },
        },
      });
      if (!cycle) return undefined;
      const window =
        mapSamplingWindow(cycle) ??
        (await ensureSamplingWindow(transaction, input.runId, input.cycleId));
      const existing = await transaction.evaluationSamplingBatch.findUnique({
        where: {
          cycleId_platformKey: {
            cycleId: input.cycleId,
            platformKey: sample.platformKey,
          },
        },
      });
      if (!existing && (window.closedAt || new Date() >= window.deadlineAt))
        return undefined;
      const batch = await reserveExecutionBatch(transaction, {
        ...input,
        platformKey: sample.platformKey,
        deadlineAt: window.deadlineAt,
      });
      return batch ? mapExecutionBatch(transaction, batch.id) : undefined;
    });
  }

  async recordExecutionSamplingSnapshot(input: {
    batchId: string;
    snapshot: ExecutionSamplingSnapshot;
  }): Promise<ExecutionSamplingBatchContext | undefined> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM evaluation_sampling_batches WHERE id=${input.batchId}::uuid FOR UPDATE`;
      const batch = await mapExecutionBatch(transaction, input.batchId);
      if (!batch) return undefined;
      const snapshot = input.snapshot;
      if (
        snapshot.contractVersion !== "execution.v1" ||
        snapshot.channel !== "web" ||
        snapshot.callerRequestRef !== batch.callerRequestRef ||
        snapshot.deadlineAt !== batch.request.deadlineAt ||
        typeof snapshot.taskId !== "string" ||
        !snapshot.taskId ||
        snapshot.taskId.length > 160 ||
        (batch.externalTaskId && batch.externalTaskId !== snapshot.taskId) ||
        !Array.isArray(snapshot.items) ||
        snapshot.items.length !== batch.items.length
      )
        throw new Error("EXECUTION_SAMPLING_IDENTITY_MISMATCH");
      const ids = new Set(snapshot.items.map((item) => item.itemId));
      if (
        ids.size !== batch.items.length ||
        batch.items.some((item) => !ids.has(item.itemId))
      )
        throw new Error("EXECUTION_SAMPLING_IDENTITY_MISMATCH");
      for (const item of snapshot.items) {
        if (typeof item.state !== "string")
          throw new Error("EXECUTION_SAMPLING_IDENTITY_MISMATCH");
        const terminal = [
          "RESULT_AVAILABLE",
          "FAILED",
          "OUTCOME_UNKNOWN",
          "CANCELLED",
        ].includes(item.state);
        await transaction.evaluationSamplingBatchItem.updateMany({
          where: {
            batchId: batch.batchId,
            itemId: item.itemId,
            state: { not: "READY" },
          },
          data: terminal
            ? {
                state: "READY",
                snapshot: item as Prisma.InputJsonValue,
                readyAt: new Date(),
              }
            : { state: "WAITING" },
        });
      }
      const unfinished = await transaction.evaluationSamplingBatchItem.count({
        where: { batchId: batch.batchId, state: { not: "READY" } },
      });
      await transaction.evaluationSamplingBatch.update({
        where: { id: batch.batchId },
        data: {
          externalTaskId: snapshot.taskId,
          submittedAt: batch.submittedAt ?? new Date(),
          status: unfinished ? "SUBMITTED" : "COMPLETED",
          ...(unfinished || batch.status === "COMPLETED"
            ? {}
            : { completedAt: new Date() }),
        },
      });
      return mapExecutionBatch(transaction, batch.batchId);
    });
  }

  async listExecutionSamplingBatches(input: {
    limit: number;
    afterId?: string;
  }): Promise<ExecutionSamplingBatchContext[]> {
    const rows = await this.prisma.evaluationSamplingBatch.findMany({
      where: {
        centerRef: { not: null },
        items: { some: { processedAt: null } },
        ...(input.afterId ? { id: { gt: input.afterId } } : {}),
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: Math.max(1, Math.min(100, input.limit)),
    });
    const result: ExecutionSamplingBatchContext[] = [];
    for (const row of rows) {
      const batch = await mapExecutionBatch(this.prisma, row.id);
      if (batch) result.push(batch);
    }
    return result;
  }

  async getExecutionSamplingItem(input: {
    sampleId: string;
    runId: string;
    cycleId: string;
  }): Promise<ExecutionSamplingItem | undefined> {
    const item = await this.prisma.evaluationSamplingBatchItem.findFirst({
      where: input,
    });
    return item ? mapExecutionItem(item) : undefined;
  }

  async markExecutionSamplingItemProcessed(itemId: string): Promise<void> {
    await this.prisma.evaluationSamplingBatchItem.updateMany({
      where: { id: itemId, state: "READY", processedAt: null },
      data: { processedAt: new Date() },
    });
  }

  async scheduleSamplingFallback(input: {
    runId: string;
    cycleId: string;
    sampleId?: string;
    reason: "FALLBACK_DUE" | "WEB_UNAVAILABLE";
    now?: Date;
  }): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      const cycle = await transaction.evaluationExecutionCycle.findFirst({
        where: {
          id: input.cycleId,
          runId: input.runId,
          status: "ACTIVE",
          run: {
            status: "EVALUATING",
            stage: { in: ["QUEUED", "PROCESSING_EVIDENCE"] },
          },
        },
        include: { run: { select: { correlationId: true } } },
      });
      const window = cycle && mapSamplingWindow(cycle);
      const now = input.now ?? new Date();
      if (
        !window ||
        window.closedAt ||
        now >= window.deadlineAt ||
        (input.reason === "FALLBACK_DUE" && now < window.fallbackDueAt)
      )
        return 0;
      await transaction.evaluationRun.updateMany({
        where: { id: input.runId, stage: "QUEUED" },
        data: { stage: "PROCESSING_EVIDENCE" },
      });
      const samples = await transaction.evaluationSample.findMany({
        where: {
          runId: input.runId,
          status: "PENDING",
          ...(input.sampleId ? { id: input.sampleId } : {}),
        },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      let count = 0;
      for (const sample of samples) {
        await lockSample(transaction, sample.id);
        const pending = await transaction.evaluationSample.findFirst({
          where: { id: sample.id, status: "PENDING" },
        });
        if (!pending) continue;
        const created = await transaction.productOutboxEvent.createMany({
          data: [
            sampleWorkRequestedEvent({
              runId: input.runId,
              cycleId: input.cycleId,
              sampleId: sample.id,
              purpose: "EVALUATION_ACQUISITION",
              attemptNumber: 1,
              correlationId: cycle!.run.correlationId,
            }),
          ],
          skipDuplicates: true,
        });
        count += created.count;
      }
      return count;
    });
  }

  async closeSamplingAtDeadline(input: {
    runId: string;
    cycleId: string;
    now?: Date;
  }): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      const cycle = await transaction.evaluationExecutionCycle.findFirst({
        where: {
          id: input.cycleId,
          runId: input.runId,
          status: "ACTIVE",
          run: {
            status: "EVALUATING",
            stage: { in: ["QUEUED", "PROCESSING_EVIDENCE"] },
          },
        },
        include: { run: { select: { correlationId: true } } },
      });
      const window = cycle && mapSamplingWindow(cycle);
      const now = input.now ?? new Date();
      if (!window || window.closedAt || now < window.deadlineAt) return 0;
      await transaction.evaluationRun.updateMany({
        where: { id: input.runId, stage: "QUEUED" },
        data: { stage: "PROCESSING_EVIDENCE" },
      });
      const pending = await transaction.evaluationSample.findMany({
        where: { runId: input.runId, status: "PENDING" },
        orderBy: { id: "asc" },
      });
      let count = 0;
      for (const sample of pending) {
        await lockSample(transaction, sample.id);
        const moved = await transaction.evaluationSample.updateMany({
          where: { id: sample.id, runId: input.runId, status: "PENDING" },
          data: { status: "ACQUISITION_EXHAUSTED" },
        });
        if (!moved.count) continue;
        let attempt = await transaction.aiExecutionAttempt.findFirst({
          where: {
            sampleId: sample.id,
            cycleId: input.cycleId,
            purpose: "EVALUATION_ACQUISITION",
          },
          orderBy: [{ startedAt: "desc" }, { id: "asc" }],
        });
        if (!attempt) {
          attempt = await transaction.aiExecutionAttempt.create({
            data: {
              runId: input.runId,
              cycleId: input.cycleId,
              sampleId: sample.id,
              purpose: "EVALUATION_ACQUISITION",
              attemptNumber: 1,
              executionChannel: "WEB",
              executionTransport: "EXECUTION_CENTER",
              executionDeadlineAt: window.deadlineAt,
              routePolicyId: "evaluation.acquisition.browser-control-plane@1",
              providerKey: "browser-sampler-control-plane",
              requestedModel: `consumer-web:${sample.platformKey}`,
              correlationId: cycle!.run.correlationId,
              requestPayload: {
                taskKind: "BROWSER_EVALUATION_ACQUISITION",
                platformKey: sample.platformKey,
                questionId: sample.questionId,
                externalTaskId: `not-sent:${input.cycleId}`,
                resultIndex: 0,
              },
              status: "FAILED",
              failureClass: "SAMPLING_DEADLINE_EXCEEDED",
              retryable: false,
              finishedAt: now,
              responseEnvelope: buildAttemptEnvelope({
                kind: "FAILED",
                failureClass: "SAMPLING_DEADLINE_EXCEEDED",
                retryable: false,
                evidence: {
                  providerKey: "browser-sampler-control-plane",
                  serviceClass: "consumer-web",
                  protocol: "execution.v1",
                  failure: {
                    kind: "SAMPLING_DEADLINE_EXCEEDED",
                    dispatchOutcome: "NOT_SENT",
                  },
                },
              }) as Prisma.InputJsonValue,
            },
          });
        } else if (attempt.status === "STARTED") {
          await transaction.aiExecutionAttempt.updateMany({
            where: { id: attempt.id, status: "STARTED" },
            data: {
              status: "FAILED",
              failureClass: "SAMPLING_DEADLINE_EXCEEDED",
              retryable: false,
              finishedAt: now,
              responseEnvelope: buildAttemptEnvelope({
                kind: "FAILED",
                failureClass: "SAMPLING_DEADLINE_EXCEEDED",
                retryable: false,
                evidence: {
                  providerKey: attempt.providerKey,
                  serviceClass: "sampling-deadline",
                  protocol: "execution.v1",
                  failure: {
                    kind: "SAMPLING_DEADLINE_EXCEEDED",
                    dispatchOutcome: "UNKNOWN",
                    outcomeUnknown: true,
                  },
                },
              }) as Prisma.InputJsonValue,
            },
          });
        }
        await transaction.evaluationStageExhaustion.createMany({
          data: [
            {
              runId: input.runId,
              cycleId: input.cycleId,
              sampleId: sample.id,
              purpose: "EVALUATION_ACQUISITION",
              lastAttemptId: attempt.id,
              failureClass: "SAMPLING_DEADLINE_EXCEEDED",
              reason: "The absolute sampling deadline elapsed",
            },
          ],
          skipDuplicates: true,
        });
        await appendReadinessEvent(transaction, {
          runId: input.runId,
          cycleId: input.cycleId,
          sampleId: sample.id,
          correlationId: cycle!.run.correlationId,
        });
        count++;
      }
      await transaction.evaluationExecutionCycle.updateMany({
        where: { id: input.cycleId, samplingClosedAt: null },
        data: { samplingClosedAt: now },
      });
      return count;
    });
  }

  async hasOpenSamplingWindows(): Promise<boolean> {
    return (
      (await this.prisma.evaluationExecutionCycle.count({
        where: {
          status: "ACTIVE",
          samplingDeadlineAt: { not: null },
          samplingClosedAt: null,
          run: {
            status: "EVALUATING",
            stage: { in: ["QUEUED", "PROCESSING_EVIDENCE"] },
          },
        },
      })) > 0
    );
  }

  async reconcileSamplingWindows(
    limit = 100,
    now = new Date(),
  ): Promise<number> {
    const pageSize = Math.max(1, Math.min(100, limit));
    let afterId: string | undefined;
    let changed = 0;
    while (true) {
      const cycles = await this.prisma.evaluationExecutionCycle.findMany({
        where: {
          status: "ACTIVE",
          samplingClosedAt: null,
          samplingFallbackDueAt: { lte: now },
          run: {
            status: "EVALUATING",
            stage: { in: ["QUEUED", "PROCESSING_EVIDENCE"] },
          },
          ...(afterId ? { id: { gt: afterId } } : {}),
        },
        orderBy: { id: "asc" },
        take: pageSize,
        select: { id: true, runId: true, samplingDeadlineAt: true },
      });
      for (const cycle of cycles)
        changed +=
          cycle.samplingDeadlineAt && now >= cycle.samplingDeadlineAt
            ? await this.closeSamplingAtDeadline({
                runId: cycle.runId,
                cycleId: cycle.id,
                now,
              })
            : await this.scheduleSamplingFallback({
                runId: cycle.runId,
                cycleId: cycle.id,
                reason: "FALLBACK_DUE",
                now,
              });
      if (cycles.length < pageSize) break;
      afterId = cycles.at(-1)!.id;
    }
    return changed;
  }

  private async readSampleContext(
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
        evidence: { select: { answerContent: true, readingText: true } },
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
    const cycle = await this.prisma.evaluationExecutionCycle.findUnique({
      where: { id: cycleId },
    });
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
      samplingWindow: cycle ? mapSamplingWindow(cycle) : null,
    };
  }

  async acceptEvidence(input: {
    context: EvaluationSampleWorkContext;
    attemptId: string;
    evidence: AcceptedEvidence;
    observedAt?: Date;
  }): Promise<EvidenceAcceptanceResult> {
    return this.prisma.$transaction(async (transaction) => {
      await lockSample(transaction, input.context.sampleId);
      const sample = await transaction.evaluationSample.findFirst({
        where: { id: input.context.sampleId, runId: input.context.runId },
        include: { evidence: { select: { id: true } } },
      });
      if (!sample) return "STALE_CYCLE";
      const cycle = await transaction.evaluationExecutionCycle.findFirst({
        where: {
          id: input.context.cycleId,
          runId: input.context.runId,
          status: "ACTIVE",
          run: { status: "EVALUATING", stage: "PROCESSING_EVIDENCE" },
        },
      });
      if (!cycle) return "STALE_CYCLE";
      if (sample.evidence) return "ALREADY_ACCEPTED";
      const now = input.observedAt ?? new Date();
      if (
        cycle.samplingDeadlineAt &&
        (cycle.samplingClosedAt || now >= cycle.samplingDeadlineAt)
      )
        return "DEADLINE_EXCEEDED";
      if (sample.status !== "PENDING") return "STALE_CYCLE";
      const attempt = await transaction.aiExecutionAttempt.findFirst({
        where: {
          id: input.attemptId,
          sampleId: sample.id,
          runId: input.context.runId,
          cycleId: cycle.id,
          purpose: "EVALUATION_ACQUISITION",
          status: "SUCCEEDED",
        },
        select: { id: true },
      });
      if (!attempt) return "STALE_CYCLE";
      const transitioned = await transaction.evaluationSample.updateMany({
        where: { id: input.context.sampleId, status: "PENDING" },
        data: { status: "EVIDENCE_ACCEPTED" },
      });
      if (transitioned.count === 0) return "ALREADY_ACCEPTED";
      await transaction.evaluationSampleEvidence.create({
        data: {
          sampleId: input.context.sampleId,
          acceptedAttemptId: input.attemptId,
          answerContent: input.evidence.answerContent,
          answerFormat: input.evidence.answerFormat,
          ...(input.evidence.content
            ? { content: input.evidence.content as Prisma.InputJsonValue }
            : {}),
          readingText: input.evidence.readingText ?? null,
          ...(input.evidence.images
            ? { images: input.evidence.images as Prisma.InputJsonValue }
            : {}),
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
      await transaction.evaluationSamplingBatchItem.updateMany({
        where: { attemptId: input.attemptId, processedAt: null },
        data: { processedAt: now },
      });
      return "ACCEPTED";
    });
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
          ...(input.executionChannel
            ? { executionChannel: input.executionChannel }
            : {}),
          attemptNumber: nextAttemptNumber,
          correlationId: input.correlationId,
        }).businessKey,
      },
      create: sampleWorkRequestedEvent({
        runId: input.runId,
        cycleId: input.cycleId,
        sampleId: input.sampleId,
        purpose: input.purpose,
        ...(input.executionChannel
          ? { executionChannel: input.executionChannel }
          : {}),
        attemptNumber: nextAttemptNumber,
        correlationId: input.correlationId,
      }),
      update: {},
    });
  }

  async exhaustStage(input: StageFailureInput): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        await lockSample(transaction, input.sampleId);
        const sample = await transaction.evaluationSample.findFirst({
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
        if (!sample) return;
        const expectedStatus =
          input.purpose === "EVALUATION_ACQUISITION"
            ? "PENDING"
            : "EVIDENCE_ACCEPTED";
        if (sample.status !== expectedStatus) return;
        const transitioned = await transaction.evaluationSample.updateMany({
          where: { id: input.sampleId, status: expectedStatus },
          data: {
            status:
              input.purpose === "EVALUATION_ACQUISITION"
                ? "ACQUISITION_EXHAUSTED"
                : "INTERPRETATION_EXHAUSTED",
          },
        });
        if (transitioned.count !== 1) return;
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
    let recovered = await this.reconcileSamplingWindows(limit);
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
            executionChannel: true,
          },
        },
        run: {
          select: {
            correlationId: true,
            executionCycles: {
              where: { status: "ACTIVE" },
              orderBy: { sequence: "desc" },
              take: 1,
              select: { id: true, samplingDeadlineAt: true },
            },
          },
        },
      },
    });
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
      // P4 acquisition is recovered by its immutable batch/item receipts and
      // absolute window owner, not the legacy first-failed purpose heuristic.
      if (purpose === "EVALUATION_ACQUISITION" && cycle.samplingDeadlineAt)
        continue;
      const executionChannel =
        purpose === "EVALUATION_ACQUISITION" && cycle.samplingDeadlineAt
          ? ("WEB" as const)
          : ("API" as const);
      const attemptNumber = recoveryAttemptNumber(
        sample.attempts.filter(
          (attempt) =>
            attempt.cycleId === cycle.id &&
            attempt.purpose === purpose &&
            attempt.executionChannel === executionChannel,
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
            executionChannel,
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

function mapSamplingWindow(cycle: {
  samplingStartedAt: Date | null;
  samplingFallbackDueAt: Date | null;
  samplingDeadlineAt: Date | null;
  samplingClosedAt: Date | null;
}): EvaluationSamplingWindow | null {
  if (
    !cycle.samplingStartedAt ||
    !cycle.samplingFallbackDueAt ||
    !cycle.samplingDeadlineAt
  )
    return null;
  return {
    startedAt: cycle.samplingStartedAt,
    fallbackDueAt: cycle.samplingFallbackDueAt,
    deadlineAt: cycle.samplingDeadlineAt,
    closedAt: cycle.samplingClosedAt,
  };
}

async function ensureSamplingWindow(
  transaction: Prisma.TransactionClient,
  runId: string,
  cycleId: string,
): Promise<EvaluationSamplingWindow> {
  await transaction.$queryRaw`SELECT id FROM evaluation_execution_cycles WHERE id=${cycleId}::uuid FOR UPDATE`;
  const cycle = await transaction.evaluationExecutionCycle.findFirstOrThrow({
    where: { id: cycleId, runId, status: "ACTIVE" },
  });
  const existing = mapSamplingWindow(cycle);
  if (existing) return existing;
  const startedAt = cycle.createdAt;
  const dates = samplingCycleWindowData(startedAt);
  const window = {
    startedAt,
    fallbackDueAt: dates.samplingFallbackDueAt,
    deadlineAt: dates.samplingDeadlineAt,
    closedAt: null,
  };
  await transaction.evaluationExecutionCycle.update({
    where: { id: cycle.id },
    data: {
      samplingStartedAt: window.startedAt,
      samplingFallbackDueAt: window.fallbackDueAt,
      samplingDeadlineAt: window.deadlineAt,
    },
  });
  return window;
}

async function lockSample(
  transaction: Prisma.TransactionClient,
  sampleId: string,
): Promise<void> {
  await transaction.$queryRaw`SELECT id FROM evaluation_samples WHERE id=${sampleId}::uuid FOR UPDATE`;
}

async function reserveExecutionBatch(
  transaction: Prisma.TransactionClient,
  input: {
    runId: string;
    cycleId: string;
    platformKey: string;
    accountAlias: string;
    centerRef: string;
    deadlineAt: Date;
  },
) {
  await transaction.$queryRaw`SELECT id FROM evaluation_execution_cycles WHERE id=${input.cycleId}::uuid FOR UPDATE`;
  const existing = await transaction.evaluationSamplingBatch.findUnique({
    where: {
      cycleId_platformKey: {
        cycleId: input.cycleId,
        platformKey: input.platformKey,
      },
    },
  });
  if (existing) {
    if (
      existing.centerRef !== input.centerRef ||
      existing.accountAlias !== input.accountAlias ||
      !existing.request
    )
      throw new Error("EXECUTION_SAMPLING_TRANSPORT_CONFLICT");
    return existing;
  }
  const liveCycle =
    await transaction.evaluationExecutionCycle.findUniqueOrThrow({
      where: { id: input.cycleId },
    });
  if (
    liveCycle.samplingClosedAt ||
    !liveCycle.samplingDeadlineAt ||
    new Date() >= liveCycle.samplingDeadlineAt
  )
    return undefined;
  const samples = await transaction.evaluationSample.findMany({
    where: {
      runId: input.runId,
      platformKey: input.platformKey,
      status: "PENDING",
    },
    include: {
      question: { select: { id: true, ordinal: true, content: true } },
      run: {
        select: {
          definitionId: true,
          correlationId: true,
          definition: { select: { questionGeneratorVersion: true } },
        },
      },
    },
    orderBy: { question: { ordinal: "asc" } },
  });
  if (!samples.length) return undefined;
  const first = samples[0]!;
  const batchId = randomUUID();
  const questionSetVersion = `${first.run.definitionId}:${first.run.definition.questionGeneratorVersion}`;
  const idempotencyKey = browserSamplingIdempotencyKey({
    runId: input.runId,
    cycleId: input.cycleId,
    questionSetVersion,
    platformKey: input.platformKey,
    accountAlias: input.accountAlias,
  });
  const request: ExecutionSamplingRequest = {
    contractVersion: "execution.v1",
    callerRequestRef: `geo:web:${batchId}`,
    channel: "web",
    platform:
      ({ ernie: "wenxin", hunyuan: "yuanbao" } as Record<string, string>)[
        input.platformKey
      ] ?? input.platformKey,
    accountAlias: input.accountAlias,
    deadlineAt: input.deadlineAt.getTime(),
    items: samples.map((sample) => ({
      itemId: sample.id,
      userPrompt: sample.question.content,
    })),
    metadata: {
      purpose: "evaluation.acquisition",
      runId: input.runId,
      cycleId: input.cycleId,
      correlationId: first.run.correlationId,
    },
  };
  const { metadata: _metadata, ...semantic } = request;
  const batch = await transaction.evaluationSamplingBatch.create({
    data: {
      id: batchId,
      runId: input.runId,
      cycleId: input.cycleId,
      platformKey: input.platformKey,
      accountAlias: input.accountAlias,
      questionSetVersion,
      idempotencyKey,
      centerRef: input.centerRef,
      callerRequestRef: request.callerRequestRef,
      requestFingerprint: createHash("sha256")
        .update(canonicalJson(semantic))
        .digest("hex"),
      request: request as Prisma.InputJsonValue,
      expectedCount: samples.length,
      sampleIds: [],
    },
  });
  for (const [index, sample] of samples.entries()) {
    const attempt = await transaction.aiExecutionAttempt.upsert({
      where: {
        cycleId_sampleId_purpose_executionChannel_attemptNumber: {
          cycleId: input.cycleId,
          sampleId: sample.id,
          purpose: "EVALUATION_ACQUISITION",
          executionChannel: "WEB",
          attemptNumber: 1,
        },
      },
      create: {
        runId: input.runId,
        cycleId: input.cycleId,
        sampleId: sample.id,
        purpose: "EVALUATION_ACQUISITION",
        executionChannel: "WEB",
        executionTransport: "EXECUTION_CENTER",
        executionDeadlineAt: input.deadlineAt,
        attemptNumber: 1,
        routePolicyId: "evaluation.acquisition.browser-control-plane@1",
        providerKey: "browser-sampler-control-plane",
        requestedModel: `consumer-web:${input.platformKey}`,
        correlationId: sample.run.correlationId,
        requestPayload: {
          taskKind: "BROWSER_EVALUATION_ACQUISITION",
          platformKey: input.platformKey,
          questionId: sample.question.id,
          externalTaskId: `idempotency:${idempotencyKey}`,
          resultIndex: index,
        },
      },
      update: {},
    });
    await transaction.evaluationSamplingBatchItem.create({
      data: {
        batchId,
        runId: input.runId,
        cycleId: input.cycleId,
        sampleId: sample.id,
        attemptId: attempt.id,
        itemId: sample.id,
      },
    });
  }
  return batch;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalJson((value as Record<string, unknown>)[key]),
        )
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}

function mapExecutionItem(item: {
  id: string;
  batchId: string;
  runId: string;
  cycleId: string;
  sampleId: string;
  attemptId: string;
  itemId: string;
  state: "RESERVING" | "WAITING" | "READY";
  snapshot: Prisma.JsonValue | null;
  processedAt: Date | null;
}): ExecutionSamplingItem {
  return {
    id: item.id,
    batchId: item.batchId,
    runId: item.runId,
    cycleId: item.cycleId,
    sampleId: item.sampleId,
    attemptId: item.attemptId,
    itemId: item.itemId,
    state: item.state,
    snapshot: item.snapshot as ExecutionSamplingItem["snapshot"],
    processedAt: item.processedAt,
  };
}

async function mapExecutionBatch(
  transaction: Prisma.TransactionClient,
  id: string,
): Promise<ExecutionSamplingBatchContext | undefined> {
  const batch = await transaction.evaluationSamplingBatch.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          sample: {
            include: {
              question: {
                select: { id: true, ordinal: true, content: true },
              },
            },
          },
        },
      },
      run: { select: { correlationId: true } },
      cycle: { select: { samplingDeadlineAt: true } },
    },
  });
  if (
    !batch?.centerRef ||
    !batch.callerRequestRef ||
    !batch.requestFingerprint ||
    !batch.request ||
    !batch.cycle.samplingDeadlineAt
  )
    return undefined;
  const items = [...batch.items].sort(
    (a, b) => a.sample.question.ordinal - b.sample.question.ordinal,
  );
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
    centerRef: batch.centerRef,
    callerRequestRef: batch.callerRequestRef,
    requestFingerprint: batch.requestFingerprint,
    request: batch.request as ExecutionSamplingRequest,
    deadlineAt: batch.cycle.samplingDeadlineAt,
    items: items.map(mapExecutionItem),
    samples: items.map(({ sample }) => ({
      sampleId: sample.id,
      questionId: sample.question.id,
      query: sample.question.content,
      questionOrdinal: sample.question.ordinal,
      status: sample.status,
    })),
  };
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
