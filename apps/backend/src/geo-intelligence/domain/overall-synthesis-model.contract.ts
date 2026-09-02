import { z } from "zod";

import {
  OverallSynthesisSemanticError,
  parseOverallSynthesisOutput,
  type OverallSynthesisOutput,
  type OverallSynthesisSampleContext,
} from "./overall-synthesis.contract.js";
import {
  collectSampleSemanticObservations,
  type SampleSemanticObservation,
} from "./sample-parser.contract.js";

export const OVERALL_SYNTHESIS_MODEL_CONTRACT_VERSION =
  "evaluation.overall-synthesis-model@4";

const boundedText = (maximum: number) => z.string().trim().min(1).max(maximum);
const localSampleRef = z
  .string()
  .regex(/^s\d{2,3}$/)
  .describe("关联输入 evidenceSamples 中的一条样本");
const localObservationRef = z
  .string()
  .regex(/^o\d{2,3}$/)
  .describe("关联同一样本中的一条观察");
const localCandidateRef = z
  .string()
  .regex(/^b\d{2,3}$/)
  .describe("关联输入 brandCandidates 中的一个品牌候选");

const sampleReferenceSchema = z
  .object({
    sampleRef: localSampleRef,
    observationRef: localObservationRef.nullable(),
  })
  .strict();

const observationReferenceSchema = z
  .object({
    sampleRef: localSampleRef,
    observationRef: localObservationRef,
  })
  .strict();

const customerNarrative = (maximum: number, purpose: string) =>
  boundedText(maximum).describe(
    `${purpose}；使用品牌经营者可以直接阅读的正式、简洁中文`,
  );

const evidenceLinkedNarrativeSchema = (purpose: string) =>
  z
    .object({
      summary: customerNarrative(1_200, purpose),
      evidenceRefs: z.array(sampleReferenceSchema).min(1).max(40),
    })
    .strict();

const brandGroupProposalSchema = z
  .object({
    displayName: customerNarrative(120, "普通客户可识别的统一品牌名称"),
    members: z
      .array(
        z
          .object({
            candidateRef: localCandidateRef,
            relationship: z.enum([
              "SAME_NAME",
              "TRANSLATION_OR_ABBREVIATION",
              "STORE_FORMAT",
              "SUBORDINATE_BRAND_LINE",
            ]),
          })
          .strict(),
      )
      .min(2)
      .max(100)
      .describe("属于同一消费者品牌的两个或更多候选"),
    explanation: boundedText(500).describe(
      "简要说明这些名称属于同一消费者品牌的依据，供归组审计使用",
    ),
  })
  .strict();

const themeProposalSchema = z
  .object({
    label: customerNarrative(80, "概括一项主要证据模式的主题标题"),
    summary: customerNarrative(600, "说明该模式及其证据范围的主题段落"),
    evidenceRefs: z.array(observationReferenceSchema).min(1).max(60),
  })
  .strict();

const customerDirectionProposalSchema = z
  .object({
    currentProblem: customerNarrative(400, "基于证据指出当前差距"),
    recommendedDirection: customerNarrative(600, "给出与差距对应的可执行方向"),
    intendedImprovement: customerNarrative(300, "说明合理且非保证性的预期改善"),
    evidenceRefs: z.array(sampleReferenceSchema).min(1).max(60),
  })
  .strict();

const guidanceProposalSchema = z
  .object({
    label: boundedText(100),
    detail: boundedText(1_000),
    evidenceRefs: z.array(sampleReferenceSchema).min(1).max(80),
  })
  .strict();

export const overallSynthesisModelOutputSchema = z
  .object({
    brandEntityGroups: z
      .array(brandGroupProposalSchema)
      .max(100)
      .describe("经过语义判断需要合并的品牌候选组"),
    independentCandidateRefs: z
      .array(localCandidateRef)
      .max(100)
      .describe("判断为独立或证据不足以合并的全部品牌候选"),
    recommendationAssessment: evidenceLinkedNarrativeSchema(
      "概括当前品牌在开放推荐问题中的表现及证据范围",
    ),
    brandPerception: evidenceLinkedNarrativeSchema(
      "概括各平台对当前品牌形成的主要认知与差异",
    ),
    themes: z
      .object({
        positive: z.array(themeProposalSchema).max(5),
        negative: z.array(themeProposalSchema).max(5),
      })
      .strict(),
    customerDirections: z
      .array(customerDirectionProposalSchema)
      .min(1)
      .max(3)
      .describe("按业务影响排序的客户优化方向"),
    internalGuidance: z
      .object({
        summary: boundedText(2_000),
        priorities: z.array(guidanceProposalSchema).min(1).max(8),
        writingAngles: z.array(guidanceProposalSchema).min(1).max(8),
        cautions: z.array(boundedText(500)).max(8),
      })
      .strict(),
    limitations: z.array(boundedText(500)).max(8),
  })
  .strict();

export type OverallSynthesisModelOutput = z.infer<
  typeof overallSynthesisModelOutputSchema
>;

export type OverallSynthesisModelReferenceProjection = {
  evidenceSamples: Array<{
    sampleRef: string;
    finding: string;
    observations: Array<{
      observationRef: string;
      label: string;
      detail: string;
      tone: string;
    }>;
    brandCandidateRefs: string[];
  }>;
  brandCandidates: Array<{
    candidateRef: string;
    names: string[];
  }>;
};

type BrandCandidate = {
  candidateRef: string;
  names: string[];
  members: Array<{ sampleId: string; brandMentionId: string }>;
};

type ReferenceIndex = {
  projection: OverallSynthesisModelReferenceProjection;
  sampleByRef: Map<string, OverallSynthesisSampleContext>;
  observationByRef: Map<string, SampleSemanticObservation>;
  candidateByRef: Map<string, BrandCandidate>;
};

export const overallSynthesisModelJsonSchema = z.toJSONSchema(
  overallSynthesisModelOutputSchema,
  { target: "draft-2020-12" },
);

export function buildOverallSynthesisModelReferenceProjection(
  samples: OverallSynthesisSampleContext[],
): OverallSynthesisModelReferenceProjection {
  return buildReferenceIndex(samples).projection;
}

export function orderOverallSynthesisSamples<
  Sample extends OverallSynthesisSampleContext,
>(samples: Sample[]): Sample[] {
  const questionOrder = {
    BRAND_DIRECTED: 1,
    INDUSTRY_RECOMMENDATION: 2,
    CHARACTERISTIC_ONE: 3,
    CHARACTERISTIC_TWO: 4,
  } as const;
  return [...samples].sort(
    (left, right) =>
      questionOrder[left.questionKind] - questionOrder[right.questionKind] ||
      left.platformKey.localeCompare(right.platformKey) ||
      left.sampleId.localeCompare(right.sampleId),
  );
}

export function parseAndProjectOverallSynthesisModelOutput(
  input: unknown,
  samples: OverallSynthesisSampleContext[],
  _providerContext?: {
    searchObservation?: "TRIGGERED" | "NOT_TRIGGERED" | "UNKNOWN";
    sourceMetadata?: Array<Record<string, unknown>>;
  },
): OverallSynthesisOutput {
  const modelOutput = overallSynthesisModelOutputSchema.parse(input);
  return parseOverallSynthesisOutput(
    projectModelOutput(modelOutput, buildReferenceIndex(samples)),
    samples,
  );
}

function projectModelOutput(
  input: OverallSynthesisModelOutput,
  references: ReferenceIndex,
): OverallSynthesisOutput {
  const groupedCandidates = new Set<string>();
  const issues: string[] = [];
  for (const group of input.brandEntityGroups) {
    const withinGroup = new Set<string>();
    for (const member of group.members) {
      if (!references.candidateByRef.has(member.candidateRef)) {
        issues.push(`brand group references missing ${member.candidateRef}`);
      }
      if (withinGroup.has(member.candidateRef)) {
        issues.push(`brand group repeats ${member.candidateRef}`);
      }
      if (groupedCandidates.has(member.candidateRef)) {
        issues.push(
          `${member.candidateRef} appears in more than one brand group`,
        );
      }
      withinGroup.add(member.candidateRef);
      groupedCandidates.add(member.candidateRef);
    }
  }
  for (const candidateRef of input.independentCandidateRefs) {
    if (!references.candidateByRef.has(candidateRef)) {
      issues.push(`independent brand references missing ${candidateRef}`);
    }
    if (groupedCandidates.has(candidateRef)) {
      issues.push(`${candidateRef} appears in more than one brand decision`);
    }
    groupedCandidates.add(candidateRef);
  }
  for (const candidateRef of references.candidateByRef.keys()) {
    if (!groupedCandidates.has(candidateRef)) {
      issues.push(`brand decision omitted ${candidateRef}`);
    }
  }
  if (issues.length > 0) throw new OverallSynthesisSemanticError(issues);

  const proposedGroups = input.brandEntityGroups.map((group) => ({
    displayName: group.displayName,
    members: group.members.flatMap((member) =>
      references.candidateByRef
        .get(member.candidateRef)!
        .members.map((source) => ({
          ...source,
          relationship: member.relationship,
        })),
    ),
    explanation: group.explanation,
  }));
  const singletonGroups = input.independentCandidateRefs.map((candidateRef) => {
    const candidate = references.candidateByRef.get(candidateRef)!;
    return {
      displayName: candidate.names[0]!,
      members: candidate.members.map((source) => ({
        ...source,
        relationship: "SAME_NAME" as const,
      })),
      explanation: "该候选经本次证据判断保持独立。",
    };
  });
  const brandEntityGroups = [...proposedGroups, ...singletonGroups].map(
    (group, index) => ({
      groupId: `brand-group-${index + 1}`,
      displayName: group.displayName,
      members: group.members,
      resolutionBasis: [
        {
          kind: "ANSWER_CONTEXT" as const,
          explanation: group.explanation,
          sourceUrl: null,
        },
      ],
    }),
  );
  let themeOrdinal = 0;
  const projectTheme = (
    theme: OverallSynthesisModelOutput["themes"]["positive"][number],
  ) => ({
    themeId: `theme-${++themeOrdinal}`,
    label: theme.label,
    summary: theme.summary,
    evidenceRefs: resolveObservationReferences(theme.evidenceRefs, references),
  });
  let guidanceOrdinal = 0;
  const projectGuidance = (
    guidance: OverallSynthesisModelOutput["internalGuidance"]["priorities"][number],
  ) => ({
    guidanceId: `guidance-${++guidanceOrdinal}`,
    label: guidance.label,
    detail: guidance.detail,
    evidenceRefs: resolveSampleReferences(guidance.evidenceRefs, references),
  });

  return {
    brandEntityGroups,
    recommendationAssessment: {
      summary: input.recommendationAssessment.summary,
      evidenceRefs: resolveSampleReferences(
        input.recommendationAssessment.evidenceRefs,
        references,
      ),
    },
    brandPerception: {
      summary: input.brandPerception.summary,
      evidenceRefs: resolveSampleReferences(
        input.brandPerception.evidenceRefs,
        references,
      ),
    },
    themes: {
      positive: input.themes.positive.map(projectTheme),
      negative: input.themes.negative.map(projectTheme),
    },
    customerDirections: input.customerDirections.map((direction, index) => ({
      directionId: `direction-${index + 1}`,
      currentProblem: direction.currentProblem,
      recommendedDirection: direction.recommendedDirection,
      intendedImprovement: direction.intendedImprovement,
      evidenceRefs: resolveSampleReferences(direction.evidenceRefs, references),
    })),
    internalGuidance: {
      summary: input.internalGuidance.summary,
      priorities: input.internalGuidance.priorities.map(projectGuidance),
      writingAngles: input.internalGuidance.writingAngles.map(projectGuidance),
      cautions: input.internalGuidance.cautions,
    },
    limitations: input.limitations,
  };
}

function buildReferenceIndex(
  samples: OverallSynthesisSampleContext[],
): ReferenceIndex {
  const orderedSamples = orderOverallSynthesisSamples(samples);
  const sampleByRef = new Map<string, OverallSynthesisSampleContext>();
  const observationByRef = new Map<string, SampleSemanticObservation>();
  const candidateAccumulators: Array<{
    names: Set<string>;
    normalizedNames: Set<string>;
    members: Array<{ sampleId: string; brandMentionId: string }>;
  }> = [];

  for (const sample of orderedSamples) {
    for (const brand of sample.semantic.otherBrands) {
      const names = uniqueStrings([brand.displayName, ...brand.observedForms]);
      const normalizedNames = new Set(names.map(normalizeCandidateName));
      const matches = candidateAccumulators.filter((candidate) =>
        [...normalizedNames].some((name) =>
          candidate.normalizedNames.has(name),
        ),
      );
      const candidate = matches[0] ?? {
        names: new Set<string>(),
        normalizedNames: new Set<string>(),
        members: [],
      };
      if (matches.length === 0) candidateAccumulators.push(candidate);
      for (const match of matches.slice(1)) {
        match.names.forEach((name) => candidate.names.add(name));
        match.normalizedNames.forEach((name) =>
          candidate.normalizedNames.add(name),
        );
        candidate.members.push(...match.members);
        candidateAccumulators.splice(candidateAccumulators.indexOf(match), 1);
      }
      names.forEach((name) => candidate.names.add(name));
      normalizedNames.forEach((name) => candidate.normalizedNames.add(name));
      candidate.members.push({
        sampleId: sample.sampleId,
        brandMentionId: brand.brandMentionId,
      });
    }
  }

  const candidates = candidateAccumulators.map((candidate, index) => ({
    candidateRef: localRef("b", index),
    names: [...candidate.names],
    members: candidate.members,
  }));
  const mentionCandidateRef = new Map<string, string>();
  for (const candidate of candidates) {
    for (const member of candidate.members) {
      mentionCandidateRef.set(
        sourceKey(member.sampleId, member.brandMentionId),
        candidate.candidateRef,
      );
    }
  }

  const evidenceSamples = orderedSamples.map((sample, sampleIndex) => {
    const sampleRef = localRef("s", sampleIndex);
    sampleByRef.set(sampleRef, sample);
    const observations = collectSampleSemanticObservations(sample.semantic).map(
      (observation, observationIndex) => {
        const observationRef = localRef("o", observationIndex);
        observationByRef.set(
          requestKey(sampleRef, observationRef),
          observation,
        );
        return {
          observationRef,
          label: observation.label,
          detail: observation.detail,
          tone: customerTone(observation.polarity),
        };
      },
    );
    return {
      sampleRef,
      finding: sample.semantic.cardInterpretation,
      observations,
      brandCandidateRefs: uniqueStrings(
        sample.semantic.otherBrands.map((brand) =>
          mentionCandidateRef.get(
            sourceKey(sample.sampleId, brand.brandMentionId),
          )!,
        ),
      ),
    };
  });

  return {
    projection: {
      evidenceSamples,
      brandCandidates: candidates.map(({ candidateRef, names }) => ({
        candidateRef,
        names,
      })),
    },
    sampleByRef,
    observationByRef,
    candidateByRef: new Map(
      candidates.map((candidate) => [candidate.candidateRef, candidate]),
    ),
  };
}

function resolveSampleReferences(
  references: Array<{ sampleRef: string; observationRef: string | null }>,
  index: ReferenceIndex,
) {
  const issues: string[] = [];
  const resolved = references.flatMap((reference) => {
    const sample = index.sampleByRef.get(reference.sampleRef);
    if (!sample) {
      issues.push(`evidence references missing ${reference.sampleRef}`);
      return [];
    }
    const observation =
      reference.observationRef === null
        ? undefined
        : index.observationByRef.get(
            requestKey(reference.sampleRef, reference.observationRef),
          );
    if (reference.observationRef !== null && !observation) {
      issues.push(
        `evidence references missing ${reference.sampleRef}:${reference.observationRef}`,
      );
      return [];
    }
    return [
      {
        sampleId: sample.sampleId,
        observationId: observation?.observationId ?? null,
      },
    ];
  });
  if (issues.length > 0) throw new OverallSynthesisSemanticError(issues);
  return uniqueCanonicalReferences(resolved);
}

function resolveObservationReferences(
  references: Array<{ sampleRef: string; observationRef: string }>,
  index: ReferenceIndex,
) {
  const issues: string[] = [];
  const resolved = references.flatMap((reference) => {
    const sample = index.sampleByRef.get(reference.sampleRef);
    const observation = index.observationByRef.get(
      requestKey(reference.sampleRef, reference.observationRef),
    );
    if (!sample) {
      issues.push(`evidence references missing ${reference.sampleRef}`);
      return [];
    }
    if (!observation) {
      issues.push(
        `evidence references missing ${reference.sampleRef}:${reference.observationRef}`,
      );
      return [];
    }
    return [
      { sampleId: sample.sampleId, observationId: observation.observationId },
    ];
  });
  if (issues.length > 0) throw new OverallSynthesisSemanticError(issues);
  return uniqueCanonicalReferences(resolved);
}

function uniqueCanonicalReferences<
  Reference extends { sampleId: string; observationId: string | null },
>(references: Reference[]): Reference[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = sourceKey(reference.sampleId, reference.observationId ?? "*");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function customerTone(polarity: SampleSemanticObservation["polarity"]): string {
  return {
    POSITIVE: "正面",
    NEGATIVE: "负面",
    NEUTRAL: "中性",
    MIXED: "正负并存",
    UNCERTAIN: "不确定",
  }[polarity];
}

function normalizeCandidateName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\p{P}\p{S}\s]/gu, "");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function localRef(prefix: "s" | "o" | "b", index: number): string {
  return `${prefix}${(index + 1).toString().padStart(2, "0")}`;
}

function requestKey(sampleRef: string, observationRef: string): string {
  return `${sampleRef}:${observationRef}`;
}

function sourceKey(sampleId: string, localId: string): string {
  return `${sampleId}:${localId}`;
}
