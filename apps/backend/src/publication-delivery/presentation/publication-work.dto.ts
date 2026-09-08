import { ApiProperty } from "@nestjs/swagger";
import { AssignmentRequest } from "./delivery-assignment.dto.js";

export class PublicationTargetResponse {
  @ApiProperty({ type: String, format: "uuid" }) platformId!: string;
  @ApiProperty({ type: String }) displayName!: string;
}
export class PreparedVariantResponse {
  @ApiProperty({ type: String, enum: ["MOCK", "MANUAL"] }) mode!:
    "MOCK" | "MANUAL";
  @ApiProperty({ type: String, maxLength: 200 }) title!: string;
  @ApiProperty({ type: String, maxLength: 100000 }) bodyMarkdown!: string;
}
export class PublicPublicationResult extends PublicationTargetResponse {
  @ApiProperty({ type: String, maxLength: 200 }) title!: string;
  @ApiProperty({ type: String, format: "uri" }) url!: string;
  @ApiProperty({ type: String, format: "date-time" }) publishedAt!: string;
}
export class InternalPublicationResult extends PublicPublicationResult {
  @ApiProperty({ type: String, maxLength: 160 }) internalChannel!: string;
  @ApiProperty({ type: String, maxLength: 320 }) internalNote!: string;
}
export class PublicationResultInput {
  @ApiProperty({ type: String, maxLength: 200 }) title!: string;
  @ApiProperty({ type: String, format: "uri", maxLength: 2048 }) url!: string;
  @ApiProperty({ type: String, format: "date-time" }) publishedAt!: string;
  @ApiProperty({ type: String, maxLength: 160, required: false })
  internalChannel?: string;
  @ApiProperty({ type: String, maxLength: 320, required: false })
  internalNote?: string;
}
export class PublicationWorkRequest extends AssignmentRequest {
  @ApiProperty({ type: "integer", minimum: 0, maximum: 2147483646 })
  expectedItemRevision!: number;
  @ApiProperty({ type: String, format: "uuid" }) platformId!: string;
}
export class BeginPublicationRequest extends PublicationWorkRequest {
  @ApiProperty({ type: String, enum: ["BEGIN"] }) action!: "BEGIN";
}
export class PreparePublicationRequest extends PublicationWorkRequest {
  @ApiProperty({ type: String, enum: ["PREPARE_MOCK"] })
  action!: "PREPARE_MOCK";
}
export class SavePublicationDraftRequest extends PublicationWorkRequest {
  @ApiProperty({ type: String, enum: ["SAVE_DRAFT"] }) action!: "SAVE_DRAFT";
  @ApiProperty({ type: String, maxLength: 200 }) title!: string;
  @ApiProperty({ type: String, maxLength: 100000 }) bodyMarkdown!: string;
}
export class RecordPublicationResultRequest extends PublicationWorkRequest {
  @ApiProperty({ type: String, enum: ["RECORD_RESULT"] })
  action!: "RECORD_RESULT";
  @ApiProperty({ type: PublicationResultInput })
  result!: PublicationResultInput;
}
export class CorrectPublicationResultRequest extends PublicationWorkRequest {
  @ApiProperty({ type: String, enum: ["CORRECT_RESULT"] })
  action!: "CORRECT_RESULT";
  @ApiProperty({ type: PublicationResultInput })
  result!: PublicationResultInput;
  @ApiProperty({ type: String, maxLength: 320 }) reason!: string;
}
export class PublicationWorkReceiptResponse {
  @ApiProperty({ type: String, format: "uuid" }) orderId!: string;
  @ApiProperty({ type: "integer" }) slot!: number;
  @ApiProperty({ type: "integer" }) revision!: number;
  @ApiProperty({ type: "integer" }) orderRevision!: number;
}
export class PublicationWorkItemResponse {
  @ApiProperty({ type: "integer" }) slot!: number;
  @ApiProperty({ type: "integer" }) revision!: number;
  @ApiProperty({ type: String, nullable: true }) purchasedPlatformId!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) platformId!: string | null;
  @ApiProperty({ type: String, enum: ["PENDING", "PUBLISHING", "PUBLISHED"] })
  state!: "PENDING" | "PUBLISHING" | "PUBLISHED";
  @ApiProperty({ type: PreparedVariantResponse, nullable: true })
  preparation!: PreparedVariantResponse | null;
  @ApiProperty({ type: InternalPublicationResult, nullable: true })
  result!: InternalPublicationResult | null;
}
export class PublicationProgressResponse {
  @ApiProperty({
    type: String,
    enum: ["PENDING_HANDLING", "PUBLISHING", "COMPLETED"],
  })
  status!: "PENDING_HANDLING" | "PUBLISHING" | "COMPLETED";
  @ApiProperty({ type: "integer" }) quantity!: number;
  @ApiProperty({ type: "integer" }) publishedQuantity!: number;
  @ApiProperty({ type: "integer", nullable: true }) nextAfterSlot!:
    number | null;
}
export class PublicationWorkPageResponse extends PublicationProgressResponse {
  @ApiProperty({ type: "integer" }) orderRevision!: number;
  @ApiProperty({ type: String, enum: ["MOCK", "UNAVAILABLE"] })
  preparationMode!: "MOCK" | "UNAVAILABLE";
  @ApiProperty({ type: [PublicationTargetResponse] })
  targets!: PublicationTargetResponse[];
  @ApiProperty({ type: [PublicationWorkItemResponse] })
  items!: PublicationWorkItemResponse[];
}
export class CustomerPublicationItemResponse {
  @ApiProperty({ type: "integer" }) slot!: number;
  @ApiProperty({ type: String, enum: ["IN_HANDLING", "PUBLISHED"] }) state!:
    "IN_HANDLING" | "PUBLISHED";
  @ApiProperty({ type: String, nullable: true }) targetName!: string | null;
  @ApiProperty({ type: PublicPublicationResult, nullable: true })
  result!: PublicPublicationResult | null;
}
export class CustomerPublicationPageResponse extends PublicationProgressResponse {
  @ApiProperty({ type: String, format: "date-time" })
  expectedCompletionAt!: Date;
  @ApiProperty({ type: Boolean }) delayed!: boolean;
  @ApiProperty({ type: [CustomerPublicationItemResponse] })
  items!: CustomerPublicationItemResponse[];
}
export class PublicationWorkAuditResponse {
  @ApiProperty({ type: "integer" }) revision!: number;
  @ApiProperty({ type: String, format: "uuid" }) actorAccountId!: string;
  @ApiProperty({ type: Object, additionalProperties: true }) request!: object;
  @ApiProperty({ type: Object, additionalProperties: true, nullable: true })
  beforeState!: object | null;
  @ApiProperty({ type: Object, additionalProperties: true })
  afterState!: object;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
}
