import type { BrandMutation } from "@geoeval/api-client";

export function brandMutationForSave(input: BrandMutation): BrandMutation {
  return {
    ...input,
    ...(input.characteristics
      ? {
          characteristics: input.characteristics.filter(
            (item) => item.title.trim() || item.detail?.trim(),
          ),
        }
      : {}),
  };
}
