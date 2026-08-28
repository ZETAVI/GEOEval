import { describe, expect, it } from "vitest";

import { buildEvaluationHighlightProjection } from "../src/geo-intelligence/domain/evaluation-report.projection.js";
import type { SampleParserSemantic } from "../src/geo-intelligence/domain/sample-parser.contract.js";

describe("evaluation report highlight projection", () => {
  it("resolves the declared occurrence to source offsets", () => {
    const answer = "## 推荐\n星河咖啡很安静，星河咖啡也适合办公。";
    const semantic = openSemantic();
    semantic.evidenceAnchors.push(
      {
        anchorId: "target-second",
        exactText: "星河咖啡",
        occurrence: 2,
        purposes: ["TARGET_MENTION", "TARGET_POSITION"],
      },
      {
        anchorId: "positive-reason",
        exactText: "适合办公",
        occurrence: 1,
        purposes: ["CHARACTERISTIC"],
      },
    );
    semantic.recommendationReasons.push({
      observationId: "quiet-office",
      label: "办公场景",
      detail: "回答明确提到适合办公。",
      polarity: "POSITIVE",
      evidenceAnchorIds: ["positive-reason"],
    });

    const result = buildEvaluationHighlightProjection(answer, semantic);

    expect(result.highlightUnavailable).toBe(false);
    expect(result.highlights).toEqual([
      {
        start: answer.lastIndexOf("星河咖啡"),
        end: answer.lastIndexOf("星河咖啡") + "星河咖啡".length,
        exactText: "星河咖啡",
        kind: "TARGET",
      },
      {
        start: answer.indexOf("适合办公"),
        end: answer.indexOf("适合办公") + "适合办公".length,
        exactText: "适合办公",
        kind: "POSITIVE",
      },
    ]);
  });

  it("merges exact duplicate evidence without duplicating the range", () => {
    const answer = "星河咖啡适合办公。";
    const semantic = openSemantic();
    semantic.evidenceAnchors.push(
      {
        anchorId: "target",
        exactText: "星河咖啡",
        occurrence: 1,
        purposes: ["TARGET_MENTION"],
      },
      {
        anchorId: "positive-target",
        exactText: "星河咖啡",
        occurrence: 1,
        purposes: ["DESCRIPTION"],
      },
    );
    semantic.recommendationReasons.push({
      observationId: "positive-target-observation",
      label: "目标品牌",
      detail: "回答给出正面描述。",
      polarity: "POSITIVE",
      evidenceAnchorIds: ["positive-target"],
    });

    expect(buildEvaluationHighlightProjection(answer, semantic)).toEqual({
      highlightUnavailable: false,
      highlights: [
        {
          start: 0,
          end: "星河咖啡".length,
          exactText: "星河咖啡",
          kind: "TARGET",
        },
      ],
    });
  });

  it("fails closed when an anchor cannot resolve or ranges overlap", () => {
    const unresolved = openSemantic();
    unresolved.evidenceAnchors.push({
      anchorId: "missing",
      exactText: "不存在的原文",
      occurrence: 1,
      purposes: ["TARGET_MENTION"],
    });
    expect(
      buildEvaluationHighlightProjection("星河咖啡适合办公。", unresolved),
    ).toEqual({ highlightUnavailable: true, highlights: [] });

    const overlapping = openSemantic();
    overlapping.evidenceAnchors.push(
      {
        anchorId: "whole",
        exactText: "星河咖啡适合办公",
        occurrence: 1,
        purposes: ["TARGET_MENTION"],
      },
      {
        anchorId: "partial",
        exactText: "咖啡适合",
        occurrence: 1,
        purposes: ["CHARACTERISTIC"],
      },
    );
    overlapping.recommendationReasons.push({
      observationId: "partial-observation",
      label: "部分重叠",
      detail: "用于验证安全回退。",
      polarity: "POSITIVE",
      evidenceAnchorIds: ["partial"],
    });
    expect(
      buildEvaluationHighlightProjection("星河咖啡适合办公。", overlapping),
    ).toEqual({ highlightUnavailable: true, highlights: [] });
  });
});

function openSemantic(): Extract<
  SampleParserSemantic,
  { profile: "OPEN_DISCOVERY" }
> {
  return {
    profile: "OPEN_DISCOVERY",
    answerStructure: "PARAGRAPHS",
    targetDisplayedForms: ["星河咖啡"],
    targetObservations: [],
    otherBrands: [],
    evidenceAnchors: [],
    cardInterpretation: "回答提到了目标品牌。",
    limitations: [],
    targetRole: "RECOMMENDED",
    recommendationReasons: [],
    conditions: [],
    queryFit: [],
  };
}
