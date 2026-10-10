import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from "@nestjs/swagger";

export class EvaluationBrandSnapshotResponse {
  @ApiProperty({ type: String })
  companyName!: string;
  @ApiProperty({ type: String })
  primaryIndustry!: string;
  @ApiProperty({ type: String })
  secondaryIndustry!: string;
  @ApiProperty({ type: String })
  characteristicOne!: string;
  @ApiProperty({ type: String })
  characteristicTwo!: string;
  @ApiProperty({ type: String })
  province!: string;
  @ApiProperty({ type: String })
  city!: string;
  @ApiProperty({ type: String })
  district!: string;
}

export class EvaluationQuestionResponse {
  @ApiProperty({ type: String })
  id!: string;
  @ApiProperty({
    type: String,
    enum: [
      "BRAND_DIRECTED",
      "INDUSTRY_RECOMMENDATION",
      "CHARACTERISTIC_ONE",
      "CHARACTERISTIC_TWO",
    ],
  })
  kind!: string;
  @ApiProperty({ type: Number })
  ordinal!: number;
  @ApiProperty({ type: String })
  content!: string;
}

export class EvaluationPlatformResponse {
  @ApiProperty({ type: String })
  key!: string;
  @ApiProperty({ type: String })
  label!: string;
}

export class EvaluationRunResponse {
  @ApiProperty({ type: String })
  id!: string;
  @ApiProperty({ type: String })
  definitionId!: string;
  @ApiProperty({ type: String })
  brandId!: string;
  @ApiProperty({
    type: String,
    enum: ["EVALUATING", "COMPLETED", "PLEASE_RETRY"],
  })
  status!: string;
  @ApiProperty({ type: Number })
  expectedSampleCount!: number;
  @ApiProperty({ type: Number })
  processedSampleCount!: number;
  @ApiProperty({ type: Number })
  validSampleCount!: number;
  @ApiProperty({ type: Number })
  unavailableSampleCount!: number;
  @ApiProperty({
    type: String,
    enum: [
      "ACQUIRING_ANSWERS",
      "ANALYZING_CONTENT",
      "RESOLVING_BRANDS",
      "COMPOSING_REPORT",
      "COMPLETED",
      "ACTION_REQUIRED",
    ],
  })
  phase!: string;
  @ApiProperty({ type: () => [EvaluationPlatformProgressResponse] })
  platformProgress!: EvaluationPlatformProgressResponse[];
  @ApiProperty({ type: String, format: "date-time" })
  startedAt!: Date;
  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class EvaluationPlatformProgressResponse {
  @ApiProperty({ type: String })
  platformKey!: string;
  @ApiProperty({ type: String })
  platformLabel!: string;
  @ApiProperty({ type: Number })
  expectedSampleCount!: number;
  @ApiProperty({ type: Number })
  acquiredSampleCount!: number;
  @ApiProperty({ type: Number })
  analyzedSampleCount!: number;
  @ApiProperty({ type: Number })
  unavailableSampleCount!: number;
}

export class EvaluationDefinitionResponse {
  @ApiProperty({ type: String })
  id!: string;
  @ApiProperty({ type: String })
  brandId!: string;
  @ApiProperty({ type: EvaluationBrandSnapshotResponse })
  brandSnapshot!: EvaluationBrandSnapshotResponse;
  @ApiProperty({ type: [EvaluationQuestionResponse] })
  questions!: EvaluationQuestionResponse[];
  @ApiProperty({ type: [EvaluationPlatformResponse] })
  platforms!: EvaluationPlatformResponse[];
  @ApiPropertyOptional({ type: EvaluationRunResponse, nullable: true })
  run!: EvaluationRunResponse | null;
  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}

export class EvaluationDefinitionPreparationResponse {
  @ApiProperty({
    type: String,
    enum: ["PREPARING", "READY", "PLEASE_RETRY"],
  })
  status!: "PREPARING" | "READY" | "PLEASE_RETRY";
  @ApiProperty({ type: String, nullable: true })
  preparationId!: string | null;
  @ApiProperty({
    type: EvaluationDefinitionResponse,
    nullable: true,
  })
  definition!: EvaluationDefinitionResponse | null;
}

export class CurrentEvaluationDefinitionPreparationResponse {
  @ApiProperty({
    type: EvaluationDefinitionPreparationResponse,
    nullable: true,
  })
  preparation!: EvaluationDefinitionPreparationResponse | null;
}

export class EvaluationTypicalPositionResponse {
  @ApiProperty({ type: String, enum: ["NONE", "SINGLE", "RANGE"] })
  kind!: "NONE" | "SINGLE" | "RANGE";
  @ApiPropertyOptional({ type: Number, nullable: true })
  position?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  first?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  second?: number | null;
}

export class EvaluationEvidenceSummaryResponse {
  @ApiProperty({ type: Number })
  sampleCount!: number;
  @ApiProperty({ type: [String] })
  platforms!: string[];
}

export class EvaluationRecommendationIndexResponse {
  @ApiProperty({ type: Number, minimum: 0, maximum: 5 })
  score!: number;
  @ApiProperty({ type: Number, minimum: 0, maximum: 5 })
  stars!: number;
  @ApiProperty({ type: Number, minimum: 0, maximum: 1 })
  mentionRate!: number;
  @ApiProperty({ type: Number })
  mentionCount!: number;
  @ApiProperty({ type: Number })
  validOpenSampleCount!: number;
}

export class EvaluationCoverageResponse {
  @ApiProperty({ type: Number })
  validSampleCount!: number;
  @ApiProperty({ type: Number })
  totalSampleCount!: number;
  @ApiProperty({ type: Number })
  missingSampleCount!: number;
}

export class EvaluationReportOverviewResponse {
  @ApiProperty({ type: String })
  recommendationAssessment!: string;
  @ApiProperty({ type: String })
  brandPerception!: string;
  @ApiProperty({ type: EvaluationRecommendationIndexResponse })
  recommendationIndex!: EvaluationRecommendationIndexResponse;
  @ApiProperty({ type: EvaluationTypicalPositionResponse })
  typicalPosition!: EvaluationTypicalPositionResponse;
  @ApiProperty({ type: EvaluationCoverageResponse })
  coverage!: EvaluationCoverageResponse;
}

export class EvaluationPlatformReportResponse {
  @ApiProperty({ type: String })
  platformKey!: string;
  @ApiProperty({ type: String })
  platformLabel!: string;
  @ApiProperty({ type: Number })
  validSampleCount!: number;
  @ApiProperty({ type: Number })
  totalSampleCount!: number;
  @ApiProperty({ type: Number })
  validOpenSampleCount!: number;
  @ApiProperty({ type: Number })
  mentionCount!: number;
  @ApiProperty({ type: Number, minimum: 0, maximum: 1 })
  mentionRate!: number;
  @ApiProperty({ type: EvaluationTypicalPositionResponse })
  typicalPosition!: EvaluationTypicalPositionResponse;
}

export class EvaluationThemeResponse {
  @ApiProperty({ type: String })
  themeId!: string;
  @ApiProperty({ type: String })
  label!: string;
  @ApiProperty({ type: String })
  summary!: string;
  @ApiProperty({ type: EvaluationEvidenceSummaryResponse })
  evidence!: EvaluationEvidenceSummaryResponse;
}

export class EvaluationThemesResponse {
  @ApiProperty({ type: [EvaluationThemeResponse] })
  positive!: EvaluationThemeResponse[];
  @ApiProperty({ type: [EvaluationThemeResponse] })
  negative!: EvaluationThemeResponse[];
}

export class EvaluationCompetitorResponse {
  @ApiProperty({ type: String })
  groupId!: string;
  @ApiProperty({ type: String })
  displayName!: string;
  @ApiProperty({ type: Number })
  occurrenceCount!: number;
  @ApiProperty({ type: [String] })
  platforms!: string[];
  @ApiProperty({ type: EvaluationTypicalPositionResponse })
  typicalPosition!: EvaluationTypicalPositionResponse;
}

export class EvaluationDirectionResponse {
  @ApiProperty({ type: String })
  directionId!: string;
  @ApiProperty({ type: String })
  currentProblem!: string;
  @ApiProperty({ type: String })
  recommendedDirection!: string;
  @ApiProperty({ type: String })
  intendedImprovement!: string;
  @ApiProperty({ type: EvaluationEvidenceSummaryResponse })
  evidence!: EvaluationEvidenceSummaryResponse;
}

export class EvaluationReportDocumentResponse {
  @ApiProperty({ type: EvaluationReportOverviewResponse })
  overview!: EvaluationReportOverviewResponse;
  @ApiProperty({ type: [EvaluationPlatformReportResponse] })
  platforms!: EvaluationPlatformReportResponse[];
  @ApiProperty({ type: EvaluationThemesResponse })
  themes!: EvaluationThemesResponse;
  @ApiProperty({ type: [EvaluationCompetitorResponse] })
  competitors!: EvaluationCompetitorResponse[];
  @ApiProperty({ type: [EvaluationDirectionResponse] })
  directions!: EvaluationDirectionResponse[];
  @ApiProperty({ type: [String] })
  limitations!: string[];
}

export class EvaluationHighlightRangeResponse {
  @ApiProperty({ type: Number })
  start!: number;
  @ApiProperty({ type: Number })
  end!: number;
  @ApiProperty({ type: String })
  exactText!: string;
  @ApiProperty({
    type: String,
    enum: ["TARGET", "POSITIVE", "NEGATIVE", "MIXED"],
  })
  kind!: "TARGET" | "POSITIVE" | "NEGATIVE" | "MIXED";
}

export class RichSampleInlineResponse {
  @ApiProperty({ type: String, enum: ["text", "link", "image"] })
  type!: "text" | "link" | "image";
  @ApiPropertyOptional({ type: String }) text?: string;
  @ApiPropertyOptional({ type: [String], enum: ["strong", "emphasis"] })
  marks?: Array<"strong" | "emphasis">;
  @ApiPropertyOptional({ type: String }) href?: string;
  @ApiPropertyOptional({ type: String }) id?: string;
  @ApiPropertyOptional({ type: String }) alt?: string;
}

export class RichSampleListItemResponse {
  @ApiProperty({ type: [RichSampleInlineResponse] })
  inlines!: RichSampleInlineResponse[];
  @ApiPropertyOptional({ type: () => [RichSampleListResponse] })
  children?: RichSampleListResponse[];
}
export class RichSampleListResponse {
  @ApiProperty({ type: Boolean }) ordered!: boolean;
  @ApiProperty({ type: [RichSampleListItemResponse] })
  items!: RichSampleListItemResponse[];
}
export class RichSampleCellResponse {
  @ApiProperty({ type: String }) text!: string;
  @ApiProperty({ type: Boolean }) header!: boolean;
  @ApiPropertyOptional({ type: [RichSampleInlineResponse] })
  inlines?: RichSampleInlineResponse[];
}

@ApiExtraModels(RichSampleCellResponse)
export class RichSampleBlockResponse {
  @ApiProperty({
    type: String,
    enum: ["paragraph", "heading", "quote", "list", "table", "code", "image"],
  })
  type!:
    "paragraph" | "heading" | "quote" | "list" | "table" | "code" | "image";
  @ApiPropertyOptional({ type: String }) text?: string;
  @ApiPropertyOptional({ type: [RichSampleInlineResponse] })
  inlines?: RichSampleInlineResponse[];
  @ApiPropertyOptional({ type: Number }) level?: number;
  @ApiPropertyOptional({ type: Boolean }) ordered?: boolean;
  @ApiPropertyOptional({ type: [RichSampleListItemResponse] })
  items?: RichSampleListItemResponse[];
  @ApiPropertyOptional({
    type: "array",
    items: {
      type: "array",
      items: { $ref: getSchemaPath(RichSampleCellResponse) },
    },
  })
  rows?: RichSampleCellResponse[][];
  @ApiPropertyOptional({ type: String }) id?: string;
  @ApiPropertyOptional({ type: String }) alt?: string;
}
export class RichSampleImageResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) alt!: string;
  @ApiProperty({ type: String, nullable: true }) src!: string | null;
  @ApiPropertyOptional({ type: Number }) width?: number;
  @ApiPropertyOptional({ type: Number }) height?: number;
  @ApiProperty({ type: String, enum: ["content", "thumbnail"] }) role!:
    "content" | "thumbnail";
  @ApiProperty({ type: String, enum: ["remote_url", "unavailable"] })
  availability!: "remote_url" | "unavailable";
}
export class RichSampleAnswerResponse {
  @ApiProperty({ type: Number, enum: [2] }) version!: 2;
  @ApiProperty({ type: [RichSampleBlockResponse] })
  blocks!: RichSampleBlockResponse[];
  @ApiProperty({ type: [RichSampleImageResponse] })
  images!: RichSampleImageResponse[];
}

export class EvaluationReportSampleResponse {
  @ApiProperty({ type: String })
  id!: string;
  @ApiProperty({ type: String })
  platformKey!: string;
  @ApiProperty({ type: String })
  platformLabel!: string;
  @ApiProperty({ type: String, enum: ["INCLUDED", "NOT_INCLUDED"] })
  availability!: "INCLUDED" | "NOT_INCLUDED";
  @ApiProperty({ type: Boolean, nullable: true })
  mentioned!: boolean | null;
  @ApiProperty({ type: Number, nullable: true })
  position!: number | null;
  @ApiProperty({ type: String, nullable: true })
  cardInterpretation!: string | null;
  @ApiProperty({ type: String, nullable: true })
  originalAnswer!: string | null;
  @ApiPropertyOptional({ type: RichSampleAnswerResponse, nullable: true })
  richAnswer?: RichSampleAnswerResponse | null;
  @ApiProperty({ type: Boolean })
  highlightUnavailable!: boolean;
  @ApiProperty({ type: [EvaluationHighlightRangeResponse] })
  highlights!: EvaluationHighlightRangeResponse[];
}

export class EvaluationReportQuestionResponse {
  @ApiProperty({ type: String })
  id!: string;
  @ApiProperty({
    type: String,
    enum: [
      "BRAND_DIRECTED",
      "INDUSTRY_RECOMMENDATION",
      "CHARACTERISTIC_ONE",
      "CHARACTERISTIC_TWO",
    ],
  })
  kind!:
    | "BRAND_DIRECTED"
    | "INDUSTRY_RECOMMENDATION"
    | "CHARACTERISTIC_ONE"
    | "CHARACTERISTIC_TWO";
  @ApiProperty({ type: Number })
  ordinal!: number;
  @ApiProperty({ type: String })
  content!: string;
  @ApiProperty({ type: [EvaluationReportSampleResponse] })
  samples!: EvaluationReportSampleResponse[];
}

export class EvaluationReportResponse {
  @ApiProperty({ type: String })
  id!: string;
  @ApiProperty({ type: String })
  runId!: string;
  @ApiProperty({ type: String })
  definitionId!: string;
  @ApiProperty({ type: String })
  brandId!: string;
  @ApiProperty({ type: EvaluationBrandSnapshotResponse })
  brandSnapshot!: EvaluationBrandSnapshotResponse;
  @ApiProperty({ type: Boolean })
  brandInformationChanged!: boolean;
  @ApiProperty({ type: String, format: "date-time" })
  startedAt!: Date;
  @ApiProperty({ type: String, format: "date-time" })
  acceptedAt!: Date;
  @ApiProperty({ type: EvaluationReportDocumentResponse })
  document!: EvaluationReportDocumentResponse;
  @ApiProperty({ type: [EvaluationReportQuestionResponse] })
  questions!: EvaluationReportQuestionResponse[];
}

export class CurrentEvaluationReportResponse {
  @ApiProperty({ type: EvaluationReportResponse, nullable: true })
  report!: EvaluationReportResponse | null;
}

export class EvaluationReportSummaryResponse {
  @ApiProperty({ type: String })
  id!: string;
  @ApiProperty({ type: String })
  runId!: string;
  @ApiProperty({ type: String })
  brandId!: string;
  @ApiProperty({ type: String })
  brandName!: string;
  @ApiProperty({ type: Boolean })
  brandInformationChanged!: boolean;
  @ApiProperty({ type: String, format: "date-time" })
  startedAt!: Date;
  @ApiProperty({ type: String, format: "date-time" })
  acceptedAt!: Date;
  @ApiProperty({ type: Number, minimum: 0, maximum: 5 })
  recommendationIndex!: number;
  @ApiProperty({ type: Number, minimum: 0, maximum: 1 })
  mentionRate!: number;
  @ApiProperty({ type: Number })
  validSampleCount!: number;
  @ApiProperty({ type: Number })
  totalSampleCount!: number;
}

export class EvaluationReportHistoryResponse {
  @ApiProperty({ type: [EvaluationReportSummaryResponse] })
  items!: EvaluationReportSummaryResponse[];
  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}
