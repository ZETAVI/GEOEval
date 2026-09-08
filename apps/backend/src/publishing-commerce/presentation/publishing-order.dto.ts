import { ApiProperty } from "@nestjs/swagger";
import { PublishingPackageScopeResponse } from "./publishing-package.dto.js";

export class PurchasedMediaLineResponse extends PublishingPackageScopeResponse {
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647 })
  quantity!: number;
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647 })
  unitPoints!: number;
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647 })
  totalPoints!: number;
  @ApiProperty({ type: Boolean, enum: [true] }) available!: true;
}
export class PurchasedTermsResponse {
  @ApiProperty({ type: String, enum: ["RANDOM", "PRECISE"] }) mode!:
    "RANDOM" | "PRECISE";
  @ApiProperty({ type: String, nullable: true }) packageName!: string | null;
  @ApiProperty({ type: [PublishingPackageScopeResponse], maxItems: 200 })
  scope!: PublishingPackageScopeResponse[];
  @ApiProperty({ type: [PurchasedMediaLineResponse], maxItems: 200 })
  lines!: PurchasedMediaLineResponse[];
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647 })
  quantity!: number;
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647 })
  totalPoints!: number;
}
export class SubmitPublishingOrderRequest {
  @ApiProperty({ type: String, format: "uuid" }) idempotencyKey!: string;
  @ApiProperty({ type: String, format: "uuid" }) brandId!: string;
  @ApiProperty({ type: String, format: "uuid" }) articleId!: string;
  @ApiProperty({ type: "integer", minimum: 1 }) articleRevision!: number;
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483646 })
  selectionRevision!: number;
  @ApiProperty({ type: PurchasedTermsResponse })
  acceptedTerms!: PurchasedTermsResponse;
}
export class PublishingOrderIdentityResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String }) number!: string;
  @ApiProperty({ type: String, format: "uuid" }) brandId!: string;
  @ApiProperty({ type: String, format: "uuid" }) articleId!: string;
  @ApiProperty({ type: "integer" }) articleRevision!: number;
  @ApiProperty({
    type: String,
    enum: ["PENDING_HANDLING", "PUBLISHING", "COMPLETED"],
  })
  status!: "PENDING_HANDLING" | "PUBLISHING" | "COMPLETED";
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
}
export class PublishingOrderResponse extends PublishingOrderIdentityResponse {
  @ApiProperty({ type: String }) bodyMarkdown!: string;
  @ApiProperty({ type: PurchasedTermsResponse })
  agreement!: PurchasedTermsResponse;
}
export class PublishingOrderSummaryResponse extends PublishingOrderIdentityResponse {
  @ApiProperty({ type: String, enum: ["RANDOM", "PRECISE"] }) mode!:
    "RANDOM" | "PRECISE";
  @ApiProperty({ type: "integer" }) quantity!: number;
  @ApiProperty({ type: "integer" }) totalPoints!: number;
}
export class PublishingOrderPageResponse {
  @ApiProperty({ type: [PublishingOrderSummaryResponse] })
  items!: PublishingOrderSummaryResponse[];
  @ApiProperty({ type: "integer", nullable: true }) nextBeforeNumber!:
    number | null;
}
