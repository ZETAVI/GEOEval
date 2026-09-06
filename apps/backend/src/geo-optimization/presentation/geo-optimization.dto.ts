import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
  BrandArticleInformationRequest,
  BrandCharacteristicResponse,
  BrandStoreLocationResponse,
} from "../../brand/presentation/brand.dto.js";
import { EvaluationDirectionResponse } from "../../geo-intelligence/presentation/evaluation.dto.js";

export class GeoOptimizationBrandResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String }) companyName!: string;
  @ApiProperty({ type: String, nullable: true }) primaryIndustryId!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) secondaryIndustryId!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) otherProductOrService!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) flagshipProductOrService!:
    string | null;
  @ApiProperty({ type: [BrandCharacteristicResponse] })
  characteristics!: BrandCharacteristicResponse[];
  @ApiProperty({ type: BrandArticleInformationRequest })
  articleInformation!: BrandArticleInformationRequest;
  @ApiProperty({ type: Number, minimum: 1 }) revision!: number;
  @ApiProperty({ type: String, nullable: true }) primaryIndustryLabel!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) secondaryIndustryLabel!:
    string | null;
  @ApiProperty({ type: BrandStoreLocationResponse, nullable: true })
  storeLocation!: BrandStoreLocationResponse | null;
  @ApiProperty({ type: Boolean }) readyForEvaluation!: boolean;
  @ApiProperty({ type: [String] }) missingFields!: string[];
  @ApiProperty({ type: Boolean }) readyForArticleGeneration!: boolean;
  @ApiProperty({ type: [String] }) articleInformationMissingFields!: string[];
}

export class GeoOptimizationGuidanceResponse {
  @ApiProperty({ type: String, format: "uuid" }) guidanceId!: string;
  @ApiProperty({ type: String, format: "date-time" }) acceptedAt!: Date;
  @ApiProperty({ type: Boolean }) brandInformationChanged!: boolean;
  @ApiProperty({ type: [EvaluationDirectionResponse] })
  customerDirections!: EvaluationDirectionResponse[];
}

export class GeoOptimizationGenerationFailureResponse {
  @ApiProperty({ type: String }) code!: string;
  @ApiProperty({ type: String }) message!: string;
}

export class GeoOptimizationGenerationResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String, format: "uuid" }) brandId!: string;
  @ApiProperty({ enum: ["RUNNING", "SUCCEEDED", "FAILED", "NOT_APPLIED"] })
  status!: "RUNNING" | "SUCCEEDED" | "FAILED" | "NOT_APPLIED";
  @ApiProperty({ type: Number, minimum: 1 }) attemptCount!: number;
  @ApiProperty({
    type: GeoOptimizationGenerationFailureResponse,
    nullable: true,
  })
  failure!: GeoOptimizationGenerationFailureResponse | null;
  @ApiProperty({ type: String, format: "date-time" }) startedAt!: Date;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  finishedAt!: Date | null;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}

export class GeoOptimizationArticleResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String, format: "uuid" }) brandId!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) bodyMarkdown!: string;
  @ApiProperty({ enum: ["DRAFT", "CONFIRMED"] })
  status!: "DRAFT" | "CONFIRMED";
  @ApiProperty({ type: Number, minimum: 1 }) revision!: number;
  @ApiProperty({ type: Number, nullable: true }) confirmedRevision!:
    number | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  confirmedAt!: Date | null;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}

export class GeoOptimizationFreshnessResponse {
  @ApiProperty({ type: Boolean }) brandInformationChanged!: boolean;
  @ApiProperty({ type: Boolean }) guidanceChanged!: boolean;
}

export class GeoOptimizationWorkspaceResponse {
  @ApiProperty({ type: GeoOptimizationBrandResponse, nullable: true })
  brand!: GeoOptimizationBrandResponse | null;
  @ApiProperty({ type: GeoOptimizationGuidanceResponse, nullable: true })
  guidance!: GeoOptimizationGuidanceResponse | null;
  @ApiProperty({ type: GeoOptimizationGenerationResponse, nullable: true })
  latestGeneration!: GeoOptimizationGenerationResponse | null;
  @ApiProperty({ type: GeoOptimizationArticleResponse, nullable: true })
  article!: GeoOptimizationArticleResponse | null;
  @ApiProperty({ type: GeoOptimizationFreshnessResponse, nullable: true })
  articleFreshness!: GeoOptimizationFreshnessResponse | null;
}

export class GenerateCoreArticleRequest {
  @ApiProperty({ type: String, minLength: 8, maxLength: 120 })
  idempotencyKey!: string;
  @ApiProperty({ type: Number, minimum: 1 }) expectedBrandRevision!: number;
  @ApiPropertyOptional({ type: Number, minimum: 1 })
  expectedArticleRevision?: number;
}

export class SaveCoreArticleRequest {
  @ApiProperty({ type: Number, minimum: 1 }) expectedRevision!: number;
  @ApiProperty({ type: String, minLength: 1, maxLength: 200 }) title!: string;
  @ApiProperty({ type: String, minLength: 1, maxLength: 100000 })
  bodyMarkdown!: string;
}

export class ConfirmCoreArticleRequest {
  @ApiProperty({ type: Number, minimum: 1 }) expectedRevision!: number;
}
