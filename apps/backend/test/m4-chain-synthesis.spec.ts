import { describe, expect, it } from "vitest";
import {
  buildM4ChainSynthesisTask,
  buildM4BrandAssignmentTask,
  buildM4ReportCompositionTasks,
  composeM4ReportPreview,
  composeM4AssignedReportPreview,
  flattenM4ChainSynthesisTask,
  inspectM4BrandGroupingOutput,
  inspectM4BrandAssignmentOutput,
  inspectM4ChainSynthesisOutput,
  inspectM4TargetNarrativeOutput,
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
  it("binds one required assignment slot to every unchanged brand record", () => {
    const task = buildM4ChainSynthesisTask("青禾咖啡", inputs);
    const before = structuredClone(task);
    const assignment = buildM4BrandAssignmentTask(task);
    expect(assignment.userContext).toEqual(
      buildM4ReportCompositionTasks(task).grouping.userContext,
    );
    const schema = assignment.outputContract.jsonSchema as any;
    expect(schema.required).toEqual(["assignments"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.assignments.required).toEqual([
      "s1-b1",
      "s1-b2",
      "s2-b1",
      "s2-b2",
    ]);
    expect(schema.properties.assignments.additionalProperties).toBe(false);
    expect(schema.properties.assignments.properties["s1-b1"]).toMatchObject({
      type: "string",
      minLength: 1,
      maxLength: 120,
    });
    expect(task).toEqual(before);
  });
  it("preserves singleton labels, eligibility, distinct-sample counts and raw assignments", () => {
    const task = buildM4ChainSynthesisTask("青禾咖啡", inputs);
    const assignment = {
      assignments: {
        "s1-b1": "山岚咖啡",
        "s1-b2": "山岚咖啡",
        "s2-b1": "Hill Coffee",
        "s2-b2": "晴川咖啡",
      },
    };
    const before = structuredClone({ task, assignment });
    const inspected = inspectM4BrandAssignmentOutput(assignment, task);
    expect(inspected.competitorPreview).toEqual([
      {
        displayName: "山岚咖啡",
        members: ["s1-b1", "s1-b2"],
        positiveSampleCount: 1,
      },
      {
        displayName: "Hill Coffee",
        members: ["s2-b1"],
        positiveSampleCount: 1,
      },
    ]);
    // A wrong identity still passes structure. Neither the count projector nor
    // composition silently repairs it or discards the negative source record.
    expect(inspected.output).toEqual(assignment);
    const { brandGroups: _groups, ...narrative } = output();
    expect(composeM4AssignedReportPreview(assignment, narrative, task)).toEqual(
      {
        output: { ...assignment, ...narrative },
        coverage: task.userContext.coverage,
        competitorPreview: inspected.competitorPreview,
      },
    );
    expect({ task, assignment }).toEqual(before);
  });
  it("rejects missing, unknown or invalid assignment slots and missing narrative", () => {
    const task = buildM4ChainSynthesisTask("青禾咖啡", inputs);
    const valid = Object.fromEntries(
      flattenM4ChainSynthesisTask(task).userContext.otherBrands.map((b) => [
        b.id,
        b.displayName,
      ]),
    );
    const { "s1-b1": _first, ...missing } = valid;
    for (const assignments of [
      missing,
      { ...valid, "s9-b1": "山岚" },
      { ...valid, "s1-b1": " " },
      { ...valid, "s1-b1": null },
      { ...valid, "s1-b1": "长".repeat(121) },
    ]) {
      expect(() =>
        inspectM4BrandAssignmentOutput({ assignments }, task),
      ).toThrow();
    }
    expect(() =>
      inspectM4BrandAssignmentOutput(
        { assignments: valid, brandGroups: [] },
        task,
      ),
    ).toThrow();
    expect(() =>
      composeM4AssignedReportPreview({ assignments: valid }, undefined, task),
    ).toThrow();
    expect(() =>
      composeM4AssignedReportPreview(undefined, output(), task),
    ).toThrow();
    const duplicate = structuredClone(task);
    duplicate.userContext.samples[1]!.otherBrands[0]!.id = "s1-b1";
    expect(() => buildM4BrandAssignmentTask(duplicate)).toThrow(
      "Duplicate input brand id",
    );
  });
  it("supports empty, singleton and more-than-30 unique-brand partitions", () => {
    const empty = buildM4ChainSynthesisTask(
      "青禾咖啡",
      inputs.map((s) => ({
        ...s,
        parsedOutput: { target: null, otherBrands: [] },
      })),
    );
    expect(
      inspectM4BrandAssignmentOutput({ assignments: {} }, empty)
        .competitorPreview,
    ).toEqual([]);
    const single = buildM4ChainSynthesisTask(
      "青禾咖啡",
      inputs.map((s, i) => ({
        ...s,
        parsedOutput: {
          target: null,
          otherBrands: i ? [] : [parsedOutput.otherBrands[0]],
        },
      })),
    );
    expect(
      inspectM4BrandAssignmentOutput(
        { assignments: { "s1-b1": "Hill Coffee" } },
        single,
      ).competitorPreview,
    ).toEqual([
      {
        displayName: "Hill Coffee",
        members: ["s1-b1"],
        positiveSampleCount: 1,
      },
    ]);
    const many = buildM4ChainSynthesisTask(
      "青禾咖啡",
      Array.from({ length: 20 }, (_, i) => ({
        ...inputs[0]!,
        sampleId: `s${i + 1}`,
        parsedOutput: {
          ...parsedOutput,
          otherBrands: parsedOutput.otherBrands.map((b) => ({
            ...b,
            positiveRecommendation: true,
          })),
        },
      })),
    );
    const assignments = Object.fromEntries(
      flattenM4ChainSynthesisTask(many).userContext.otherBrands.map((b) => [
        b.id,
        b.id,
      ]),
    );
    expect(
      inspectM4BrandAssignmentOutput({ assignments }, many).competitorPreview,
    ).toHaveLength(40);
  });
  it("separates component contexts without changing evidence, scope or bounded schemas", () => {
    const task = buildM4ChainSynthesisTask(
      "青禾咖啡",
      inputs,
      4,
      "用户提供的品牌背景。",
    );
    const before = structuredClone(task);
    const { grouping, narrative } = buildM4ReportCompositionTasks(task);
    const flat = flattenM4ChainSynthesisTask(task);
    const { otherBrands, ...targetContext } = flat.userContext;
    expect(grouping.userContext).toEqual({ otherBrands });
    expect(narrative.userContext).toEqual(targetContext);
    expect(narrative.userContext.samples[0]).not.toHaveProperty("otherBrands");
    for (const sample of narrative.userContext.samples) {
      expect(sample).not.toHaveProperty("originalAnswer");
      expect(sample).not.toHaveProperty("answerLines");
      expect(sample).toHaveProperty("sampleSummary");
    }
    expect(narrative.userContext.samples[0]).toEqual(
      expect.objectContaining({
        sampleSummary: task.userContext.samples[0]!.sampleSummary,
        target: task.userContext.samples[0]!.target,
      }),
    );
    expect(grouping.outputContract.jsonSchema.properties).toEqual({
      brandGroups: task.outputContract.jsonSchema.properties!.brandGroups,
    });
    const { brandGroups: _groups, ...targetProperties } =
      task.outputContract.jsonSchema.properties!;
    expect(narrative.outputContract.jsonSchema.properties).toEqual(
      targetProperties,
    );
    expect(grouping.outputContract.jsonSchema.required).toEqual([
      "brandGroups",
    ]);
    expect(narrative.outputContract.jsonSchema.required).toEqual(
      Object.keys(targetProperties),
    );
    expect(task).toEqual(before);
    const empty = buildM4ChainSynthesisTask(
      "青禾咖啡",
      inputs.map((s) => ({
        ...s,
        parsedOutput: { target: null, otherBrands: [] },
      })),
    );
    expect(
      buildM4ReportCompositionTasks(empty).grouping.outputContract.jsonSchema,
    ).toMatchObject({ properties: { brandGroups: { maxItems: 0 } } });
  });
  it("assembles both raw components with the same counts and no semantic repair", () => {
    const task = buildM4ChainSynthesisTask("青禾咖啡", inputs, 4);
    const full = output();
    const { brandGroups, ...narrative } = full;
    const grouping = { brandGroups };
    const before = structuredClone({ task, grouping, narrative });
    expect(composeM4ReportPreview(grouping, narrative, task)).toEqual(
      inspectM4ChainSynthesisOutput(full, task),
    );
    expect(
      inspectM4BrandGroupingOutput(grouping, task).competitorPreview,
    ).toEqual(inspectM4ChainSynthesisOutput(full, task).competitorPreview);
    expect(inspectM4TargetNarrativeOutput(narrative, task).output).toEqual(
      narrative,
    );
    expect({ task, grouping, narrative }).toEqual(before);
    // Reference validity is not proof of correct brand identity.
    const wrongButReferentiallyValid = {
      brandGroups: [{ displayName: "另一个品牌", members: ["s1-b1", "s1-b2"] }],
    };
    expect(
      composeM4ReportPreview(wrongButReferentiallyValid, narrative, task).output
        .brandGroups,
    ).toEqual(wrongButReferentiallyValid.brandGroups);
  });
  it("rejects missing, cross-task and invalid-reference components without a partial preview", () => {
    const task = buildM4ChainSynthesisTask("青禾咖啡", inputs);
    const { brandGroups, ...narrative } = output();
    const grouping = { brandGroups };
    expect(() => composeM4ReportPreview(undefined, narrative, task)).toThrow();
    expect(() => composeM4ReportPreview(grouping, undefined, task)).toThrow();
    expect(() => composeM4ReportPreview(output(), narrative, task)).toThrow();
    expect(() => inspectM4TargetNarrativeOutput(output(), task)).toThrow();
    const badNarrative = {
      ...narrative,
      directions: [{ ...narrative.directions[0], sampleIds: ["s9"] }],
    };
    expect(() => inspectM4TargetNarrativeOutput(badNarrative, task)).toThrow(
      "Unknown evidence sample",
    );
    expect(() => composeM4ReportPreview(grouping, badNarrative, task)).toThrow(
      "Unknown evidence sample",
    );
    for (const members of [
      ["s1-b1", "s9-b1"],
      ["s1-b1", "s1-b1"],
    ]) {
      const badGrouping = { brandGroups: [{ displayName: "山岚", members }] };
      expect(() => inspectM4BrandGroupingOutput(badGrouping, task)).toThrow();
      expect(() =>
        composeM4ReportPreview(badGrouping, narrative, task),
      ).toThrow();
    }
  });
  it("flattens only brand placement and preserves a lossless source-shaped reconstruction", () => {
    const task = buildM4ChainSynthesisTask(
      "青禾咖啡",
      inputs,
      4,
      "用户提供的品牌背景。",
    );
    const before = structuredClone(task);
    const flat = flattenM4ChainSynthesisTask(task);
    expect(task).toEqual(before);
    expect(flat.systemInstruction).toBe(task.systemInstruction);
    expect(flat.outputContract).toEqual(task.outputContract);
    expect(flat.userContext.coverage).toEqual(task.userContext.coverage);
    expect(flat.userContext.brandContext).toBe(task.userContext.brandContext);
    expect(flat.userContext.otherBrands).toHaveLength(4);
    expect(flat.userContext.samples[0]).not.toHaveProperty("otherBrands");
    const restored = flat.userContext.samples.map((sample) => ({
      ...sample,
      otherBrands: flat.userContext.otherBrands
        .filter((brand) => brand.sampleId === sample.sampleId)
        .map(({ sampleId: _sampleId, ...brand }) => brand),
    }));
    expect(restored).toEqual(task.userContext.samples);
    expect(flat.userContext.otherBrands[1]!.positiveRecommendation).toBe(false);
    expect(flat.userContext.otherBrands[0]!.evidence[0]!.exactText).toContain(
      "Hill Coffee",
    );
    expect(inspectM4ChainSynthesisOutput(output(), task)).toEqual(
      inspectM4ChainSynthesisOutput(output(), before),
    );
    const empty = buildM4ChainSynthesisTask(
      "青禾咖啡",
      inputs.map((s) => ({
        ...s,
        parsedOutput: { target: null, otherBrands: [] },
      })),
    );
    expect(flattenM4ChainSynthesisTask(empty).userContext.otherBrands).toEqual(
      [],
    );
  });
  it("bounds wire references to actual samples and brand records, with no invented identifiers", () => {
    const schema = buildM4ChainSynthesisTask("青禾咖啡", inputs).outputContract
      .jsonSchema as any;
    expect(
      schema.properties.positiveThemes.items.properties.sampleIds.items.enum,
    ).toEqual(["s1", "s2"]);
    expect(
      schema.properties.directions.items.properties.sampleIds.items.enum,
    ).toEqual(["s1", "s2"]);
    expect(
      schema.properties.brandGroups.items.properties.members.items.enum,
    ).toEqual(["s1-b1", "s1-b2", "s2-b1", "s2-b2"]);
    const noBrands = inputs.map((s) => ({
      ...s,
      parsedOutput: { target: null, otherBrands: [] },
    }));
    const empty = buildM4ChainSynthesisTask("青禾咖啡", noBrands).outputContract
      .jsonSchema as any;
    expect(empty.properties.brandGroups.maxItems).toBe(0);
  });
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
