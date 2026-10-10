import type { SampleAiAttemptRequest } from "../ai-execution/domain/ai-attempt.types.js";
import { evaluationBrandTextContext } from "./domain/evaluation-brand-snapshot.js";
import type { EvaluationSampleWorkContext } from "./domain/evaluation-process.types.js";

/** One GEO-owned API request meaning, independent of physical transport. */
export function buildSampleAcquisitionRequest(
  context: EvaluationSampleWorkContext,
  attemptNumber: number,
  deadlineAt?: number,
): SampleAiAttemptRequest {
  const brand = evaluationBrandTextContext(context.brandSnapshot);
  return {
    runId: context.runId,
    cycleId: context.cycleId,
    sampleId: context.sampleId,
    purpose: "EVALUATION_ACQUISITION",
    attemptNumber,
    routePolicyId: context.routePolicyId,
    requestedModel: context.requestedModel,
    correlationId: context.correlationId,
    ...(deadlineAt === undefined
      ? {}
      : { executionChannel: "API", deadlineAt }),
    input: {
      taskKind: "EVALUATION_ACQUISITION",
      systemInstruction: context.objectivityInstruction,
      companyName: context.companyName,
      query: context.query,
      questionOrdinal: context.questionOrdinal,
      platformLabel: context.platformLabel,
      province: brand.province,
      city: brand.city,
    },
  };
}
