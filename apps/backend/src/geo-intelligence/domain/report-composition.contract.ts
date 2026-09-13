import { z } from "zod";

import type { EvaluationReportMetrics } from "./evaluation-report.policy.js";
import {
  parseOverallSynthesisOutput,
  type OverallSynthesisOutput,
  type OverallSynthesisSampleContext,
} from "./overall-synthesis.contract.js";
import type { BrandNameResolutionOutput } from "./brand-name-resolution.contract.js";
import { applyBrandNameResolution } from "./brand-name-resolution.contract.js";

export const REPORT_COMPOSITION_MODEL_CONTRACT_VERSION =
  "evaluation.report-composition-model@1";

const text = (maximum: number) => z.string().trim().min(1).max(maximum);
const localId = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const pointReferenceSchema = z
  .object({ sampleId: z.string().uuid(), pointId: localId })
  .strict();
const themeSchema = z
  .object({
    label: text(80),
    summary: text(600),
    pointRefs: z.array(pointReferenceSchema).min(1),
  })
  .strict();
export const reportCompositionOutputSchema = z
  .object({
    recommendationAssessment: text(1_200),
    brandPerception: text(1_200),
    positiveThemes: z.array(themeSchema).max(5),
    negativeThemes: z.array(themeSchema).max(5),
    directions: z
      .array(
        z
          .object({
            currentProblem: text(400),
            recommendedDirection: text(600),
            intendedImprovement: text(300),
            sampleIds: z.array(z.string().uuid()).min(1),
          })
          .strict(),
      )
      .max(2),
  })
  .strict();

export const reportCompositionJsonSchema = z.toJSONSchema(
  reportCompositionOutputSchema,
  { target: "draft-2020-12" },
);

export type ReportCompositionOutput = z.infer<
  typeof reportCompositionOutputSchema
>;

export type ReportCompositionSample = OverallSynthesisSampleContext & {
  questionId: string;
  question: string;
  platformLabel: string;
  mentioned: boolean;
  position: number | null;
};

export function parseAndProjectReportComposition(input: {
  output: unknown;
  focusBrand: string;
  samples: ReportCompositionSample[];
  metrics: EvaluationReportMetrics;
  resolution: BrandNameResolutionOutput;
}): { synthesis: OverallSynthesisOutput; metrics: EvaluationReportMetrics } {
  const output = reportCompositionOutputSchema.parse(input.output);
  const sampleIds = new Set(input.samples.map((sample) => sample.sampleId));
  const pointKeys = new Set(
    input.samples.flatMap((sample) =>
      sample.semantic.targetObservations.map(
        (point) => `${sample.sampleId}:${point.observationId}`,
      ),
    ),
  );
  const issues: string[] = [];
  const validateTheme = (theme: (typeof output.positiveThemes)[number]) => {
    for (const ref of theme.pointRefs) {
      if (!pointKeys.has(`${ref.sampleId}:${ref.pointId}`)) {
        issues.push(
          `theme references missing point ${ref.sampleId}:${ref.pointId}`,
        );
      }
    }
  };
  output.positiveThemes.forEach(validateTheme);
  output.negativeThemes.forEach(validateTheme);
  for (const direction of output.directions) {
    for (const sampleId of direction.sampleIds) {
      if (!sampleIds.has(sampleId)) {
        issues.push(`direction references missing sample ${sampleId}`);
      }
    }
  }
  rejectInternalReferences(output, issues);
  if (issues.length > 0) throw new ReportCompositionSemanticError(issues);

  const resolved = applyBrandNameResolution(
    input.resolution,
    input.samples,
    input.metrics,
  );
  const openRefs = input.samples
    .filter((sample) => sample.questionKind !== "BRAND_DIRECTED")
    .map((sample) => ({ sampleId: sample.sampleId, observationId: null }));
  const targetRefs = input.samples
    .filter((sample) => sample.semantic.targetDisplayedForms.length > 0)
    .map((sample) => ({ sampleId: sample.sampleId, observationId: null }));
  const fallbackRefs = input.samples.slice(0, 1).map((sample) => ({
    sampleId: sample.sampleId,
    observationId: null,
  }));
  let themeOrdinal = 0;
  const projectTheme = (theme: (typeof output.positiveThemes)[number]) => ({
    themeId: `theme-${++themeOrdinal}`,
    label: theme.label,
    summary: theme.summary,
    evidenceRefs: uniquePointRefs(theme.pointRefs).map((ref) => ({
      sampleId: ref.sampleId,
      observationId: ref.pointId,
    })),
  });
  const customerDirections = output.directions.map((direction, index) => ({
    directionId: `direction-${index + 1}`,
    currentProblem: direction.currentProblem,
    recommendedDirection: direction.recommendedDirection,
    intendedImprovement: direction.intendedImprovement,
    evidenceRefs: [...new Set(direction.sampleIds)].map((sampleId) => ({
      sampleId,
      observationId: null,
    })),
  }));
  const projected: OverallSynthesisOutput = {
    brandEntityGroups: resolved.brandEntityGroups,
    recommendationAssessment: {
      summary: output.recommendationAssessment,
      evidenceRefs: openRefs.length > 0 ? openRefs : fallbackRefs,
    },
    brandPerception: {
      summary: output.brandPerception,
      evidenceRefs: targetRefs.length > 0 ? targetRefs : fallbackRefs,
    },
    themes: {
      positive: output.positiveThemes.map(projectTheme),
      negative: output.negativeThemes.map(projectTheme),
    },
    customerDirections,
    internalGuidance: {
      summary: output.brandPerception,
      priorities: [...output.positiveThemes, ...output.negativeThemes].map(
        (theme, index) => ({
          guidanceId: `guidance-priority-${index + 1}`,
          label: theme.label,
          detail: theme.summary,
          evidenceRefs: uniquePointRefs(theme.pointRefs).map((ref) => ({
            sampleId: ref.sampleId,
            observationId: ref.pointId,
          })),
        }),
      ),
      writingAngles: customerDirections.map((direction, index) => ({
        guidanceId: `guidance-angle-${index + 1}`,
        label: direction.recommendedDirection.slice(0, 100),
        detail: `${direction.currentProblem}${direction.intendedImprovement}`,
        evidenceRefs: direction.evidenceRefs,
      })),
      cautions: [],
    },
    limitations: [],
  };
  return {
    synthesis: parseOverallSynthesisOutput(projected, input.samples),
    metrics: resolved.metrics,
  };
}

export class ReportCompositionSemanticError extends Error {
  constructor(readonly issues: string[]) {
    super(`Report composition failed: ${issues.join("; ")}`);
    this.name = "ReportCompositionSemanticError";
  }
}

function uniquePointRefs(refs: Array<{ sampleId: string; pointId: string }>) {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.sampleId}:${ref.pointId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rejectInternalReferences(
  output: ReportCompositionOutput,
  issues: string[],
) {
  const prose = [
    output.recommendationAssessment,
    output.brandPerception,
    ...output.positiveThemes.flatMap((theme) => [theme.label, theme.summary]),
    ...output.negativeThemes.flatMap((theme) => [theme.label, theme.summary]),
    ...output.directions.flatMap((direction) => [
      direction.currentProblem,
      direction.recommendedDirection,
      direction.intendedImprovement,
    ]),
  ];
  if (
    prose.some((value) =>
      /\b(?:q\d+|sampleId|pointId|observationId)\b/iu.test(value),
    )
  ) {
    issues.push("customer prose contains an internal reference");
  }
}
