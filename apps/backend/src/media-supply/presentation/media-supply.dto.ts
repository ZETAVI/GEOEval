import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const CATEGORIES = [
  "CENTRAL_MEDIA",
  "PORTAL_MEDIA",
  "LOCAL_MEDIA",
  "VERTICAL_MEDIA",
  "CONTENT_PLATFORM",
] as const;

export class MediaReasonRequest {
  @ApiProperty({ type: String, maxLength: 320 })
  reason!: string;
}

export class MediaDeleteOwnerRequest extends MediaReasonRequest {
  @ApiProperty({ type: Number, minimum: 1 })
  expectedRevision!: number;
}

export class MediaPlatformCreateRequest {
  @ApiProperty({ type: String, maxLength: 160 })
  displayName!: string;

  @ApiPropertyOptional({ type: [String], default: [] })
  aliases?: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl?: string | null;

  @ApiPropertyOptional({ enum: ["DOMESTIC", "OVERSEAS"], default: "DOMESTIC" })
  regionScope?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE"], default: "INACTIVE" })
  status?: string;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1 })
  pointPrice?: number | null;

  @ApiProperty({ enum: CATEGORIES, isArray: true })
  categories!: string[];
}

export class MediaPlatformUpdateRequest extends MediaReasonRequest {
  @ApiPropertyOptional({ type: String, maxLength: 160 })
  displayName?: string;

  @ApiPropertyOptional({ type: [String] })
  aliases?: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl?: string | null;

  @ApiPropertyOptional({ enum: ["DOMESTIC", "OVERSEAS"] })
  regionScope?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE"] })
  status?: string;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1 })
  pointPrice?: number | null;

  @ApiPropertyOptional({ enum: CATEGORIES, isArray: true })
  categories?: string[];

  @ApiProperty({ type: Number, minimum: 1 })
  expectedRevision!: number;
}

export class MediaSupplierCreateRequest {
  @ApiProperty({ type: String, maxLength: 160 })
  displayName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactMethod?: string | null;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE"], default: "INACTIVE" })
  status?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes?: string | null;
}

export class MediaSupplierUpdateRequest extends MediaReasonRequest {
  @ApiPropertyOptional({ type: String, maxLength: 160 })
  displayName?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactMethod?: string | null;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE"] })
  status?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes?: string | null;

  @ApiProperty({ type: Number, minimum: 1 })
  expectedRevision!: number;
}

export class MediaResourceCreateRequest {
  @ApiProperty({ type: String, format: "uuid" })
  platformId!: string;

  @ApiProperty({ type: String, format: "uuid" })
  supplierId!: string;

  @ApiProperty({ type: String, maxLength: 240 })
  resourceName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  accountIdentifier?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  accountUrl?: string | null;

  @ApiPropertyOptional({
    enum: ["FIRST_PUBLISH", "REPOST"],
    default: "FIRST_PUBLISH",
  })
  publicationMode?: string;

  @ApiPropertyOptional({
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE",
  })
  status?: string;

  @ApiPropertyOptional({
    enum: ["HIDDEN", "FULL", "MASKED"],
    default: "HIDDEN",
  })
  publicVisibility?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  publicAlias?: string | null;

  @ApiPropertyOptional({ enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" })
  qualityTier?: string;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0 })
  procurementCostYuan?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  caseUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  publicationNotes?: string | null;
}

export class MediaResourceUpdateRequest extends MediaReasonRequest {
  @ApiPropertyOptional({ type: String, format: "uuid" })
  platformId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  supplierId?: string;

  @ApiPropertyOptional({ type: String, maxLength: 240 })
  resourceName?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  accountIdentifier?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  accountUrl?: string | null;

  @ApiPropertyOptional({ enum: ["FIRST_PUBLISH", "REPOST"] })
  publicationMode?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE"] })
  status?: string;

  @ApiPropertyOptional({ enum: ["HIDDEN", "FULL", "MASKED"] })
  publicVisibility?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  publicAlias?: string | null;

  @ApiPropertyOptional({ enum: ["HIGH", "MEDIUM", "LOW"] })
  qualityTier?: string;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0 })
  procurementCostYuan?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  caseUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  publicationNotes?: string | null;

  @ApiProperty({ type: Number, minimum: 1 })
  expectedRevision!: number;
}

export class MediaResourceBatchItemRequest {
  @ApiProperty({ type: String, format: "uuid" })
  resourceId!: string;

  @ApiProperty({ type: Number, minimum: 1 })
  expectedRevision!: number;
}

export class MediaResourceBatchStatusRequest extends MediaReasonRequest {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  status!: string;

  @ApiProperty({ type: [MediaResourceBatchItemRequest], minItems: 1 })
  items!: MediaResourceBatchItemRequest[];
}

export class MediaResourceDeleteRequest extends MediaDeleteOwnerRequest {
  @ApiPropertyOptional({ type: Boolean, default: false })
  deleteUnreferencedSupplier?: boolean;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  expectedSupplierRevision?: number;
}

export class MediaCategoryResponse {
  @ApiProperty({ enum: CATEGORIES })
  id!: string;

  @ApiProperty({ type: String })
  label!: string;
}

export class MediaResourceExampleResponse {
  @ApiProperty({ type: String, format: "uuid" })
  id!: string;

  @ApiProperty({ type: String })
  displayName!: string;

  @ApiProperty({ enum: ["FIRST_PUBLISH", "REPOST"] })
  publicationMode!: string;
}

export class MediaPlatformCustomerResponse {
  @ApiProperty({ type: String, format: "uuid" })
  id!: string;

  @ApiProperty({ type: String })
  displayName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl!: string | null;

  @ApiProperty({ enum: ["DOMESTIC", "OVERSEAS"] })
  regionScope!: string;

  @ApiProperty({ enum: CATEGORIES, isArray: true })
  categories!: string[];

  @ApiProperty({ type: Number, minimum: 1 })
  pointPrice!: number;

  @ApiProperty({ type: Number, minimum: 1 })
  revision!: number;

  @ApiProperty({ type: [MediaResourceExampleResponse] })
  examples!: MediaResourceExampleResponse[];
}

export class MediaPlatformPageResponse {
  @ApiProperty({ type: [MediaPlatformCustomerResponse] })
  items!: MediaPlatformCustomerResponse[];

  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  nextCursor!: string | null;
}

export class MediaCatalogRevisionResponse {
  @ApiProperty({ type: String })
  revision!: string;
}

export class MediaPlatformAdminResponse {
  @ApiProperty({ type: String, format: "uuid" })
  id!: string;

  @ApiProperty({ type: String })
  normalizedName!: string;

  @ApiProperty({ type: String })
  displayName!: string;

  @ApiProperty({ type: [String] })
  aliases!: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl!: string | null;

  @ApiProperty({ enum: ["DOMESTIC", "OVERSEAS"] })
  regionScope!: string;

  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  status!: string;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1 })
  pointPrice!: number | null;

  @ApiProperty({ enum: CATEGORIES, isArray: true })
  categories!: string[];

  @ApiProperty({ type: Number, minimum: 1 })
  revision!: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class MediaSupplierResponse {
  @ApiProperty({ type: String, format: "uuid" })
  id!: string;

  @ApiProperty({ type: String })
  normalizedName!: string;

  @ApiProperty({ type: String })
  displayName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactName!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactMethod!: string | null;

  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  status!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: Number, minimum: 1 })
  revision!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  resourceCount!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  platformCount!: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class MediaSupplierAssociationResponse {
  @ApiProperty({ type: String, format: "uuid" })
  resourceId!: string;

  @ApiProperty({ type: String })
  resourceName!: string;

  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  resourceStatus!: string;

  @ApiProperty({ enum: ["ACTIVE", "MANUAL_INACTIVE", "SUPPLIER_INACTIVE"] })
  effectiveStatus!: string;

  @ApiProperty({ type: Number, minimum: 1 })
  resourceRevision!: number;

  @ApiProperty({ type: String, format: "uuid" })
  platformId!: string;

  @ApiProperty({ type: String })
  platformDisplayName!: string;
}

export class MediaSupplierDetailResponse extends MediaSupplierResponse {
  @ApiProperty({ type: [MediaSupplierAssociationResponse] })
  resources!: MediaSupplierAssociationResponse[];
}

export class MediaResourceAdminResponse {
  @ApiProperty({ type: String, format: "uuid" })
  id!: string;

  @ApiProperty({ type: String, format: "uuid" })
  platformId!: string;

  @ApiProperty({ type: String, format: "uuid" })
  supplierId!: string;

  @ApiProperty({ type: String })
  resourceName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  accountIdentifier!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  accountUrl!: string | null;

  @ApiProperty({ enum: ["FIRST_PUBLISH", "REPOST"] })
  publicationMode!: string;

  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  status!: string;

  @ApiProperty({ enum: ["ACTIVE", "MANUAL_INACTIVE", "SUPPLIER_INACTIVE"] })
  effectiveStatus!: string;

  @ApiProperty({ enum: ["HIDDEN", "FULL", "MASKED"] })
  publicVisibility!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  publicAlias!: string | null;

  @ApiProperty({ enum: ["HIGH", "MEDIUM", "LOW"] })
  qualityTier!: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  procurementCostYuan!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  caseUrl!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  publicationNotes!: string | null;

  @ApiProperty({ type: MediaSupplierResponse })
  supplier!: MediaSupplierResponse;

  @ApiProperty({ type: Number, minimum: 1 })
  revision!: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class MediaResourceDeleteResponse {
  @ApiProperty({ type: String, format: "uuid" })
  resourceId!: string;

  @ApiProperty({ type: String, format: "uuid" })
  supplierId!: string;

  @ApiProperty({ type: Boolean })
  supplierDeleted!: boolean;
}

export class MediaCatalogAuditResponse {
  @ApiProperty({ type: String, format: "uuid" })
  id!: string;

  @ApiProperty({ type: String, format: "uuid" })
  actorAccountId!: string;

  @ApiProperty({ type: String })
  entityType!: string;

  @ApiProperty({ type: String, format: "uuid" })
  entityId!: string;

  @ApiProperty({ type: String })
  action!: string;

  @ApiProperty({ type: String })
  reason!: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  beforeState!: unknown;

  @ApiPropertyOptional({ type: Object, nullable: true })
  afterState!: unknown;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}
