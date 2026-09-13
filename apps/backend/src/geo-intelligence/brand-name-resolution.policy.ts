import { readFileSync } from "node:fs";
import { z } from "zod";

import {
  BRAND_NAME_RESOLUTION_MODEL_CONTRACT_VERSION,
  brandNameResolutionJsonSchema,
  observedBrandNames,
  type BrandNameResolutionSample,
} from "./domain/brand-name-resolution.contract.js";

const asset = z
  .object({ id: z.string(), version: z.string(), content: z.string().min(1) })
  .strict()
  .parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../../geo-intelligence/brand-name-resolution/common.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );

export function buildBrandNameResolutionTask(
  samples: BrandNameResolutionSample[],
) {
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction: asset.content,
    userContext: { brandNames: observedBrandNames(samples) },
    outputContract: {
      version: BRAND_NAME_RESOLUTION_MODEL_CONTRACT_VERSION,
      jsonSchema: brandNameResolutionJsonSchema as Record<string, unknown>,
      enforcement: "JSON_OBJECT" as const,
    },
  };
}

export function brandNameResolutionInstructionProfile(): string {
  return `${asset.id}@${asset.version}`;
}
