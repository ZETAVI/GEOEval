import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { BrandService } from "../../brand/application/brand.service.js";
import {
  EVALUATION_REPOSITORY,
  type EvaluationRepository,
} from "../domain/evaluation.repository.js";
import type {
  EvaluationBrandSnapshot,
  EvaluationDefinitionView,
  EvaluationQuestionKind,
  EvaluationRunView,
} from "../domain/evaluation.types.js";
import {
  QUESTION_GENERATOR,
  type EvaluationQuestionGenerator,
} from "../domain/question-generator.js";
import {
  EVALUATION_OBJECTIVITY_PROFILE,
  EVALUATION_PLATFORM_POLICY,
} from "../evaluation-policy.js";

@Injectable()
export class EvaluationService {
  constructor(
    @Inject(BrandService) private readonly brands: BrandService,
    @Inject(EVALUATION_REPOSITORY)
    private readonly repository: EvaluationRepository,
    @Inject(QUESTION_GENERATOR)
    private readonly questionGenerator: EvaluationQuestionGenerator,
  ) {}

  async prepareDefinition(
    accountId: string,
    brandId: string,
  ): Promise<EvaluationDefinitionView> {
    const brand = await this.brands.evaluationPurposeView(accountId, brandId);
    const existing = await this.repository.findDefinition({
      accountId,
      brandId,
      inputFingerprint: brand.inputFingerprint,
    });
    if (existing) return existing;

    const snapshot: EvaluationBrandSnapshot = {
      companyName: brand.companyName,
      primaryIndustry: brand.primaryIndustry,
      secondaryIndustry: brand.secondaryIndustry,
      characteristicOne: brand.characteristicOne,
      characteristicTwo: brand.characteristicTwo,
      province: brand.province,
      city: brand.city,
      district: brand.district,
    };
    const questions = await this.questionGenerator.generate(snapshot);
    assertCompleteQuestionSet(questions);

    return this.repository.createDefinition({
      accountId,
      brandId,
      inputFingerprint: brand.inputFingerprint,
      brandSnapshot: snapshot,
      questionGenerator: this.questionGenerator.identity,
      objectivityProfile: {
        id: EVALUATION_OBJECTIVITY_PROFILE.id,
        version: EVALUATION_OBJECTIVITY_PROFILE.version,
        contentHash: EVALUATION_OBJECTIVITY_PROFILE.contentHash,
        content: EVALUATION_OBJECTIVITY_PROFILE.content,
      },
      platforms: EVALUATION_PLATFORM_POLICY,
      questions,
    });
  }

  async startRun(
    accountId: string,
    definitionId: string,
  ): Promise<EvaluationRunView> {
    const outcome = await this.repository.startRun({
      accountId,
      definitionId,
    });
    if (outcome.kind === "STARTED" || outcome.kind === "DUPLICATE") {
      return outcome.run;
    }
    if (outcome.kind === "NOT_FOUND") {
      throw new NotFoundException("未找到该评测问题集");
    }
    if (outcome.kind === "STALE") {
      throw new ConflictException("品牌资料已经变化，请重新生成评测问题");
    }
    if (outcome.kind === "ACTIVE_OTHER") {
      throw new ConflictException("该品牌正在评测中，请查看当前进度");
    }
    throw new ConflictException(
      "当前资料已经发起过正式评测，请查看该评测或按提示重试",
    );
  }

  async retryRun(accountId: string, runId: string): Promise<EvaluationRunView> {
    const outcome = await this.repository.retryRun({ accountId, runId });
    if (outcome.kind === "STARTED" || outcome.kind === "DUPLICATE") {
      return outcome.run;
    }
    if (outcome.kind === "NOT_FOUND") {
      throw new NotFoundException("未找到该评测");
    }
    throw new ConflictException("当前评测不需要重试，请查看最新状态");
  }
}

function assertCompleteQuestionSet(
  questions: Array<{ kind: EvaluationQuestionKind; ordinal: number }>,
): void {
  const expected: EvaluationQuestionKind[] = [
    "BRAND_DIRECTED",
    "INDUSTRY_RECOMMENDATION",
    "CHARACTERISTIC_ONE",
    "CHARACTERISTIC_TWO",
  ];
  const actual = [...questions]
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((question) => question.kind);
  if (
    actual.length !== expected.length ||
    actual.some((kind, index) => kind !== expected[index])
  ) {
    throw new Error("Question generator returned an invalid evaluation set");
  }
}
