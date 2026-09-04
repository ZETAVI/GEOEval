import { randomUUID } from "node:crypto";

import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { BrandService } from "../../brand/application/brand.service.js";
import {
  EVALUATION_QUESTION_PREPARATION_REPOSITORY,
  type EvaluationQuestionPreparationRepository,
} from "../domain/evaluation-question-preparation.repository.js";
import type {
  EvaluationDefinitionPreparationView,
  EvaluationQuestionPreparationView,
} from "../domain/evaluation-question-preparation.types.js";
import {
  EVALUATION_REPOSITORY,
  type EvaluationRepository,
} from "../domain/evaluation.repository.js";
import type {
  EvaluationBrandSnapshot,
  EvaluationRunView,
} from "../domain/evaluation.types.js";
import {
  evaluationQuestionGenerationInstructionSnapshot,
  evaluationQuestionGenerationOutputContractSnapshot,
} from "../evaluation-question-generation.policy.js";

@Injectable()
export class EvaluationService {
  constructor(
    @Inject(BrandService) private readonly brands: BrandService,
    @Inject(EVALUATION_REPOSITORY)
    private readonly repository: EvaluationRepository,
    @Inject(EVALUATION_QUESTION_PREPARATION_REPOSITORY)
    private readonly questionPreparations: EvaluationQuestionPreparationRepository,
  ) {}

  async observeDefinition(
    accountId: string,
    brandId: string,
  ): Promise<EvaluationDefinitionPreparationView | null> {
    const brand = await this.brands.evaluationPurposeView(accountId, brandId);
    const definition = await this.repository.findDefinition({
      accountId,
      brandId,
      inputFingerprint: brand.inputFingerprint,
    });
    if (definition) {
      return { status: "READY", preparationId: null, definition };
    }
    const preparation = await this.questionPreparations.find({
      accountId,
      brandId,
      inputFingerprint: brand.inputFingerprint,
    });
    return preparation
      ? this.preparationView(accountId, brandId, preparation)
      : null;
  }

  async prepareDefinition(
    accountId: string,
    brandId: string,
  ): Promise<EvaluationDefinitionPreparationView> {
    const brand = await this.brands.evaluationPurposeView(accountId, brandId);
    const existing = await this.repository.findDefinition({
      accountId,
      brandId,
      inputFingerprint: brand.inputFingerprint,
    });
    if (existing) {
      return { status: "READY", preparationId: null, definition: existing };
    }

    const snapshot: EvaluationBrandSnapshot = {
      schemaVersion: "brand-evaluation-snapshot@3",
      companyName: brand.companyName,
      industry: brand.industry,
      region: brand.region,
      storeLocation: {
        ...brand.storeLocation,
        source: {
          ...brand.storeLocation.source,
          verifiedAt: brand.storeLocation.source.verifiedAt.toISOString(),
        },
      },
      flagshipProductOrService: brand.flagshipProductOrService,
      characteristics: brand.characteristics,
    };
    const outcome = await this.questionPreparations.ensure({
      accountId,
      brandId,
      inputFingerprint: brand.inputFingerprint,
      brandSnapshot: snapshot,
      instruction: evaluationQuestionGenerationInstructionSnapshot(),
      outputContract: evaluationQuestionGenerationOutputContractSnapshot(),
      correlationId: randomUUID(),
    });
    if (outcome.kind === "DEFINITION_EXISTS") {
      const concurrent = await this.repository.findDefinition({
        accountId,
        brandId,
        inputFingerprint: brand.inputFingerprint,
      });
      if (!concurrent) {
        throw new Error("Existing evaluation definition became unreadable");
      }
      return { status: "READY", preparationId: null, definition: concurrent };
    }
    return this.preparationView(accountId, brandId, outcome.preparation);
  }

  async retryDefinitionPreparation(
    accountId: string,
    preparationId: string,
  ): Promise<EvaluationDefinitionPreparationView> {
    const outcome = await this.questionPreparations.retry({
      accountId,
      preparationId,
    });
    if (outcome.kind === "NOT_FOUND") {
      throw new NotFoundException("未找到该评测问题准备记录");
    }
    if (outcome.kind === "NOT_RETRYABLE") {
      throw new ConflictException("当前评测问题无需重试，请查看最新状态");
    }
    return this.preparationView(
      accountId,
      outcome.preparation.brandId,
      outcome.preparation,
    );
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

  private async preparationView(
    accountId: string,
    brandId: string,
    preparation: EvaluationQuestionPreparationView,
  ): Promise<EvaluationDefinitionPreparationView> {
    if (preparation.status !== "READY") {
      return {
        status: preparation.status,
        preparationId: preparation.id,
        definition: null,
      };
    }
    const definition = await this.repository.findDefinition({
      accountId,
      brandId,
      inputFingerprint: preparation.inputFingerprint,
    });
    if (!definition) {
      throw new Error("Ready question preparation has no accepted definition");
    }
    return {
      status: "READY",
      preparationId: preparation.id,
      definition,
    };
  }
}
