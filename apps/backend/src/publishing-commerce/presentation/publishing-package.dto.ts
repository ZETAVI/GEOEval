import { ApiProperty } from "@nestjs/swagger";

export class PublishingPackageCreateRequest {
  @ApiProperty({ type: String, maxLength: 120 }) name!: string;
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647 })
  quantity!: number;
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647 })
  pointPrice!: number;
  @ApiProperty({ type: String, enum: ["INACTIVE", "ACTIVE"] }) status!:
    "INACTIVE" | "ACTIVE";
  @ApiProperty({
    type: [String],
    minItems: 1,
    maxItems: 200,
    uniqueItems: true,
  })
  platformIds!: string[];
}
export class PublishingPackageUpdateRequest extends PublishingPackageCreateRequest {
  @ApiProperty({ type: "integer", minimum: 1 }) expectedRevision!: number;
  @ApiProperty({ type: String, minLength: 1, maxLength: 320 }) reason!: string;
}
export class PublishingPackageAdminResponse extends PublishingPackageCreateRequest {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: "integer" }) revision!: number;
}
export class PublishingPackageScopeResponse {
  @ApiProperty({ type: String, format: "uuid" }) platformId!: string;
  @ApiProperty({ type: String }) displayName!: string;
}
export class PublishingPackageCustomerResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: "integer" }) quantity!: number;
  @ApiProperty({ type: "integer" }) pointPrice!: number;
  @ApiProperty({ type: "integer" }) revision!: number;
  @ApiProperty({ type: Boolean }) buyable!: boolean;
  @ApiProperty({ type: [PublishingPackageScopeResponse] })
  scope!: PublishingPackageScopeResponse[];
}
export class PublishingPackageAuditResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String, format: "uuid" }) actorAccountId!: string;
  @ApiProperty({ type: String }) reason!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: PublishingPackageAdminResponse, nullable: true })
  beforeState!: PublishingPackageAdminResponse | null;
  @ApiProperty({ type: PublishingPackageAdminResponse })
  afterState!: PublishingPackageAdminResponse;
}
