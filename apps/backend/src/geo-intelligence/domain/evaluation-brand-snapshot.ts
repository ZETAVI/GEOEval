import { z } from "zod";

const officialRegionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  officialCode: z.string().min(1),
  officialLevel: z.enum(["PROVINCE", "PREFECTURE", "COUNTY", "TOWNSHIP"]),
});

const derivedRegionSchema = z.object({
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
});

export const evaluationBrandSnapshotV3Schema = z.object({
  schemaVersion: z.literal("brand-evaluation-snapshot@3"),
  companyName: z.string().min(1),
  industry: z.object({
    catalogId: z.string().min(1),
    catalogVersion: z.string().min(1),
    primary: z.object({ id: z.string().min(1), label: z.string().min(1) }),
    secondary: z.object({ id: z.string().min(1), label: z.string().min(1) }),
    otherProductOrService: z.string().min(1).nullable(),
    recommendationSubject: z.string().min(1),
  }),
  region: derivedRegionSchema,
  storeLocation: z.object({
    semanticFactId: z.string().uuid(),
    placeName: z.string().min(1),
    formattedAddress: z.string().min(1),
    coordinate: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      system: z.literal("GCJ_02"),
    }),
    queryLocality: z.object({
      kind: z.enum(["BUSINESS_AREA", "ADDRESS_LOCALITY"]),
      label: z.string().min(1),
    }),
    source: z.object({
      provider: z.literal("AMAP"),
      placeId: z.string().min(1),
      contractVersion: z.string().min(1),
      verifiedAt: z.string().datetime(),
    }),
  }),
  flagshipProductOrService: z.string().min(2).max(80),
  characteristics: z.array(z.string().min(2).max(120)).min(2).max(6),
});

export type EvaluationBrandSnapshotV3 = z.infer<
  typeof evaluationBrandSnapshotV3Schema
>;
export type EvaluationBrandSnapshot = EvaluationBrandSnapshotV3;

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

export type EvaluationBrandQueryContext = {
  companyName: string;
  recommendationSubject: string;
  locality: { kind: "BUSINESS_AREA" | "ADDRESS_LOCALITY"; label: string };
  flagshipProductOrService: string;
  characteristics: string[];
};

export function parseEvaluationBrandSnapshot(
  value: unknown,
): EvaluationBrandSnapshot {
  return evaluationBrandSnapshotV3Schema.parse(value);
}

/**
 * Projection retained for the current Parser, Synthesis, report and pre-#26
 * deterministic question behavior. The characteristics are peers; their
 * canonical sort supplies stable compatibility slots without implying priority.
 */
export function evaluationBrandTextContext(
  snapshot: EvaluationBrandSnapshot,
): EvaluationBrandTextContext {
  return {
    companyName: snapshot.companyName,
    primaryIndustry: snapshot.industry.primary.label,
    secondaryIndustry: snapshot.industry.secondary.label,
    recommendationSubject: snapshot.industry.recommendationSubject,
    characteristicOne: snapshot.characteristics[0]!,
    characteristicTwo: snapshot.characteristics[1]!,
    province: snapshot.region.province.label,
    city: snapshot.region.city.label,
    terminalRegion: snapshot.region.terminal.label,
  };
}

/** Narrow immutable handoff owned by GEO Intelligence for Query Generator #26. */
export function evaluationBrandQueryContext(
  snapshot: EvaluationBrandSnapshot,
): EvaluationBrandQueryContext {
  return {
    companyName: snapshot.companyName,
    recommendationSubject: snapshot.industry.recommendationSubject,
    locality: snapshot.storeLocation.queryLocality,
    flagshipProductOrService: snapshot.flagshipProductOrService,
    characteristics: [...snapshot.characteristics],
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
