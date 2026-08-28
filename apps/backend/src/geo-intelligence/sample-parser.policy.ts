import { readFileSync } from "node:fs";

import { z } from "zod";

import type { EvaluationQuestionKind } from "./domain/evaluation.types.js";
import {
  SAMPLE_PARSER_CONTRACT_VERSION,
  sampleParserJsonSchema,
} from "./domain/sample-parser.contract.js";

const parserAssetSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    content: z.string().trim().min(1),
  })
  .strict();

export type SampleParserUserContext = {
  companyName: string;
  primaryIndustry: string;
  secondaryIndustry: string;
  region: string;
  characteristicOne: string;
  characteristicTwo: string;
  questionKind: EvaluationQuestionKind;
  question: string;
  originalAnswer: string;
};

const common = loadAsset("common.json");
const brandDirected = loadAsset("brand-directed.json");
const openDiscovery = loadAsset("open-discovery.json");

export function buildSampleParserTask(context: SampleParserUserContext) {
  const profile =
    context.questionKind === "BRAND_DIRECTED" ? brandDirected : openDiscovery;
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction: `${common.content}\n\n${profile.content}`,
    userContext: { ...context },
    outputContract: {
      version: SAMPLE_PARSER_CONTRACT_VERSION,
      jsonSchema: sampleParserJsonSchema as Record<string, unknown>,
    },
  };
}

function loadAsset(fileName: string) {
  const raw = readFileSync(
    new URL(
      `../../geo-intelligence/sample-parser/${fileName}`,
      import.meta.url,
    ),
    "utf8",
  );
  return parserAssetSchema.parse(JSON.parse(raw));
}
