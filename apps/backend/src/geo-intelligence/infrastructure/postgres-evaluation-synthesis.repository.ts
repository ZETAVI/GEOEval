import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  evaluationBrandTextContext,
  parseEvaluationBrandSnapshot,
} from "../domain/evaluation-brand-snapshot.js";
import {
  BRAND_NAME_RESOLUTION_CONTRACT_VERSION,
  brandNameResolutionOutputSchema,
  type BrandNameResolutionOutput,
} from "../domain/brand-name-resolution.contract.js";
import {
  EVALUATION_REPORT_DOCUMENT_VERSION,
  buildEvaluationReportDocument,
} from "../domain/evaluation-report.document.js";
import {
  EVALUATION_REPORT_METRIC_POLICY_VERSION,
  calculateEvaluationReportMetrics,
  type EvaluationReportMetricInput,
} from "../domain/evaluation-report.policy.js";
import { evaluationRetryRequiredEvent } from "../domain/evaluation-process.events.js";
import type { EvaluationSynthesisRepository } from "../domain/evaluation-synthesis.repository.js";
import { synthesisRequestedEvent } from "../domain/evaluation-synthesis.events.js";
import type {
  EvaluationSynthesisContext,
  SynthesisFailureInput,
} from "../domain/evaluation-synthesis.types.js";
import {
  isReadableSampleParserContractVersion,
  parseStoredSampleSemantic,
  type SampleParserSemantic,
} from "../domain/sample-parser.contract.js";
import {
  OVERALL_SYNTHESIS_CONTRACT_VERSION,
  parseOverallSynthesisOutput,
  splitOverallSynthesis,
  type OverallSynthesisOutput,
} from "../domain/overall-synthesis.contract.js";

const platformPolicySchema = z.array(
  z.object({
    key: z.string(),
    label: z.string(),
  }),
);

const MAX_SYNTHESIS_ATTEMPTS = 2;

@Injectable()
export class PostgresEvaluationSynthesisRepository implements EvaluationSynthesisRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getContext(
    runId: string,
    cycleId: string,
  ): Promise<EvaluationSynthesisContext | undefined> {
    return this.prisma.$transaction((transaction) =>
      loadContext(transaction, runId, cycleId),
    );
  }

  async acceptResolution(input: {
    runId: string;
    cycleId: string;
    attemptId: string;
    resolution: BrandNameResolutionOutput;
  }): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.evaluationBrandResolution.findUnique(
          {
            where: { runId: input.runId },
            select: { id: true },
          },
        );
        if (existing) return;
        const context = await loadContext(
          transaction,
          input.runId,
          input.cycleId,
        );
        if (!context || context.resolution) return;
        const resolution = brandNameResolutionOutputSchema.parse(
          input.resolution,
        );
        await transaction.evaluationBrandResolution.create({
          data: {
            runId: input.runId,
            acceptedAttemptId: input.attemptId,
            semanticContractVersion: BRAND_NAME_RESOLUTION_CONTRACT_VERSION,
            semanticPayload: resolution as Prisma.InputJsonValue,
          },
        });
        await transaction.productOutboxEvent.create({
          data: synthesisRequestedEvent({
            runId: input.runId,
            cycleId: input.cycleId,
            purpose: "REPORT_COMPOSITION",
            attemptNumber: 1,
            correlationId: context.correlationId,
          }),
        });
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.prisma.evaluationBrandResolution.findUnique({
        where: { runId: input.runId },
        select: { id: true },
      });
      if (!existing) throw error;
    }
  }

  async acceptReport(input: {
    runId: string;
    cycleId: string;
    attemptId: string;
    synthesis: OverallSynthesisOutput;
    metrics: EvaluationSynthesisContext["metrics"];
  }): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.evaluationReport.findUnique({
          where: { runId: input.runId },
          select: { id: true },
        });
        if (existing) return;
        const context = await loadContext(
          transaction,
          input.runId,
          input.cycleId,
        );
        if (!context || !context.resolution) return;
        const runOwner = await transaction.evaluationRun.findUniqueOrThrow({
          where: { id: input.runId },
          select: { accountId: true, brandId: true, correlationId: true },
        });
        const accepted = parseOverallSynthesisOutput(
          input.synthesis,
          context.samples,
        );
        const { semantic, guidance } = splitOverallSynthesis(accepted);
        const document = buildEvaluationReportDocument({
          metrics: input.metrics,
          synthesis: semantic,
          samples: context.samples,
        });

        const synthesis = await transaction.evaluationSynthesis.create({
          data: {
            runId: input.runId,
            acceptedAttemptId: input.attemptId,
            semanticContractVersion: OVERALL_SYNTHESIS_CONTRACT_VERSION,
            semanticPayload: semantic as Prisma.InputJsonValue,
          },
        });
        await transaction.evaluationOptimizationGuidance.create({
          data: {
            runId: input.runId,
            synthesisId: synthesis.id,
            guidancePayload: guidance as Prisma.InputJsonValue,
          },
        });
        const report = await transaction.evaluationReport.create({
          data: {
            runId: input.runId,
            synthesisId: synthesis.id,
            metricPolicyVersion: EVALUATION_REPORT_METRIC_POLICY_VERSION,
            documentContractVersion: EVALUATION_REPORT_DOCUMENT_VERSION,
            publicDocument: document as Prisma.InputJsonValue,
          },
        });
        const cycle = await transaction.evaluationExecutionCycle.updateMany({
          where: {
            id: input.cycleId,
            runId: input.runId,
            status: "READY_FOR_SYNTHESIS",
          },
          data: { status: "COMPLETED" },
        });
        const run = await transaction.evaluationRun.updateMany({
          where: {
            id: input.runId,
            status: "EVALUATING",
            stage: "READY_FOR_SYNTHESIS",
          },
          data: { status: "COMPLETED", stage: "REPORT_ACCEPTED" },
        });
        if (cycle.count !== 1 || run.count !== 1) {
          throw new Error(
            "Report acceptance lost its eligible lifecycle state",
          );
        }
        await transaction.productOutboxEvent.create({
          data: {
            businessKey: `evaluation-run:${input.runId}:report-accepted`,
            aggregateType: "evaluation_run",
            aggregateId: input.runId,
            eventType: "evaluation.report.accepted",
            payload: {
              accountId: runOwner.accountId,
              brandId: runOwner.brandId,
              brandName: context.brand.companyName,
              runId: input.runId,
              reportId: report.id,
            },
            correlationId: runOwner.correlationId,
          },
        });
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const report = await this.prisma.evaluationReport.findUnique({
        where: { runId: input.runId },
        select: { id: true },
      });
      if (!report) throw error;
    }
  }

  async scheduleRetry(input: SynthesisFailureInput): Promise<void> {
    const nextAttemptNumber = input.attemptNumber + 1;
    if (nextAttemptNumber > MAX_SYNTHESIS_ATTEMPTS) {
      throw new Error("Synthesis retry exceeds the bounded policy");
    }
    await this.prisma.$transaction(async (transaction) => {
      const eligible = await transaction.evaluationExecutionCycle.findFirst({
        where: {
          id: input.cycleId,
          runId: input.runId,
          status: "READY_FOR_SYNTHESIS",
          run: {
            status: "EVALUATING",
            stage: "READY_FOR_SYNTHESIS",
            report: null,
          },
          synthesisExhaustion: null,
        },
        select: { id: true },
      });
      if (!eligible) return;
      await transaction.productOutboxEvent.createMany({
        data: [
          synthesisRequestedEvent({
            runId: input.runId,
            cycleId: input.cycleId,
            purpose: input.purpose,
            attemptNumber: nextAttemptNumber,
            correlationId: input.correlationId,
          }),
        ],
        skipDuplicates: true,
      });
    });
  }

  async exhaust(input: SynthesisFailureInput): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const eligible = await transaction.evaluationExecutionCycle.findFirst({
          where: {
            id: input.cycleId,
            runId: input.runId,
            status: "READY_FOR_SYNTHESIS",
            run: {
              status: "EVALUATING",
              stage: "READY_FOR_SYNTHESIS",
              report: null,
            },
            synthesisExhaustion: null,
          },
          select: {
            id: true,
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
        if (!eligible) return;
        await transaction.aiSynthesisAttempt.findFirstOrThrow({
          where: {
            id: input.attemptId,
            runId: input.runId,
            cycleId: input.cycleId,
            purpose: input.purpose,
          },
          select: { id: true },
        });
        await transaction.evaluationSynthesisExhaustion.create({
          data: {
            runId: input.runId,
            cycleId: input.cycleId,
            lastAttemptId: input.attemptId,
            purpose: input.purpose,
            failureClass: input.failureClass,
            reason: input.reason,
          },
        });
        const cycle = await transaction.evaluationExecutionCycle.updateMany({
          where: {
            id: input.cycleId,
            runId: input.runId,
            status: "READY_FOR_SYNTHESIS",
          },
          data: { status: "EXHAUSTED" },
        });
        const run = await transaction.evaluationRun.updateMany({
          where: {
            id: input.runId,
            status: "EVALUATING",
            stage: "READY_FOR_SYNTHESIS",
          },
          data: {
            status: "PLEASE_RETRY",
            stage: "SYNTHESIS_EXHAUSTED",
          },
        });
        if (cycle.count !== 1 || run.count !== 1) {
          throw new Error(
            "Synthesis exhaustion lost its eligible lifecycle state",
          );
        }
        const snapshot = parseEvaluationBrandSnapshot(
          eligible.run.definition.brandSnapshot,
        );
        await transaction.productOutboxEvent.create({
          data: evaluationRetryRequiredEvent({
            accountId: eligible.run.accountId,
            brandId: eligible.run.brandId,
            brandName: evaluationBrandTextContext(snapshot).companyName,
            runId: input.runId,
            cycleId: input.cycleId,
            stage: "SYNTHESIS",
            correlationId: eligible.run.correlationId,
          }),
        });
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const exhaustion =
        await this.prisma.evaluationSynthesisExhaustion.findUnique({
          where: { cycleId: input.cycleId },
          select: { id: true },
        });
      if (!exhaustion) throw error;
    }
  }

  async reconcile(limit: number): Promise<number> {
    const cycles = await this.prisma.evaluationExecutionCycle.findMany({
      where: {
        status: "READY_FOR_SYNTHESIS",
        run: {
          status: "EVALUATING",
          stage: "READY_FOR_SYNTHESIS",
          report: null,
        },
        synthesisExhaustion: null,
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
      include: {
        run: {
          select: {
            correlationId: true,
            brandResolution: { select: { id: true } },
            samples: {
              select: {
                interpretation: { select: { semanticContractVersion: true } },
              },
            },
          },
        },
        synthesisAttempts: {
          orderBy: { attemptNumber: "desc" },
        },
      },
    });
    let recovered = 0;
    for (const cycle of cycles) {
      const currentValid = cycle.run.samples.filter(
        (sample) =>
          sample.interpretation !== null &&
          isReadableSampleParserContractVersion(
            sample.interpretation.semanticContractVersion,
          ),
      ).length;
      if (currentValid < 17) continue;
      const purpose = cycle.run.brandResolution
        ? "REPORT_COMPOSITION"
        : "BRAND_NAME_RESOLUTION";
      const attemptNumber =
        cycle.synthesisAttempts.find((attempt) => attempt.purpose === purpose)
          ?.attemptNumber ?? 1;
      const result = await this.prisma.productOutboxEvent.createMany({
        data: [
          synthesisRequestedEvent({
            runId: cycle.runId,
            cycleId: cycle.id,
            purpose,
            attemptNumber,
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

async function loadContext(
  transaction: Prisma.TransactionClient,
  runId: string,
  cycleId: string,
): Promise<EvaluationSynthesisContext | undefined> {
  const run = await transaction.evaluationRun.findFirst({
    where: {
      id: runId,
      status: "EVALUATING",
      stage: "READY_FOR_SYNTHESIS",
      report: null,
      executionCycles: {
        some: {
          id: cycleId,
          status: "READY_FOR_SYNTHESIS",
          synthesisExhaustion: null,
        },
      },
    },
    include: {
      definition: {
        include: { questions: { orderBy: { ordinal: "asc" } } },
      },
      samples: {
        include: {
          question: true,
          interpretation: true,
        },
      },
      brandResolution: true,
    },
  });
  if (!run) return undefined;
  const brand = parseEvaluationBrandSnapshot(run.definition.brandSnapshot);
  const platforms = platformPolicySchema.parse(run.definition.platformPolicy);
  const platformOrder = new Map(
    platforms.map((platform, index) => [platform.key, index + 1]),
  );
  const metricSamples: EvaluationReportMetricInput[] = [];
  for (const sample of run.samples) {
    let interpretation: EvaluationReportMetricInput["interpretation"];
    if (sample.interpretation) {
      if (
        !isReadableSampleParserContractVersion(
          sample.interpretation.semanticContractVersion,
        )
      ) {
        return undefined;
      }
      interpretation = {
        mentioned: sample.interpretation.mentioned,
        position: sample.interpretation.position,
        semantic: parseStoredSampleSemantic(
          sample.interpretation.semanticContractVersion,
          sample.interpretation.semanticPayload,
        ) as SampleParserSemantic,
      };
    }
    const ordinal = platformOrder.get(sample.platformKey);
    if (!ordinal) {
      throw new Error(`Synthesis sample ${sample.id} has unknown platform`);
    }
    metricSamples.push({
      sampleId: sample.id,
      questionKind: sample.question.kind,
      questionOrdinal: sample.question.ordinal,
      platformKey: sample.platformKey,
      platformLabel: sample.platformLabel,
      platformOrdinal: ordinal,
      interpretation,
    });
  }
  metricSamples.sort(
    (left, right) =>
      left.questionOrdinal - right.questionOrdinal ||
      left.platformOrdinal - right.platformOrdinal ||
      left.sampleId.localeCompare(right.sampleId),
  );
  const metrics = calculateEvaluationReportMetrics(metricSamples);
  if (metrics.coverage.validSampleCount < 17) return undefined;
  const samples = metricSamples.flatMap((sample) =>
    sample.interpretation
      ? [
          {
            sampleId: sample.sampleId,
            questionId: run.samples.find(
              (stored) => stored.id === sample.sampleId,
            )!.questionId,
            question: run.samples.find(
              (stored) => stored.id === sample.sampleId,
            )!.question.content,
            questionKind: sample.questionKind,
            platformKey: sample.platformKey,
            platformLabel: sample.platformLabel,
            mentioned: sample.interpretation.mentioned,
            position: sample.interpretation.position,
            semantic: sample.interpretation.semantic,
          },
        ]
      : [],
  );
  return {
    runId,
    cycleId,
    correlationId: run.correlationId,
    brand,
    questions: run.definition.questions.map((question) => ({
      questionId: question.id,
      kind: question.kind,
      ordinal: question.ordinal,
      content: question.content,
    })),
    samples,
    metrics,
    resolution: run.brandResolution
      ? parseStoredBrandNameResolution(
          run.brandResolution.semanticContractVersion,
          run.brandResolution.semanticPayload,
        )
      : null,
  };
}

function parseStoredBrandNameResolution(
  contractVersion: string,
  payload: unknown,
): BrandNameResolutionOutput {
  if (contractVersion !== BRAND_NAME_RESOLUTION_CONTRACT_VERSION) {
    throw new Error(`Unsupported brand resolution contract ${contractVersion}`);
  }
  return brandNameResolutionOutputSchema.parse(payload);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
