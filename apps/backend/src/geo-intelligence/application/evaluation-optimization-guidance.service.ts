import { Inject, Injectable } from "@nestjs/common";

import { BrandService } from "../../brand/application/brand.service.js";
import type { EvaluationOptimizationGuidanceView } from "../domain/evaluation-optimization-guidance.view.js";
import {
  EVALUATION_REPORT_REPOSITORY,
  type EvaluationReportRepository,
} from "../domain/evaluation-report.repository.js";

@Injectable()
export class EvaluationOptimizationGuidanceService {
  constructor(
    @Inject(BrandService) private readonly brands: BrandService,
    @Inject(EVALUATION_REPORT_REPOSITORY)
    private readonly reports: EvaluationReportRepository,
  ) {}

  async latest(
    accountId: string,
    brandId: string,
  ): Promise<EvaluationOptimizationGuidanceView | null> {
    const brand = await this.brands.evaluationReportPurposeView(
      accountId,
      brandId,
    );
    return (
      (await this.reports.findLatestOptimizationGuidance({
        accountId,
        brandId,
        currentInputFingerprint: brand.inputFingerprint,
      })) ?? null
    );
  }
}
