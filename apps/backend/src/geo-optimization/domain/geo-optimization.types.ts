import type {
  BrandStoreLocation,
  BrandView,
} from "../../brand/domain/brand.types.js";
import type { EvaluationReportDocument } from "../../geo-intelligence/domain/evaluation-report.document.js";
import type { WriterRequest, WriterResult } from "./writer.contract.js";

export type ArticleGenerationStatus =
  "RUNNING" | "SUCCEEDED" | "FAILED" | "NOT_APPLIED";

export type CoreArticleStatus = "DRAFT" | "CONFIRMED";

export type ArticleGenerationView = {
  id: string;
  accountId: string;
  brandId: string;
  snapshotId: string;
  idempotencyKey: string;
  status: ArticleGenerationStatus;
  attemptCount: number;
  expectedArticleRevision: number | null;
  failure: { code: string; message: string } | null;
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CoreArticleView = {
  id: string;
  accountId: string;
  brandId: string;
  title: string;
  bodyMarkdown: string;
  status: CoreArticleStatus;
  revision: number;
  source: {
    generationId: string;
    snapshotId: string;
    brandRevision: number;
    writingContextFingerprint: string;
    evaluationGuidanceId: string;
  };
  confirmedRevision: number | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ConfirmedCoreArticleReference = {
  accountId: string;
  brandId: string;
  articleId: string;
  revision: number;
};

export type GeoOptimizationBrandView = Pick<
  BrandView,
  | "id"
  | "companyName"
  | "primaryIndustryId"
  | "secondaryIndustryId"
  | "otherProductOrService"
  | "flagshipProductOrService"
  | "characteristics"
  | "articleInformation"
  | "revision"
  | "primaryIndustryLabel"
  | "secondaryIndustryLabel"
  | "readyForEvaluation"
  | "missingFields"
  | "readyForArticleGeneration"
  | "articleInformationMissingFields"
> & {
  storeLocation: Pick<
    BrandStoreLocation,
    | "placeName"
    | "formattedAddress"
    | "coordinate"
    | "officialRegion"
    | "queryLocality"
    | "verifiedAt"
  > | null;
};

export type GeoOptimizationCustomerGuidanceView = {
  guidanceId: string;
  acceptedAt: Date;
  brandInformationChanged: boolean;
  customerDirections: EvaluationReportDocument["directions"];
};

export type GeoOptimizationGenerationView = Pick<
  ArticleGenerationView,
  | "id"
  | "brandId"
  | "status"
  | "attemptCount"
  | "failure"
  | "startedAt"
  | "finishedAt"
  | "createdAt"
  | "updatedAt"
>;

export type GeoOptimizationCoreArticleView = Omit<
  CoreArticleView,
  "accountId" | "source"
>;

export type GeoOptimizationWorkspaceView = {
  brand: GeoOptimizationBrandView | null;
  guidance: GeoOptimizationCustomerGuidanceView | null;
  latestGeneration: GeoOptimizationGenerationView | null;
  article: GeoOptimizationCoreArticleView | null;
  articleFreshness: {
    brandInformationChanged: boolean;
    guidanceChanged: boolean;
  } | null;
};

export type StartGenerationInput = {
  accountId: string;
  brandId: string;
  idempotencyKey: string;
  sourceBrandRevision: number;
  sourceWritingContextFingerprint: string;
  evaluationGuidanceId: string;
  evaluationGuidanceRunId: string;
  expectedArticleRevision: number | null;
  writerRequest: WriterRequest;
};

export type GenerationPreparation =
  | {
      kind: "STARTED";
      generation: ArticleGenerationView;
      writerRequest: WriterRequest;
    }
  | { kind: "EXISTING"; generation: ArticleGenerationView };

export type RetryPreparation =
  | {
      kind: "STARTED";
      generation: ArticleGenerationView;
      writerRequest: WriterRequest;
    }
  | { kind: "EXISTING"; generation: ArticleGenerationView };

export type CompleteGenerationInput = {
  accountId: string;
  brandId: string;
  generationId: string;
  result: WriterResult;
};

export type FailGenerationInput = {
  accountId: string;
  brandId: string;
  generationId: string;
  failureCode: string;
  failureMessage: string;
};

export type SaveCoreArticleInput = {
  accountId: string;
  brandId: string;
  articleId: string;
  expectedRevision: number;
  title: string;
  bodyMarkdown: string;
};

export type ConfirmCoreArticleInput = {
  accountId: string;
  brandId: string;
  articleId: string;
  expectedRevision: number;
};
