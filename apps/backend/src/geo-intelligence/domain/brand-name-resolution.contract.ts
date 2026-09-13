import { z } from "zod";

import type { OverallSynthesisSampleContext } from "./overall-synthesis.contract.js";
import {
  typicalPositionFromPositions,
  type EvaluationReportMetrics,
} from "./evaluation-report.policy.js";

export const BRAND_NAME_RESOLUTION_CONTRACT_VERSION =
  "evaluation.brand-name-resolution@1";
export const BRAND_NAME_RESOLUTION_MODEL_CONTRACT_VERSION =
  "evaluation.brand-name-resolution-model@1";

const text = (maximum: number) => z.string().trim().min(1).max(maximum);
export const brandNameResolutionOutputSchema = z
  .object({
    brandGroups: z.array(
      z
        .object({
          displayName: text(120),
          observedNames: z.array(text(120)).min(1),
        })
        .strict(),
    ),
    ignoredNames: z.array(text(120)),
  })
  .strict();

export const brandNameResolutionJsonSchema = z.toJSONSchema(
  brandNameResolutionOutputSchema,
  { target: "draft-2020-12" },
);

export type BrandNameResolutionOutput = z.infer<
  typeof brandNameResolutionOutputSchema
>;

export type BrandNameResolutionSample = OverallSynthesisSampleContext & {
  platformLabel: string;
};

export function observedBrandNames(samples: BrandNameResolutionSample[]) {
  const names = new Map<
    string,
    { observedName: string; mentionContext: string[] }
  >();
  for (const sample of samples) {
    if (sample.semantic.profile !== "OPEN_DISCOVERY") continue;
    for (const brand of sample.semantic.otherBrands) {
      const entry = names.get(brand.displayName) ?? {
        observedName: brand.displayName,
        mentionContext: [],
      };
      for (const point of brand.mentionContext ?? []) {
        if (!entry.mentionContext.includes(point))
          entry.mentionContext.push(point);
      }
      names.set(brand.displayName, entry);
    }
  }
  return [...names.values()];
}

export function parseBrandNameResolution(
  input: unknown,
  samples: BrandNameResolutionSample[],
  focusBrand: string,
): BrandNameResolutionOutput {
  const output = brandNameResolutionOutputSchema.parse(input);
  const expected = new Set(
    observedBrandNames(samples).map((row) => row.observedName),
  );
  const seen = new Set<string>();
  const issues: string[] = [];
  const take = (name: string) => {
    if (!expected.has(name)) issues.push(`unknown observed name ${name}`);
    if (seen.has(name)) issues.push(`repeated observed name ${name}`);
    seen.add(name);
  };
  const groupNames = new Set<string>();
  const focusKeys = new Set(
    [
      focusBrand,
      ...samples.flatMap((sample) => sample.semantic.targetDisplayedForms),
    ].map(normalizedBrandName),
  );
  for (const group of output.brandGroups) {
    const key = normalizedBrandName(group.displayName);
    if (groupNames.has(key))
      issues.push(`repeated group name ${group.displayName}`);
    if (focusKeys.has(key))
      issues.push(`competitor group is focus brand ${group.displayName}`);
    groupNames.add(key);
    group.observedNames.forEach(take);
  }
  output.ignoredNames.forEach(take);
  for (const name of expected) {
    if (!seen.has(name)) issues.push(`missing observed name ${name}`);
  }
  if (issues.length > 0) {
    throw new BrandNameResolutionSemanticError(issues);
  }
  return output;
}

export class BrandNameResolutionSemanticError extends Error {
  constructor(readonly issues: string[]) {
    super(`Brand name resolution failed: ${issues.join("; ")}`);
    this.name = "BrandNameResolutionSemanticError";
  }
}

export function normalizedBrandName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ")
    .replace(/(\p{Script=Han}) (?=[\p{Script=Latin}\p{Number}])/gu, "$1")
    .replace(/([\p{Script=Latin}\p{Number}]) (?=\p{Script=Han})/gu, "$1");
}

export function applyBrandNameResolution(
  resolution: BrandNameResolutionOutput,
  samples: BrandNameResolutionSample[],
  metrics: EvaluationReportMetrics,
) {
  const groupByObservedName = new Map<string, number>();
  resolution.brandGroups.forEach((group, index) => {
    group.observedNames.forEach((name) => groupByObservedName.set(name, index));
  });
  const ignored = new Set(resolution.ignoredNames);
  const groupedOccurrences = new Map<
    number,
    EvaluationReportMetrics["eligibleCompetitorOccurrences"]
  >();
  const eligibleCompetitorOccurrences =
    metrics.eligibleCompetitorOccurrences.filter((occurrence) => {
      if (ignored.has(occurrence.displayName)) return false;
      const groupIndex = groupByObservedName.get(occurrence.displayName);
      if (groupIndex === undefined) {
        throw new Error(
          `Resolved competitor is missing ${occurrence.displayName}`,
        );
      }
      const group = groupedOccurrences.get(groupIndex) ?? [];
      group.push(occurrence);
      groupedOccurrences.set(groupIndex, group);
      return true;
    });
  const brandEntityGroups = [
    ...resolution.brandGroups.map((group, index) => ({
      groupId: `brand-group-${index + 1}`,
      displayName: group.displayName,
      members: sourceMembers(samples, new Set(group.observedNames)),
      resolutionBasis: [
        {
          kind: "ANSWER_CONTEXT" as const,
          explanation: "根据采样内容中的名称和介绍整理为同一品牌主体。",
          sourceUrl: null,
        },
      ],
    })),
    ...resolution.ignoredNames.map((name, index) => ({
      groupId: `ignored-brand-${index + 1}`,
      displayName: name,
      members: sourceMembers(samples, new Set([name])),
      resolutionBasis: [
        {
          kind: "ANSWER_CONTEXT" as const,
          explanation: "该名称无法稳定对应具体品牌，不进入客户竞品统计。",
          sourceUrl: null,
        },
      ],
    })),
  ];
  const competitors = resolution.brandGroups.flatMap((group, index) => {
    const occurrences = groupedOccurrences.get(index) ?? [];
    const perSample = new Map<string, number>();
    for (const occurrence of occurrences) {
      if (occurrence.relativePosition === null) continue;
      perSample.set(
        occurrence.sampleId,
        Math.min(
          perSample.get(occurrence.sampleId) ?? Number.POSITIVE_INFINITY,
          occurrence.relativePosition,
        ),
      );
    }
    return occurrences.length === 0
      ? []
      : [
          {
            displayName: group.displayName,
            occurrenceCount: new Set(
              occurrences.map((occurrence) => occurrence.sampleId),
            ).size,
            platforms: [
              ...new Set(
                occurrences.map((occurrence) => occurrence.platformLabel),
              ),
            ],
            typicalPosition: typicalPositionFromPositions([
              ...perSample.values(),
            ]),
          },
        ];
  });
  return {
    metrics: { ...metrics, eligibleCompetitorOccurrences },
    brandEntityGroups,
    competitors: competitors
      .sort(
        (left, right) =>
          right.occurrenceCount - left.occurrenceCount ||
          left.displayName.localeCompare(right.displayName),
      )
      .slice(0, 5),
  };
}

function sourceMembers(
  samples: BrandNameResolutionSample[],
  names: Set<string>,
) {
  return samples.flatMap((sample) =>
    sample.semantic.otherBrands.flatMap((brand) =>
      names.has(brand.displayName)
        ? [
            {
              sampleId: sample.sampleId,
              brandMentionId: brand.brandMentionId,
              relationship: "SAME_NAME" as const,
            },
          ]
        : [],
    ),
  );
}
