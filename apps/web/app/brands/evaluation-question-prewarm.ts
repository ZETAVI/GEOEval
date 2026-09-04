import { prepareEvaluationDefinition, type Brand } from "@geoeval/api-client";

type PrewarmBrand = Pick<Brand, "id" | "isCurrent" | "readyForEvaluation">;
type PrepareEvaluationDefinition = (
  apiBaseUrl: string,
  brandId: string,
) => Promise<unknown>;

export async function prewarmEvaluationQuestions(
  apiBaseUrl: string,
  brand: PrewarmBrand,
  prepare: PrepareEvaluationDefinition = prepareEvaluationDefinition,
): Promise<void> {
  if (!brand.isCurrent || !brand.readyForEvaluation) return;

  try {
    await prepare(apiBaseUrl, brand.id);
  } catch {
    // Brand persistence already succeeded. Diagnosis remains the authoritative
    // ensure-and-observe path when this opportunistic request cannot complete.
  }
}
