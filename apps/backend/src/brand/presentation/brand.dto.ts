import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BrandMutationRequest {
  @ApiPropertyOptional({ type: String, nullable: true })
  companyName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  primaryIndustry?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  secondaryIndustry?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  characteristicOne?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  characteristicTwo?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  province?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  district?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactMobile?: string | null;
}

export class BrandResponse extends BrandMutationRequest {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  accountId!: string;

  @ApiProperty({ type: String, enum: ["ACTIVE", "ARCHIVED"] })
  status!: string;

  @ApiProperty({ type: String })
  companyName!: string;

  @ApiProperty({ type: String })
  evaluationFingerprint!: string;

  @ApiProperty({ type: Boolean })
  readyForEvaluation!: boolean;

  @ApiProperty({ type: [String] })
  missingFields!: string[];

  @ApiProperty({ type: Boolean })
  isCurrent!: boolean;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}
