import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";

import { BrandService } from "../../brand/application/brand.service.js";
import {
  EVALUATION_REPORT_REPOSITORY,
  type EvaluationReportRepository,
} from "../domain/evaluation-report.repository.js";
import type {
  EvaluationReportHistoryCursor,
  EvaluationReportHistoryPage,
  EvaluationReportView,
} from "../domain/evaluation-report.view.js";

const historyCursorSchema = z
  .object({
    acceptedAt: z.string().datetime(),
    id: z.string().uuid(),
  })
  .strict();

@Injectable()
export class EvaluationReportService {
  constructor(
    @Inject(BrandService) private readonly brands: BrandService,
    @Inject(EVALUATION_REPORT_REPOSITORY)
    private readonly reports: EvaluationReportRepository,
  ) {}

  async current(
    accountId: string,
    brandId: string,
  ): Promise<EvaluationReportView | null> {
    const brand = await this.brands.evaluationReportPurposeView(
      accountId,
      brandId,
    );
    return (
      (await this.reports.findCurrent({
        accountId,
        brandId,
        currentInputFingerprint: brand.inputFingerprint,
      })) ?? null
    );
  }

  async history(
    accountId: string,
    brandId: string,
    rawLimit?: string,
    rawCursor?: string,
  ): Promise<EvaluationReportHistoryPage> {
    const brand = await this.brands.evaluationReportPurposeView(
      accountId,
      brandId,
    );
    const limit = parseLimit(rawLimit);
    const result = await this.reports.findHistory({
      accountId,
      brandId,
      currentInputFingerprint: brand.inputFingerprint,
      limit,
      ...(rawCursor ? { cursor: decodeCursor(rawCursor) } : {}),
    });
    const last = result.items.at(-1);
    return {
      items: result.items,
      nextCursor:
        result.hasMore && last
          ? encodeCursor({ acceptedAt: last.acceptedAt, id: last.id })
          : null,
    };
  }

  async detail(
    accountId: string,
    brandId: string,
    reportId: string,
  ): Promise<EvaluationReportView> {
    const brand = await this.brands.evaluationReportPurposeView(
      accountId,
      brandId,
    );
    const report = await this.reports.findById({
      accountId,
      brandId,
      reportId,
      currentInputFingerprint: brand.inputFingerprint,
    });
    if (!report) throw new NotFoundException("未找到该评测报告");
    return report;
  }
}

function parseLimit(raw?: string): number {
  if (raw === undefined) return 10;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new BadRequestException("历史报告数量需要在 1 到 20 之间");
  }
  return value;
}

function encodeCursor(cursor: EvaluationReportHistoryCursor): string {
  return Buffer.from(
    JSON.stringify({
      acceptedAt: cursor.acceptedAt.toISOString(),
      id: cursor.id,
    }),
    "utf8",
  ).toString("base64url");
}

function decodeCursor(raw: string): EvaluationReportHistoryCursor {
  try {
    const parsed = historyCursorSchema.parse(
      JSON.parse(Buffer.from(raw, "base64url").toString("utf8")),
    );
    return { acceptedAt: new Date(parsed.acceptedAt), id: parsed.id };
  } catch {
    throw new BadRequestException("历史报告翻页位置无效，请重新加载");
  }
}
