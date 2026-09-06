import { createHash } from "node:crypto";

import { z } from "zod";

import type { WriterPurposeBrandView } from "../../brand/domain/brand.types.js";
import type { EvaluationOptimizationGuidanceView } from "../../geo-intelligence/domain/evaluation-optimization-guidance.view.js";

export const WRITER_REQUEST_CONTRACT_VERSION =
  "geo-optimization.writer-request@1";

const generationPolicyInstruction =
  "Generate one concise Chinese GEO promotional core article from only the supplied Brand facts and optimization guidance. Do not invent contact details, prices, qualifications, locations, materials, evidence, rankings or guarantees.";

export const DETERMINISTIC_GENERATION_POLICY = {
  id: "geo-optimization.deterministic-core-article",
  version: "1.0.0",
  instruction: generationPolicyInstruction,
  hash: createHash("sha256").update(generationPolicyInstruction).digest("hex"),
} as const;

const text = (maximum: number) => z.string().trim().min(1).max(maximum);

const priceSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("RANGE"),
      minimum: z.number().int().positive(),
      maximum: z.number().int().positive(),
    })
    .strict(),
  z.object({ mode: z.literal("NEGOTIABLE") }).strict(),
]);

export const writerRequestSchema = z
  .object({
    contractVersion: z.literal(WRITER_REQUEST_CONTRACT_VERSION),
    systemDerivedBrandContext: z
      .object({
        industry: z
          .object({
            primary: text(120),
            secondary: text(120),
            recommendationSubject: text(160),
          })
          .strict(),
        verifiedLocation: z
          .object({
            placeName: text(240),
            formattedAddress: text(500),
            officialRegionPath: z.array(text(120)).min(1).max(8),
            queryLocality: z
              .object({
                kind: z.enum(["BUSINESS_AREA", "ADDRESS_LOCALITY"]),
                label: text(240),
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    customerProvidedContent: z
      .object({
        brandName: text(200),
        flagshipProductOrService: text(80),
        characteristics: z
          .array(
            z
              .object({
                title: text(120),
                detail: text(1000).nullable(),
              })
              .strict(),
          )
          .min(2)
          .max(6),
        price: priceSchema,
        suitableAudienceContexts: z.array(text(80)).min(1).max(5),
        supplementalBackground: text(2000).nullable(),
      })
      .strict(),
    desiredPositioning: z.array(text(80)).max(5),
    evaluationGuidance: z
      .object({
        summary: text(2000),
        priorities: z
          .array(z.object({ label: text(100), detail: text(1000) }).strict())
          .min(1)
          .max(8),
        writingAngles: z
          .array(z.object({ label: text(100), detail: text(1000) }).strict())
          .min(1)
          .max(8),
        cautions: z.array(text(500)).max(8),
      })
      .strict(),
    preparedMaterialDigest: z.null(),
    generationPolicy: z
      .object({
        id: text(80),
        version: text(40),
        instruction: text(2000),
        hash: z.string().regex(/^[0-9a-f]{64}$/),
      })
      .strict(),
  })
  .strict();

export type WriterRequest = z.infer<typeof writerRequestSchema>;

export type WriterResult = {
  title: string;
  bodyMarkdown: string;
};

const writerResultSchema = z
  .object({
    title: z.string(),
    bodyMarkdown: z.string(),
  })
  .strict();

export class WriterContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriterContractError";
  }
}

export function buildWriterRequest(
  brand: WriterPurposeBrandView,
  guidance: EvaluationOptimizationGuidanceView,
): WriterRequest {
  return parseWriterRequest({
    contractVersion: WRITER_REQUEST_CONTRACT_VERSION,
    systemDerivedBrandContext: {
      industry: {
        primary: brand.industry.primary.label,
        secondary: brand.industry.secondary.label,
        recommendationSubject: brand.industry.recommendationSubject,
      },
      verifiedLocation: {
        placeName: brand.storeLocation.placeName,
        formattedAddress: brand.storeLocation.formattedAddress,
        officialRegionPath: brand.region.officialPath.map((item) => item.label),
        queryLocality: { ...brand.storeLocation.queryLocality },
      },
    },
    customerProvidedContent: {
      brandName: brand.companyName,
      flagshipProductOrService: brand.flagshipProductOrService,
      characteristics: brand.characteristics.map(({ title, detail }) => ({
        title,
        detail,
      })),
      price: brand.articleInformation.price,
      suitableAudienceContexts: [
        ...brand.articleInformation.suitableAudienceContexts,
      ],
      supplementalBackground: brand.articleInformation.supplementalBackground,
    },
    desiredPositioning: [...brand.articleInformation.desiredPositioning],
    evaluationGuidance: {
      summary: guidance.writerGuidance.summary,
      priorities: guidance.writerGuidance.priorities.map((item) => ({
        ...item,
      })),
      writingAngles: guidance.writerGuidance.writingAngles.map((item) => ({
        ...item,
      })),
      cautions: [...guidance.writerGuidance.cautions],
    },
    preparedMaterialDigest: null,
    generationPolicy: { ...DETERMINISTIC_GENERATION_POLICY },
  });
}

export function parseWriterRequest(input: unknown): WriterRequest {
  const request = writerRequestSchema.parse(input);
  const policyHash = createHash("sha256")
    .update(request.generationPolicy.instruction)
    .digest("hex");
  if (policyHash !== request.generationPolicy.hash) {
    throw new WriterContractError("Writer generation policy hash mismatch");
  }
  return request;
}

export function normalizeWriterResult(input: unknown): WriterResult {
  const parsed = writerResultSchema.safeParse(input);
  if (!parsed.success) {
    throw new WriterContractError("Writer result shape is invalid");
  }
  const title = parsed.data.title.trim().replace(/\s+/g, " ");
  const bodyMarkdown = parsed.data.bodyMarkdown.trim();
  if (!title || title.length > 200) {
    throw new WriterContractError("Writer result title is invalid");
  }
  if (!bodyMarkdown || bodyMarkdown.length > 100_000) {
    throw new WriterContractError("Writer result body is invalid");
  }
  return { title, bodyMarkdown };
}
