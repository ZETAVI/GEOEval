import { ApiProperty } from "@nestjs/swagger";

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
