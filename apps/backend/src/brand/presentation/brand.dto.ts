import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BrandMutationRequest {
  @ApiPropertyOptional({ type: String, nullable: true })
  companyName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  primaryIndustryId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  secondaryIndustryId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 60 })
  otherProductOrService?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  characteristicOne?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  characteristicTwo?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  provinceRegionId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  cityRegionId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  terminalRegionId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactMobile?: string | null;
}

export class BrandResponse extends BrandMutationRequest {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, enum: ["ACTIVE", "ARCHIVED"] })
  status!: string;

  @ApiProperty({ type: String })
  companyName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  primaryIndustryLabel!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  secondaryIndustryLabel!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  provinceRegionLabel!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  cityRegionLabel!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  terminalRegionLabel!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: ["COUNTY", "TOWNSHIP"],
  })
  terminalRegionLevel!: string | null;

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
