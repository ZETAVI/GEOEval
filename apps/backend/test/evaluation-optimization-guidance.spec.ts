import { randomUUID } from "node:crypto";

import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { EvaluationOptimizationGuidanceService } from "../src/geo-intelligence/application/evaluation-optimization-guidance.service.js";
import { EVALUATION_REPORT_DOCUMENT_VERSION } from "../src/geo-intelligence/domain/evaluation-report.document.js";
import { OVERALL_SYNTHESIS_CONTRACT_VERSION } from "../src/geo-intelligence/domain/overall-synthesis.contract.js";
import { PostgresEvaluationReportRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-report.repository.js";

describe("latest Evaluation optimization guidance", () => {
  it("selects the latest accepted guidance and projects only useful Writer context", async () => {
    const guidanceId = randomUUID();
    const reportId = randomUUID();
    const runId = randomUUID();
    const sampleId = randomUUID();
    const acceptedAt = new Date("2026-09-06T10:00:00.000Z");
    const findFirst = vi.fn().mockResolvedValue({
      id: guidanceId,
      runId,
      acceptedAt,
      guidancePayload: {
        summary: "优先建立清晰的本地精品咖啡认知。",
        priorities: [
          {
            guidanceId: "priority-local",
            label: "强化本地认知",
            detail: "围绕服务区域和稳定体验展开。",
            evidenceRefs: [{ sampleId, observationId: null }],
          },
        ],
        writingAngles: [
          {
            guidanceId: "angle-work",
            label: "办公场景",
            detail: "说明安静座位和稳定网络适合哪些客户。",
            evidenceRefs: [{ sampleId, observationId: null }],
          },
        ],
        cautions: ["不要把未提供的门店服务写成事实。"],
      },
      synthesis: {
        semanticContractVersion: OVERALL_SYNTHESIS_CONTRACT_VERSION,
      },
      run: {
        inputFingerprint: "a".repeat(64),
        report: {
          id: reportId,
          documentContractVersion: EVALUATION_REPORT_DOCUMENT_VERSION,
          publicDocument: reportDocument(),
        },
      },
    });
    const repository = new PostgresEvaluationReportRepository({
      evaluationOptimizationGuidance: { findFirst },
    } as never);

    const result = await repository.findLatestOptimizationGuidance({
      accountId: randomUUID(),
      brandId: randomUUID(),
      currentInputFingerprint: "b".repeat(64),
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          run: expect.objectContaining({
            status: "COMPLETED",
            stage: "REPORT_ACCEPTED",
            report: { isNot: null },
          }),
        },
        orderBy: [{ acceptedAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(result).toEqual({
      reference: {
        guidanceId,
        reportId,
        runId,
        acceptedAt,
        evaluationInputFingerprint: "a".repeat(64),
      },
      brandInformationChanged: true,
      customerDirections: reportDocument().directions,
      writerGuidance: {
        summary: "优先建立清晰的本地精品咖啡认知。",
        priorities: [
          {
            label: "强化本地认知",
            detail: "围绕服务区域和稳定体验展开。",
          },
        ],
        writingAngles: [
          {
            label: "办公场景",
            detail: "说明安静座位和稳定网络适合哪些客户。",
          },
        ],
        cautions: ["不要把未提供的门店服务写成事实。"],
      },
    });
    expect(result?.writerGuidance).not.toHaveProperty("evidenceRefs");
    expect(JSON.stringify(result?.writerGuidance)).not.toContain(sampleId);
  });

  it("authorizes the Brand before reading guidance and returns an honest empty state", async () => {
    const currentInputFingerprint = "c".repeat(64);
    const brands = {
      evaluationReportPurposeView: vi
        .fn()
        .mockResolvedValue({ inputFingerprint: currentInputFingerprint }),
    };
    const reports = {
      findLatestOptimizationGuidance: vi.fn().mockResolvedValue(undefined),
    };
    const service = new EvaluationOptimizationGuidanceService(
      brands as never,
      reports as never,
    );
    const accountId = randomUUID();
    const brandId = randomUUID();

    await expect(service.latest(accountId, brandId)).resolves.toBeNull();
    expect(brands.evaluationReportPurposeView).toHaveBeenCalledWith(
      accountId,
      brandId,
    );
    expect(reports.findLatestOptimizationGuidance).toHaveBeenCalledWith({
      accountId,
      brandId,
      currentInputFingerprint,
    });

    brands.evaluationReportPurposeView.mockRejectedValueOnce(
      new NotFoundException("未找到该品牌"),
    );
    await expect(service.latest(accountId, brandId)).rejects.toThrow(
      "未找到该品牌",
    );
    expect(reports.findLatestOptimizationGuidance).toHaveBeenCalledTimes(1);
  });
});

function reportDocument() {
  return {
    overview: {
      recommendationAssessment: "当前推荐表现仍有提升空间。",
      brandPerception: "安静办公场景有一定认知。",
      recommendationIndex: {
        score: 2.5,
        stars: 2.5,
        mentionRate: 0.25,
        mentionCount: 1,
        validOpenSampleCount: 4,
      },
      typicalPosition: { kind: "SINGLE" as const, position: 3 },
      coverage: {
        validSampleCount: 20,
        totalSampleCount: 20,
        missingSampleCount: 0,
      },
    },
    platforms: [],
    themes: { positive: [], negative: [] },
    competitors: [],
    directions: [
      {
        directionId: "direction-local",
        currentProblem: "本地品牌认知不够集中。",
        recommendedDirection: "围绕精品咖啡与办公体验持续表达。",
        intendedImprovement: "提高目标客户对品牌的清晰认知。",
        evidence: { sampleCount: 4, platforms: ["deepseek"] },
      },
    ],
    limitations: [],
  };
}
