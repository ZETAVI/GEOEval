import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IndustrySecondaryOptionResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  label!: string;

  @ApiProperty({ type: Boolean })
  isOther!: boolean;
}

export class IndustryPrimaryOptionResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  label!: string;

  @ApiProperty({ type: [IndustrySecondaryOptionResponse] })
  secondaryIndustries!: IndustrySecondaryOptionResponse[];
}

export class IndustryCatalogResponse {
  @ApiProperty({ type: String })
  catalogId!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiProperty({ type: String })
  contentHash!: string;

  @ApiProperty({ type: [IndustryPrimaryOptionResponse] })
  primaryIndustries!: IndustryPrimaryOptionResponse[];
}

export class RegionOptionResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  label!: string;
}

export class CityRegionOptionResponse extends RegionOptionResponse {
  @ApiProperty({
    type: String,
    enum: ["OFFICIAL_DIVISION", "MUNICIPALITY_REPEAT", "PROVINCE_DIRECT_GROUP"],
  })
  identityKind!: string;
}

export class TerminalRegionOptionResponse extends RegionOptionResponse {
  @ApiProperty({ type: String, enum: ["COUNTY", "TOWNSHIP"] })
  officialLevel!: string;
}

export class RegionOptionListResponse {
  @ApiProperty({ type: String })
  sourceReleaseId!: string;

  @ApiProperty({ type: String })
  contentHash!: string;

  @ApiProperty({ type: [RegionOptionResponse] })
  options!: RegionOptionResponse[];
}

export class CityRegionOptionListResponse extends RegionOptionListResponse {
  @ApiProperty({ type: [CityRegionOptionResponse] })
  declare options: CityRegionOptionResponse[];
}

export class TerminalRegionOptionListResponse extends RegionOptionListResponse {
  @ApiProperty({ type: [TerminalRegionOptionResponse] })
  declare options: TerminalRegionOptionResponse[];
}

export class ResolvedIndustrySelectionResponse {
  @ApiProperty({ type: String })
  primaryId!: string;

  @ApiProperty({ type: String })
  primaryLabel!: string;

  @ApiProperty({ type: String })
  secondaryId!: string;

  @ApiProperty({ type: String })
  secondaryLabel!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  otherProductOrService?: string | null;
}

export class ResolvedRegionSelectionResponse {
  @ApiProperty({ type: String })
  provinceId!: string;

  @ApiProperty({ type: String })
  provinceLabel!: string;

  @ApiProperty({ type: String })
  cityId!: string;

  @ApiProperty({ type: String })
  cityLabel!: string;

  @ApiProperty({ type: String })
  terminalId!: string;

  @ApiProperty({ type: String })
  terminalLabel!: string;

  @ApiProperty({ type: String, enum: ["COUNTY", "TOWNSHIP"] })
  terminalOfficialLevel!: string;
}
