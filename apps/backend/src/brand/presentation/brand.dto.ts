import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BrandLocationChangeRequest {
  @ApiProperty({ type: String, enum: ["REMOVE", "REPLACE"] })
  action!: "REMOVE" | "REPLACE";

  @ApiPropertyOptional({ type: String })
  verificationReceipt?: string;

  @ApiPropertyOptional({ type: String })
  localityCandidateId?: string;
}

export class BrandMutationRequest {
  @ApiPropertyOptional({ type: String, nullable: true })
  companyName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  primaryIndustryId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  secondaryIndustryId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 60 })
  otherProductOrService?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    minLength: 2,
    maxLength: 80,
  })
  flagshipProductOrService?: string | null;

  @ApiPropertyOptional({ type: [String], minItems: 2, maxItems: 6 })
  characteristics?: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  contactName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactMobile?: string | null;

  @ApiPropertyOptional({ type: BrandLocationChangeRequest })
  locationChange?: BrandLocationChangeRequest;
}

export class RegionLabelResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  label!: string;
}

export class CityRegionResponse extends RegionLabelResponse {
  @ApiProperty({
    type: String,
    enum: ["OFFICIAL_DIVISION", "MUNICIPALITY_REPEAT", "PROVINCE_DIRECT_GROUP"],
  })
  identityKind!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  officialDivisionId!: string | null;
}

export class OfficialRegionNodeResponse extends RegionLabelResponse {
  @ApiProperty({ type: String })
  officialCode!: string;

  @ApiProperty({
    type: String,
    enum: ["PROVINCE", "PREFECTURE", "COUNTY", "TOWNSHIP"],
  })
  officialLevel!: string;
}

export class DerivedOfficialRegionResponse {
  @ApiProperty({ type: String })
  sourceReleaseId!: string;

  @ApiProperty({ type: RegionLabelResponse })
  province!: RegionLabelResponse;

  @ApiProperty({ type: CityRegionResponse })
  city!: CityRegionResponse;

  @ApiProperty({ type: OfficialRegionNodeResponse })
  terminal!: OfficialRegionNodeResponse;

  @ApiProperty({ type: [OfficialRegionNodeResponse] })
  officialPath!: OfficialRegionNodeResponse[];
}

export class StoreLocationCoordinateResponse {
  @ApiProperty({ type: Number })
  longitude!: number;

  @ApiProperty({ type: Number })
  latitude!: number;

  @ApiProperty({ type: String, enum: ["GCJ_02"] })
  system!: "GCJ_02";
}

export class QueryLocalityResponse {
  @ApiProperty({
    type: String,
    enum: ["BUSINESS_AREA", "ADDRESS_LOCALITY"],
  })
  kind!: "BUSINESS_AREA" | "ADDRESS_LOCALITY";

  @ApiProperty({ type: String })
  label!: string;
}

export class StoreLocationPreviewResponse {
  @ApiProperty({ type: String })
  placeName!: string;

  @ApiProperty({ type: String })
  formattedAddress!: string;

  @ApiProperty({ type: StoreLocationCoordinateResponse })
  coordinate!: StoreLocationCoordinateResponse;

  @ApiProperty({ type: DerivedOfficialRegionResponse })
  officialRegion!: DerivedOfficialRegionResponse;
}

export class BrandStoreLocationResponse extends StoreLocationPreviewResponse {
  @ApiProperty({ type: QueryLocalityResponse })
  queryLocality!: QueryLocalityResponse;

  @ApiProperty({ type: String, format: "date-time" })
  verifiedAt!: Date;
}

export class BrandResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, enum: ["ACTIVE", "ARCHIVED"] })
  status!: string;

  @ApiProperty({ type: String })
  companyName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  primaryIndustryId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  secondaryIndustryId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  otherProductOrService!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  flagshipProductOrService!: string | null;

  @ApiProperty({ type: [String] })
  characteristics!: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  contactName!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactMobile!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  primaryIndustryLabel!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  secondaryIndustryLabel!: string | null;

  @ApiPropertyOptional({ type: BrandStoreLocationResponse, nullable: true })
  storeLocation!: BrandStoreLocationResponse | null;

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

export class StoreLocationVerificationRequest {
  @ApiPropertyOptional({ type: String })
  brandId?: string;

  @ApiProperty({ type: String, minLength: 2, maxLength: 200 })
  searchInput!: string;

  @ApiProperty({ type: String, maxLength: 120 })
  providerPlaceId!: string;
}

export class StoreLocationCandidateResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, enum: ["BUSINESS_AREA", "ADDRESS_LOCALITY"] })
  kind!: string;

  @ApiProperty({ type: String })
  label!: string;
}

export class StoreLocationVerificationResponse {
  @ApiProperty({ type: String })
  targetBrandId!: string;

  @ApiProperty({ type: String })
  verificationReceipt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  expiresAt!: Date;

  @ApiProperty({ type: StoreLocationPreviewResponse })
  locationPreview!: StoreLocationPreviewResponse;

  @ApiProperty({ type: [StoreLocationCandidateResponse] })
  localityCandidates!: StoreLocationCandidateResponse[];
}
