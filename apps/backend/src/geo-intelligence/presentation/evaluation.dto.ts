import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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
  @ApiProperty({ type: String, format: "date-time" })
  startedAt!: Date;
  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
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
