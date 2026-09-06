import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSampleParserTask } from "../src/geo-intelligence/sample-parser.policy.js";
import {
  buildM4IdentityRoleTask,
  projectM4LineReferenceOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-line-references.js";
import {
  buildM4EvidenceExtractionTask,
  buildM4EvidenceJudgmentTask,
  buildM4FullSourceTask,
  buildM4WorkedExampleTask,
  projectM4EvidenceJudgmentOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-task-split.js";
import { calculateEvaluationReportMetrics } from "../src/geo-intelligence/domain/evaluation-report.policy.js";

const base = buildSampleParserTask({
  companyName: "青禾咖啡",
  primaryIndustry: "餐饮",
  secondaryIndustry: "咖啡",
  region: "杭州",
  characteristicOne: "咖啡",
  characteristicTwo: "办公",
  questionKind: "INDUSTRY_RECOMMENDATION",
  question: "哪些咖啡店适合办公？",
  originalAnswer:
    "1. **青禾咖啡杭州店**\r\n若有包间需求，可以考虑。\r\n与本题无关的一句原文。\r\n2. 可了解甲品牌或乙品牌旗下机构，具体团队未具名。",
});
const range = (startLine: number, endLine = startLine) => ({
  startLine,
  endLine,
});
const proposal = () => ({
  answerStructure: "MIXED",
  target: { displayedForms: ["青禾咖啡"], evidence: [range(1, 2)] },
  otherBrands: ["甲品牌", "乙品牌"].map((displayName) => ({
    displayName,
    observedForms: [displayName],
    evidence: [range(4)],
  })),
});
const judgment = () => ({
  answerStructure: "MIXED",
  target: {
    displayedForms: ["青禾咖啡"],
    mentionEvidence: [range(1)],
    positionEvidence: [range(1)],
    position: 1,
    role: "CONDITIONALLY_RECOMMENDED",
    observations: [
      {
        category: "CONDITION",
        label: "包间需求",
        detail: "在有包间需求时建议考虑该店。",
        polarity: "NEUTRAL",
        evidence: [range(1, 2)],
      },
    ],
  },
  otherBrands: proposal().otherBrands.map((b) => ({
    ...b,
    role: "MENTIONED_ONLY",
    relativePosition: null,
    positionKind: null,
  })),
  cardInterpretation: "回答将青禾咖啡作为有包间需求时的选择。",
  limitations: [],
});

describe("M4 task-load comparison handoff", () => {
  it("keeps full-source input, Schema and processing unchanged for the worked-example Prompt", () => {
    const baseline = buildM4FullSourceTask(base);
    const candidate = buildM4WorkedExampleTask(base);
    expect(candidate.userContext).toEqual(baseline.userContext);
    expect(candidate.outputContract).toEqual(baseline.outputContract);
    expect(candidate.systemInstruction).not.toBe(baseline.systemInstruction);
    expect(candidate.systemInstruction).not.toMatch(
      /星巴克|Manner|互动派|迪卡侬/,
    );
  });

  it("provides complete, projectable demonstrations with semantic positions distinct from source lines", () => {
    const asset = JSON.parse(
      readFileSync(
        new URL(
          "../geo-intelligence/experiments/m4-parser-worked-examples.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const projected = asset.examples.map(
      (example: {
        input: {
          companyName: string;
          questionKind: "INDUSTRY_RECOMMENDATION";
          answerLines: { text: string }[];
        };
        output: unknown;
      }) =>
        projectM4LineReferenceOutput(example.output, {
          companyName: example.input.companyName,
          questionKind: example.input.questionKind,
          originalAnswer: example.input.answerLines
            .map((line) => line.text)
            .join("\n"),
        }).projected,
    );
    expect(projected[0].mentioned).toBe(false);
    expect(
      projected[0].semantic.otherBrands.map((b: { role: string }) => b.role),
    ).toEqual(["RECOMMENDED", "CONDITIONALLY_RECOMMENDED", "MENTIONED_ONLY"]);
    expect(projected[1].mentioned).toBe(true);
    expect(projected[1].position).toBe(2);
    expect(projected[1].semantic.conditions).toHaveLength(1);
    expect(projected[1].semantic.otherBrands[0].relativePosition).toBe(1);
  });

  it("changes only the inventory between matched full-source final tasks", () => {
    const single = buildM4FullSourceTask(base);
    const split = buildM4FullSourceTask(base, proposal());
    const { sourceInventory, ...context } = split.userContext;
    expect(sourceInventory).toEqual(proposal());
    expect(context).toEqual(single.userContext);
    expect(split.systemInstruction).toBe(single.systemInstruction);
    expect(split.outputContract).toEqual(single.outputContract);
    expect(Object.keys(single.userContext).sort()).toEqual(
      ["companyName", "question", "questionKind", "answerLines"].sort(),
    );
    expect(single.userContext.answerLines).toHaveLength(4);
    expect(split.userContext.answerLines[2].text).toBe(
      "与本题无关的一句原文。",
    );
  });

  it("retains full source for an incomplete or nonverbatim inventory without accepting its semantics", () => {
    const inventory = proposal();
    inventory.target!.displayedForms = ["青禾咖啡（杭州）"];
    inventory.otherBrands = [];
    const task = buildM4FullSourceTask(base, inventory);
    expect(task.userContext.answerLines).toEqual(
      buildM4FullSourceTask(base).userContext.answerLines,
    );
    expect(task.userContext.sourceInventory).toEqual(inventory);
    expect(task.systemInstruction).toContain("可以忠实概括，不要求逐字复述");
    expect(() => buildM4EvidenceJudgmentTask(base, inventory)).toThrow();
  });

  it("still rejects inventory ranges outside the actual source", () => {
    const inventory = proposal();
    inventory.target!.evidence = [range(500)];
    expect(() => buildM4FullSourceTask(base, inventory)).toThrow();
  });

  it("accepts a literal alias already visible through another record without duplicating the source", () => {
    const local = {
      ...base,
      userContext: {
        ...base.userContext,
        originalAnswer: "甲咖啡可考虑。\n甲旗舰店和乙咖啡均在本段具名。",
      },
    };
    const inventory = {
      answerStructure: "PARAGRAPHS",
      target: null,
      otherBrands: [
        {
          displayName: "甲咖啡",
          observedForms: ["甲咖啡", "甲旗舰店"],
          evidence: [range(1)],
        },
        {
          displayName: "乙咖啡",
          observedForms: ["乙咖啡"],
          evidence: [range(2)],
        },
      ],
    };
    const output = {
      ...judgment(),
      target: null,
      otherBrands: inventory.otherBrands.map((b) => ({
        ...b,
        role: "MENTIONED_ONLY",
        relativePosition: null,
        positionKind: null,
      })),
    };
    expect(buildM4EvidenceJudgmentTask(local, inventory).visibleLineCount).toBe(
      2,
    );
    expect(
      projectM4EvidenceJudgmentOutput(output, local, inventory).projected
        .semantic.otherBrands[0]!.observedForms,
    ).toContain("甲旗舰店");
  });

  it("rejects recovery of a brand from source hidden from the judgment task", () => {
    const local = {
      ...base,
      userContext: {
        ...base.userContext,
        originalAnswer: "甲咖啡可考虑。\n乙咖啡未提供给第二步。",
      },
    };
    const inventory = {
      answerStructure: "PARAGRAPHS",
      target: null,
      otherBrands: [
        {
          displayName: "甲咖啡",
          observedForms: ["甲咖啡"],
          evidence: [range(1)],
        },
      ],
    };
    const output = {
      ...judgment(),
      target: null,
      otherBrands: [
        {
          displayName: "乙咖啡",
          observedForms: ["乙咖啡"],
          role: "RECOMMENDED",
          relativePosition: null,
          positionKind: null,
          evidence: [range(1)],
        },
      ],
    };
    expect(() =>
      projectM4EvidenceJudgmentOutput(output, local, inventory),
    ).toThrow("grounded");
  });

  it("rejects a name added by final recovery from an unseen target occurrence", () => {
    const local = {
      ...base,
      userContext: {
        ...base.userContext,
        companyName: "乙咖啡",
        originalAnswer: "1. 甲咖啡可考虑。\n乙咖啡只出现在未提供行。",
      },
    };
    const inventory = {
      answerStructure: "PARAGRAPHS",
      target: { displayedForms: ["甲咖啡"], evidence: [range(1)] },
      otherBrands: [],
    };
    const output = {
      ...judgment(),
      target: {
        ...judgment().target,
        displayedForms: ["甲咖啡"],
        mentionEvidence: [range(1)],
        positionEvidence: [range(1)],
        observations: [],
      },
      otherBrands: [],
    };
    expect(() =>
      projectM4EvidenceJudgmentOutput(output, local, inventory),
    ).toThrow("grounded");
  });

  it("extracts only names/source context with purpose-specific input and leaves P6 frozen", () => {
    const before = buildM4IdentityRoleTask(base);
    const task = buildM4EvidenceExtractionTask(base);
    expect(Object.keys(task.userContext)).toEqual([
      "companyName",
      "question",
      "questionKind",
      "answerLines",
    ]);
    const schema = task.outputContract.jsonSchema as any;
    expect(Object.keys(schema.properties.otherBrands.items.properties)).toEqual(
      ["displayName", "observedForms", "evidence"],
    );
    expect(schema.properties.otherBrands.maxItems).toBe(
      (before.outputContract.jsonSchema as any).properties.otherBrands.maxItems,
    );
    expect(Object.keys(schema.properties.target.anyOf[0].properties)).toEqual([
      "displayedForms",
      "evidence",
    ]);
    expect(buildM4IdentityRoleTask(base)).toEqual(before);
  });

  it("hands over original line identities once, retaining conditions and separate names", () => {
    const input = proposal();
    const before = structuredClone(input);
    const h = buildM4EvidenceJudgmentTask(base, input);
    expect(h.task.userContext.answerLines.map((l) => l.line)).toEqual([
      1, 2, 4,
    ]);
    expect(h.visibleLineCount).toBe(3);
    expect(h.originalLineCount).toBe(4);
    expect(h.inventory.target!.evidence[0]!.exactText).toBe(
      "1. **青禾咖啡杭州店**\r\n若有包间需求，可以考虑。",
    );
    expect(JSON.stringify(h.task.userContext.sourceInventory)).not.toContain(
      "若有包间需求",
    );
    expect(h.task.systemInstruction).not.toContain("呈现完整原回答");
    expect(h.task.outputContract.jsonSchema).toEqual(
      buildM4IdentityRoleTask(base).outputContract.jsonSchema,
    );
    expect(input).toEqual(before);
  });

  it("preserves complete final evidence, target metrics and affiliation exclusion", () => {
    const out = projectM4EvidenceJudgmentOutput(
      judgment(),
      base,
      proposal(),
    ).projected;
    expect(out.semantic.otherBrands.map((b) => b.displayName)).toEqual([
      "甲品牌",
      "乙品牌",
    ]);
    const metrics = calculateEvaluationReportMetrics([
      {
        sampleId: "split-fixture",
        questionKind: "INDUSTRY_RECOMMENDATION",
        questionOrdinal: 2,
        platformKey: "qwen",
        platformLabel: "千问",
        platformOrdinal: 1,
        interpretation: out,
      },
    ]);
    expect(metrics.recommendationIndex.mentionCount).toBe(1);
    expect(metrics.eligibleCompetitorOccurrences).toHaveLength(0);
    expect(out.semantic.cardInterpretation).toBe(judgment().cardInterpretation);
  });

  it("rejects globally real but consumer-invisible source before final recovery", () => {
    const output = judgment();
    output.target.positionEvidence = [range(1, 4)];
    expect(() =>
      projectM4EvidenceJudgmentOutput(output, base, proposal()),
    ).toThrow("unavailable source");
  });

  it("rejects invalid extraction references or ungrounded names rather than filling them", () => {
    const badRange = proposal();
    badRange.otherBrands[0]!.evidence = [range(99)];
    expect(() => buildM4EvidenceJudgmentTask(base, badRange)).toThrow(
      "does not resolve",
    );
    const badName = proposal();
    badName.otherBrands[0]!.observedForms = ["凭空品牌"];
    expect(() => buildM4EvidenceJudgmentTask(base, badName)).toThrow(
      "not grounded",
    );
  });

  it("does not repair meaning and keeps both target states representable", () => {
    const input = { ...proposal(), target: null };
    const output = {
      ...judgment(),
      target: null,
      cardInterpretation: "该回答未提及当前品牌。",
    };
    expect(
      projectM4EvidenceJudgmentOutput(output, base, input).projected.mentioned,
    ).toBe(false);
    const wrong = judgment();
    wrong.otherBrands[0]!.role = "RECOMMENDED";
    expect(
      projectM4EvidenceJudgmentOutput(wrong, base, proposal()).projected
        .semantic.otherBrands[0]!.role,
    ).toBe("RECOMMENDED");
  });

  it("retains open-question scope", () => {
    expect(() =>
      buildM4EvidenceExtractionTask({
        ...base,
        userContext: { ...base.userContext, questionKind: "BRAND_DIRECTED" },
      }),
    ).toThrow("open questions only");
  });
});
