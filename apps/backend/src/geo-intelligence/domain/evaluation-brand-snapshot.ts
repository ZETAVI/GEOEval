import { z } from "zod";

const officialRegionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  officialCode: z.string().min(1),
  officialLevel: z.enum(["PROVINCE", "PREFECTURE", "COUNTY", "TOWNSHIP"]),
});

export const evaluationBrandSnapshotV2Schema = z.object({
  schemaVersion: z.literal("brand-evaluation-snapshot@2"),
  companyName: z.string().min(1),
  industry: z.object({
    catalogId: z.string().min(1),
    catalogVersion: z.string().min(1),
    primary: z.object({ id: z.string().min(1), label: z.string().min(1) }),
    secondary: z.object({ id: z.string().min(1), label: z.string().min(1) }),
    otherProductOrService: z.string().min(1).nullable(),
    recommendationSubject: z.string().min(1),
  }),
  region: z.object({
    sourceReleaseId: z.string().min(1),
    province: z.object({ id: z.string().min(1), label: z.string().min(1) }),
    city: z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      identityKind: z.enum([
        "OFFICIAL_DIVISION",
        "MUNICIPALITY_REPEAT",
        "PROVINCE_DIRECT_GROUP",
      ]),
      officialDivisionId: z.string().min(1).nullable(),
    }),
    terminal: officialRegionSchema.extend({
      officialLevel: z.enum(["COUNTY", "TOWNSHIP"]),
    }),
    officialPath: z.array(officialRegionSchema).min(2).max(3),
  }),
  characteristicOne: z.string().min(1),
  characteristicTwo: z.string().min(1),
});

export const legacyEvaluationBrandSnapshotSchema = z.object({
  companyName: z.string().min(1),
  primaryIndustry: z.string(),
  secondaryIndustry: z.string(),
  characteristicOne: z.string(),
  characteristicTwo: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string(),
});

export type EvaluationBrandSnapshotV2 = z.infer<
  typeof evaluationBrandSnapshotV2Schema
>;
export type LegacyEvaluationBrandSnapshot = z.infer<
  typeof legacyEvaluationBrandSnapshotSchema
>;
export type EvaluationBrandSnapshot =
  EvaluationBrandSnapshotV2 | LegacyEvaluationBrandSnapshot;

export type EvaluationBrandTextContext = {
  companyName: string;
  primaryIndustry: string;
  secondaryIndustry: string;
  recommendationSubject: string;
  characteristicOne: string;
  characteristicTwo: string;
  province: string;
  city: string;
  terminalRegion: string;
};

export function parseEvaluationBrandSnapshot(
  value: unknown,
): EvaluationBrandSnapshot {
  const v2 = evaluationBrandSnapshotV2Schema.safeParse(value);
  if (v2.success) return v2.data;
  return legacyEvaluationBrandSnapshotSchema.parse(value);
}

export function evaluationBrandTextContext(
  snapshot: EvaluationBrandSnapshot,
): EvaluationBrandTextContext {
  if ("schemaVersion" in snapshot) {
    return {
      companyName: snapshot.companyName,
      primaryIndustry: snapshot.industry.primary.label,
      secondaryIndustry: snapshot.industry.secondary.label,
      recommendationSubject: snapshot.industry.recommendationSubject,
      characteristicOne: snapshot.characteristicOne,
      characteristicTwo: snapshot.characteristicTwo,
      province: snapshot.region.province.label,
      city: snapshot.region.city.label,
      terminalRegion: snapshot.region.terminal.label,
    };
  }
  return {
    companyName: snapshot.companyName,
    primaryIndustry: snapshot.primaryIndustry,
    secondaryIndustry: snapshot.secondaryIndustry,
    recommendationSubject:
      snapshot.secondaryIndustry || snapshot.primaryIndustry,
    characteristicOne: snapshot.characteristicOne,
    characteristicTwo: snapshot.characteristicTwo,
    province: snapshot.province,
    city: snapshot.city,
    terminalRegion: snapshot.district,
  };
}

export function publicEvaluationBrandSnapshot(
  snapshot: EvaluationBrandSnapshot,
) {
  const context = evaluationBrandTextContext(snapshot);
  return {
    companyName: context.companyName,
    primaryIndustry: context.primaryIndustry,
    secondaryIndustry: context.secondaryIndustry,
    characteristicOne: context.characteristicOne,
    characteristicTwo: context.characteristicTwo,
    province: context.province,
    city: context.city,
    district: context.terminalRegion,
  };
}
