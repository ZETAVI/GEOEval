import { describe, expect, it } from "vitest";
import {
  buildM4ChainSynthesisTask,
  inspectM4ChainSynthesisOutput,
} from "../src/ai-execution/controlled-validation/m4-chain-synthesis.js";

const source = "1. 山岚咖啡（Hill Coffee）值得考虑。\n2. 不建议晴川咖啡。";
const parsedOutput = {
  target: null,
  otherBrands: [
    {
      displayName: "山岚咖啡",
      position: 1,
      positiveRecommendation: true,
      evidence: [{ startLine: 1, endLine: 1 }],
    },
    {
      displayName: "晴川咖啡",
      position: 2,
      positiveRecommendation: false,
      evidence: [{ startLine: 2, endLine: 2 }],
    },
  ],
};
const inputs = ["s1", "s2"].map((sampleId) => ({
  sampleId,
  question: "哪些咖啡品牌值得考虑？",
  platformLabel: "千问",
  originalAnswer: source,
  parsedOutput,
}));
const output = () => ({
  overview: "本批目标未被提及。",
  positiveThemes: [],
  negativeThemes: [],
  directions: [
    {
      problem: "开放问题未出现目标。",
      suggestion: "完善与用户需求相关的公开介绍。",
      sampleIds: ["s1", "s2"],
    },
  ],
  brandGroups: [{ displayName: "山岚咖啡", members: ["s1-b1", "s2-b1"] }],
});

describe("M4 real-chain synthesis preview", () => {
  it("keeps optional owner context separate from unmodified parsed records and counts", () => {
    const plain = buildM4ChainSynthesisTask("青禾咖啡", inputs);
    const contextual = buildM4ChainSynthesisTask(
      "青禾咖啡",
      inputs,
      inputs.length,
      "青禾是青禾咖啡的门店简称。",
    );
    expect(contextual.userContext).toEqual({
      ...plain.userContext,
      brandContext: "青禾是青禾咖啡的门店简称。",
    });
    expect(contextual.userContext.coverage.mentionedSampleCount).toBe(0);
    expect(() =>
      buildM4ChainSynthesisTask("青禾咖啡", inputs, 2, " "),
    ).toThrow();
  });
  it("hands off actual parsed facts and restored excerpts without legacy fabrication", () => {
    const task = buildM4ChainSynthesisTask("青禾咖啡", inputs);
    expect(task.userContext.coverage).toMatchObject({
      sampleCount: 2,
      mentionedSampleCount: 0,
    });
    expect(task.userContext.samples[0]!.target).toBeNull();
    expect(
      task.userContext.samples[0]!.otherBrands[0]!.evidence[0]!.exactText,
    ).toContain("Hill Coffee");
    expect(
      task.userContext.samples[0]!.otherBrands[1]!.positiveRecommendation,
    ).toBe(false);
    expect(task.userContext.samples[0]!.sampleSummary).toBe(
      "本条回答未提及目标品牌。",
    );
    expect(task.userContext.samples[0]).not.toHaveProperty("originalAnswer");
    expect(JSON.stringify(task.userContext)).not.toMatch(
      /contentHash|targetRole|observedForms/,
    );
  });
  it("keeps direct descriptions while excluding direct and unavailable samples from open counts", () => {
    const originalAnswer = "青禾咖啡提供现磨咖啡。山岚咖啡也值得比较。";
    const evidence = [{ exactText: "青禾咖啡提供现磨咖啡。", occurrence: 1 }];
    const directed = {
      family: "BRAND_DIRECTED",
      mentioned: true,
      position: null,
      semantic: {
        profile: "BRAND_DIRECTED",
        answerStructure: "PARAGRAPHS",
        targetDisplayedForms: ["青禾咖啡"],
        targetMentionEvidence: evidence,
        targetObservations: [
          {
            category: "OFFERING",
            label: "现磨咖啡",
            detail: "提供现磨咖啡。",
            polarity: "POSITIVE",
            evidence,
          },
        ],
        otherBrands: [
          {
            displayName: "山岚咖啡",
            observedForms: ["山岚咖啡"],
            role: "RECOMMENDED",
            relativePosition: 1,
            positionKind: "RECOMMENDATION",
            evidence: [{ exactText: "山岚咖啡也值得比较。", occurrence: 1 }],
          },
        ],
        cardInterpretation: "回答介绍了青禾咖啡的现磨咖啡。",
        limitations: [],
        contextualTargetPosition: null,
        contextualPositionEvidence: [],
      },
    };
    const task = buildM4ChainSynthesisTask(
      "青禾咖啡",
      [
        {
          ...inputs[0]!,
          questionKind: "BRAND_DIRECTED",
          originalAnswer,
          parsedOutput: directed,
        },
        inputs[1]!,
      ],
      4,
    );
    expect(task.userContext.coverage).toEqual({
      expectedSampleCount: 4,
      sampleCount: 2,
      unavailableSampleCount: 2,
      mentionedSampleCount: 1,
      openSampleCount: 1,
      mentionedOpenSampleCount: 0,
    });
    const sample = task.userContext.samples[0]!;
    expect(sample.target!.position).toBeNull();
    expect(sample.target!.points[0]!.text).toBe("提供现磨咖啡。");
    expect(sample.target!.points[0]!.evidence[0]!.exactText).toBe(
      evidence[0]!.exactText,
    );
    expect(sample.otherBrands).toEqual([]);
    expect(
      inspectM4ChainSynthesisOutput({ ...output(), brandGroups: [] }, task)
        .competitorPreview,
    ).toHaveLength(1);
    expect(() => buildM4ChainSynthesisTask("青禾咖啡", inputs, 1)).toThrow();
  });
  it("leaves target points and summary unchanged when present", () => {
    const target = {
      position: 1,
      evidence: [{ startLine: 1, endLine: 1 }],
      points: [
        {
          text: "值得考虑。",
          polarity: "POSITIVE",
          evidence: [{ startLine: 1, endLine: 1 }],
        },
      ],
      summary: "回答推荐山岚咖啡。",
    };
    const task = buildM4ChainSynthesisTask(
      "山岚咖啡",
      inputs.map((s) => ({ ...s, parsedOutput: { target, otherBrands: [] } })),
    );
    expect(task.userContext.coverage.mentionedSampleCount).toBe(2);
    expect(task.userContext.samples[0]!.target!.points[0]!.text).toBe(
      target.points[0]!.text,
    );
    expect(task.userContext.samples[0]!.target!.summary).toBe(target.summary);
  });
  it("counts distinct eligible samples while retaining ungrouped names independently", () => {
    const task = buildM4ChainSynthesisTask("青禾咖啡", inputs);
    const result = inspectM4ChainSynthesisOutput(output(), task);
    expect(result.competitorPreview).toEqual([
      {
        displayName: "山岚咖啡",
        members: ["s1-b1", "s2-b1"],
        positiveSampleCount: 2,
      },
    ]);
    expect(
      inspectM4ChainSynthesisOutput({ ...output(), brandGroups: [] }, task)
        .competitorPreview,
    ).toHaveLength(2);
  });
  it("rejects missing references and overlapping groups without silently repairing them", () => {
    const task = buildM4ChainSynthesisTask("青禾咖啡", inputs);
    expect(() =>
      inspectM4ChainSynthesisOutput(
        {
          ...output(),
          directions: [{ ...output().directions[0], sampleIds: ["s9"] }],
        },
        task,
      ),
    ).toThrow("Unknown evidence sample");
    expect(() =>
      inspectM4ChainSynthesisOutput(
        {
          ...output(),
          brandGroups: [{ displayName: "未知", members: ["s1-b1", "s9-b1"] }],
        },
        task,
      ),
    ).toThrow("Unknown brand member");
    expect(() =>
      inspectM4ChainSynthesisOutput(
        {
          ...output(),
          brandGroups: [...output().brandGroups, ...output().brandGroups],
        },
        task,
      ),
    ).toThrow("assigned twice");
  });
  it("rejects duplicate sample IDs and invalid source handoffs before calling synthesis", () => {
    expect(() =>
      buildM4ChainSynthesisTask("青禾咖啡", [inputs[0]!, inputs[0]!]),
    ).toThrow("Duplicate sample ID");
    const bad = {
      ...parsedOutput,
      otherBrands: [
        {
          ...parsedOutput.otherBrands[0],
          evidence: [{ startLine: 99, endLine: 99 }],
        },
      ],
    };
    expect(() =>
      buildM4ChainSynthesisTask(
        "青禾咖啡",
        inputs.map((s) => ({ ...s, parsedOutput: bad })),
      ),
    ).toThrow("does not resolve");
    expect(() =>
      buildM4ChainSynthesisTask("青禾咖啡", [
        { ...inputs[0]!, sampleId: "s".repeat(64) },
        inputs[1]!,
      ]),
    ).toThrow();
  });
});
