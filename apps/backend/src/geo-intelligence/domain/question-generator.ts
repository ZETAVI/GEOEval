import { createHash } from "node:crypto";

import type {
  EvaluationBrandSnapshot,
  EvaluationQuestionKind,
} from "./evaluation.types.js";

export const QUESTION_GENERATOR = Symbol("QUESTION_GENERATOR");

export type GeneratedEvaluationQuestion = {
  kind: EvaluationQuestionKind;
  ordinal: number;
  content: string;
};

export interface EvaluationQuestionGenerator {
  readonly identity: { id: string; version: string; contentHash: string };
  generate(
    snapshot: EvaluationBrandSnapshot,
  ): Promise<GeneratedEvaluationQuestion[]>;
}

const templateIdentity = [
  "brand-directed:v1",
  "industry-recommendation:v1",
  "characteristic-one:v1",
  "characteristic-two:v1",
].join("\n");

export class DeterministicEvaluationQuestionGenerator implements EvaluationQuestionGenerator {
  readonly identity = {
    id: "evaluation.question-generation",
    version: "0.1.0",
    contentHash: createHash("sha256").update(templateIdentity).digest("hex"),
  };

  async generate(
    snapshot: EvaluationBrandSnapshot,
  ): Promise<GeneratedEvaluationQuestion[]> {
    const region = [snapshot.province, snapshot.city, snapshot.district]
      .filter(Boolean)
      .join("");
    const industry = snapshot.secondaryIndustry || snapshot.primaryIndustry;
    return [
      {
        kind: "BRAND_DIRECTED",
        ordinal: 1,
        content: `请客观介绍并评价位于${region}、从事${industry}的${snapshot.companyName}，包括主要特点、适合人群，并在有依据时说明局限或不确定信息。`,
      },
      {
        kind: "INDUSTRY_RECOMMENDATION",
        ordinal: 2,
        content: `在${region}，有哪些值得考虑的${industry}品牌或门店？请结合公开信息客观推荐并说明理由。`,
      },
      {
        kind: "CHARACTERISTIC_ONE",
        ordinal: 3,
        content: `在${region}寻找${industry}时，哪些品牌或门店在“${snapshot.characteristicOne}”方面表现突出？请客观比较并说明理由。`,
      },
      {
        kind: "CHARACTERISTIC_TWO",
        ordinal: 4,
        content: `在${region}寻找${industry}时，哪些品牌或门店在“${snapshot.characteristicTwo}”方面值得关注？请客观比较并说明理由。`,
      },
    ];
  }
}
