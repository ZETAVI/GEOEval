import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  evaluationBrandTextContext,
  parseEvaluationBrandSnapshot,
} from "../domain/evaluation-brand-snapshot.js";
import {
  parseStoredEvaluationReportDocument,
  type EvaluationReportDocument,
} from "../domain/evaluation-report.document.js";
import type {
  EvaluationOptimizationGuidanceView,
  EvaluationWriterGuidance,
} from "../domain/evaluation-optimization-guidance.view.js";
import { buildEvaluationHighlightProjection } from "../domain/evaluation-report.projection.js";
import { projectRichSampleAnswer } from "../domain/rich-sample-answer.js";
import type { EvaluationReportRepository } from "../domain/evaluation-report.repository.js";
import type {
  EvaluationReportSummaryView,
  EvaluationReportQuestionView,
  EvaluationReportSampleView,
  EvaluationReportView,
} from "../domain/evaluation-report.view.js";
import { parseStoredOverallSynthesisGuidance } from "../domain/overall-synthesis.contract.js";
import {
  isReadableSampleParserContractVersion,
  parseStoredSampleSemantic,
} from "../domain/sample-parser.contract.js";

const reportRunInclude = {
  report: true,
  definition: {
    include: { questions: { orderBy: { ordinal: "asc" as const } } },
  },
  samples: {
    include: { evidence: true, interpretation: true },
  },
} as const;

@Injectable()
export class PostgresEvaluationReportRepository implements EvaluationReportRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findLatestOptimizationGuidance(input: {
    accountId: string;
    brandId: string;
    currentInputFingerprint: string;
  }): Promise<EvaluationOptimizationGuidanceView | undefined> {
    const guidance = await this.prisma.evaluationOptimizationGuidance.findFirst(
      {
        where: {
          run: {
            accountId: input.accountId,
            brandId: input.brandId,
            status: "COMPLETED",
            stage: "REPORT_ACCEPTED",
            report: { isNot: null },
          },
        },
        orderBy: [{ acceptedAt: "desc" }, { id: "desc" }],
        include: {
          synthesis: { select: { semanticContractVersion: true } },
          run: {
            select: {
              inputFingerprint: true,
              report: {
                select: {
                  id: true,
                  documentContractVersion: true,
                  publicDocument: true,
                },
              },
            },
          },
        },
      },
    );
    if (!guidance) return undefined;
    if (!guidance.run.report) {
      throw new Error("Accepted optimization guidance has no report record");
    }
    const document = parseStoredEvaluationReportDocument(
      guidance.run.report.documentContractVersion,
      guidance.run.report.publicDocument,
    );
    const protectedGuidance = parseStoredOverallSynthesisGuidance(
      guidance.synthesis.semanticContractVersion,
      guidance.guidancePayload,
    );
    return {
      reference: {
        guidanceId: guidance.id,
        reportId: guidance.run.report.id,
        runId: guidance.runId,
        acceptedAt: guidance.acceptedAt,
        evaluationInputFingerprint: guidance.run.inputFingerprint,
      },
      brandInformationChanged:
        guidance.run.inputFingerprint !== input.currentInputFingerprint,
      customerDirections: document.directions.map((direction) => ({
        ...direction,
        evidence: {
          ...direction.evidence,
          platforms: [...direction.evidence.platforms],
        },
      })),
      writerGuidance: writerGuidanceProjection(protectedGuidance),
    };
  }

  async findCurrent(input: {
    accountId: string;
    brandId: string;
    currentInputFingerprint: string;
  }): Promise<EvaluationReportView | undefined> {
    const run = await this.prisma.evaluationRun.findFirst({
      where: { accountId: input.accountId, brandId: input.brandId },
      orderBy: [{ startedAt: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
      include: reportRunInclude,
    });
    if (
      !run ||
      run.status !== "COMPLETED" ||
      run.stage !== "REPORT_ACCEPTED" ||
      !run.report
    ) {
      return undefined;
    }
    return mapReport(run, input.currentInputFingerprint);
  }

  async findHistory(input: {
    accountId: string;
    brandId: string;
    currentInputFingerprint: string;
    limit: number;
    cursor?: { acceptedAt: Date; id: string };
  }): Promise<{ items: EvaluationReportSummaryView[]; hasMore: boolean }> {
    const latestRun = await this.prisma.evaluationRun.findFirst({
      where: { accountId: input.accountId, brandId: input.brandId },
      orderBy: [{ startedAt: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
      select: { status: true, stage: true, report: { select: { id: true } } },
    });
    const currentReportId =
      latestRun?.status === "COMPLETED" && latestRun.stage === "REPORT_ACCEPTED"
        ? latestRun.report?.id
        : undefined;
    const rows = await this.prisma.evaluationReport.findMany({
      where: {
        run: {
          accountId: input.accountId,
          brandId: input.brandId,
          status: "COMPLETED",
          stage: "REPORT_ACCEPTED",
        },
        ...(currentReportId ? { id: { not: currentReportId } } : {}),
        ...(input.cursor
          ? {
              OR: [
                { acceptedAt: { lt: input.cursor.acceptedAt } },
                {
                  acceptedAt: input.cursor.acceptedAt,
                  id: { lt: input.cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ acceptedAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      include: {
        run: { include: { definition: { select: { brandSnapshot: true } } } },
      },
    });
    return {
      items: rows.slice(0, input.limit).map((report) => {
        const document = parseStoredEvaluationReportDocument(
          report.documentContractVersion,
          report.publicDocument,
        );
        return {
          id: report.id,
          runId: report.runId,
          brandId: report.run.brandId,
          brandName: evaluationBrandTextContext(
            parseEvaluationBrandSnapshot(report.run.definition.brandSnapshot),
          ).companyName,
          brandInformationChanged:
            report.run.inputFingerprint !== input.currentInputFingerprint,
          startedAt: report.run.startedAt,
          acceptedAt: report.acceptedAt,
          recommendationIndex: document.overview.recommendationIndex.score,
          mentionRate: document.overview.recommendationIndex.mentionRate,
          validSampleCount: document.overview.coverage.validSampleCount,
          totalSampleCount: document.overview.coverage.totalSampleCount,
        };
      }),
      hasMore: rows.length > input.limit,
    };
  }

  async findById(input: {
    accountId: string;
    brandId: string;
    reportId: string;
    currentInputFingerprint: string;
  }): Promise<EvaluationReportView | undefined> {
    const run = await this.prisma.evaluationRun.findFirst({
      where: {
        accountId: input.accountId,
        brandId: input.brandId,
        status: "COMPLETED",
        stage: "REPORT_ACCEPTED",
        report: { is: { id: input.reportId } },
      },
      include: reportRunInclude,
    });
    return run ? mapReport(run, input.currentInputFingerprint) : undefined;
  }
}

function writerGuidanceProjection(input: {
  summary: string;
  priorities: Array<{ label: string; detail: string }>;
  writingAngles: Array<{ label: string; detail: string }>;
  cautions: string[];
}): EvaluationWriterGuidance {
  return {
    summary: input.summary,
    priorities: input.priorities.map(({ label, detail }) => ({
      label,
      detail,
    })),
    writingAngles: input.writingAngles.map(({ label, detail }) => ({
      label,
      detail,
    })),
    cautions: [...input.cautions],
  };
}

function mapReport(
  run: StoredReportRun,
  currentInputFingerprint: string,
): EvaluationReportView {
  if (!run.report) {
    throw new Error("Completed report run has no report record");
  }
  const document = parseStoredEvaluationReportDocument(
    run.report.documentContractVersion,
    run.report.publicDocument,
  );
  const questions = mapQuestions(run, document);
  const includedCount = questions
    .flatMap((question) => question.samples)
    .filter((sample) => sample.availability === "INCLUDED").length;
  if (
    questions.length !== 4 ||
    questions.some((question) => question.samples.length !== 5) ||
    includedCount !== document.overview.coverage.validSampleCount
  ) {
    throw new Error("Stored evaluation report does not match its sample set");
  }
  return {
    id: run.report.id,
    runId: run.id,
    definitionId: run.definitionId,
    brandId: run.brandId,
    brandSnapshot: parseEvaluationBrandSnapshot(run.definition.brandSnapshot),
    brandInformationChanged: run.inputFingerprint !== currentInputFingerprint,
    startedAt: run.startedAt,
    acceptedAt: run.report.acceptedAt,
    document,
    questions,
  };
}

function mapQuestions(
  run: StoredReportRun,
  document: EvaluationReportDocument,
): EvaluationReportQuestionView[] {
  const platformOrder = new Map(
    document.platforms.map((platform, index) => [platform.platformKey, index]),
  );
  return run.definition.questions.map((question) => ({
    id: question.id,
    kind: question.kind,
    ordinal: question.ordinal,
    content: question.content,
    samples: run.samples
      .filter((sample) => sample.questionId === question.id)
      .sort(
        (left, right) =>
          (platformOrder.get(left.platformKey) ?? Number.MAX_SAFE_INTEGER) -
          (platformOrder.get(right.platformKey) ?? Number.MAX_SAFE_INTEGER),
      )
      .map(mapSample),
  }));
}

function mapSample(
  sample: StoredReportRun["samples"][number],
): EvaluationReportSampleView {
  const originalAnswer = sample.evidence?.answerContent ?? null;
  const richAnswer = projectRichSampleAnswer(
    sample.evidence?.content,
    sample.evidence?.images,
  );
  if (
    !sample.interpretation ||
    !isReadableSampleParserContractVersion(
      sample.interpretation.semanticContractVersion,
    )
  ) {
    return {
      id: sample.id,
      platformKey: sample.platformKey,
      platformLabel: sample.platformLabel,
      availability: "NOT_INCLUDED",
      mentioned: null,
      position: null,
      cardInterpretation: null,
      originalAnswer,
      richAnswer,
      highlightUnavailable: true,
      highlights: [],
    };
  }
  const semantic = parseStoredSampleSemantic(
    sample.interpretation.semanticContractVersion,
    sample.interpretation.semanticPayload,
  );
  if (semantic.profile === "S3_COMPATIBILITY") {
    throw new Error(
      "Compatibility interpretation cannot enter a current report",
    );
  }
  // DOM blocks and parser reading text do not share Markdown source offsets.
  const highlight =
    originalAnswer && !richAnswer
      ? buildEvaluationHighlightProjection(originalAnswer, semantic)
      : { highlightUnavailable: true, highlights: [] };
  return {
    id: sample.id,
    platformKey: sample.platformKey,
    platformLabel: sample.platformLabel,
    availability: "INCLUDED",
    mentioned: sample.interpretation.mentioned,
    position: sample.interpretation.position,
    cardInterpretation: semantic.cardInterpretation,
    originalAnswer,
    richAnswer,
    ...highlight,
  };
}

type StoredReportRun = Prisma.EvaluationRunGetPayload<{
  include: typeof reportRunInclude;
}>;
