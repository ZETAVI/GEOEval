import { ApiProperty } from "@nestjs/swagger";
import { AccountResponse } from "../../identity/presentation/identity.dto.js";
import {
  PublishingOrderResponse,
  PublishingOrderIdentityResponse,
  PurchasedTermsResponse,
} from "../../publishing-commerce/presentation/publishing-order.dto.js";

export class DeliveryAssignmentResponse {
  @ApiProperty({ type: String, format: "uuid" }) orderId!: string;
  @ApiProperty({ type: "integer" }) sequence!: number;
  @ApiProperty({
    type: String,
    enum: ["PENDING_HANDLING", "PUBLISHING", "COMPLETED"],
  })
  status!: "PENDING_HANDLING" | "PUBLISHING" | "COMPLETED";
  @ApiProperty({ type: "integer" }) publishedQuantity!: number;
  @ApiProperty({ type: String, format: "uuid", nullable: true })
  assigneeAccountId!: string | null;
  @ApiProperty({ type: "integer" }) revision!: number;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  startedAt!: Date | null;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
}
export class DeliveryAuditResponse {
  @ApiProperty({ type: "integer" }) revision!: number;
  @ApiProperty({ type: String, format: "uuid" }) actorAccountId!: string;
  @ApiProperty({ type: Object, additionalProperties: true }) request!: object;
  @ApiProperty({ type: String, nullable: true }) previousAssigneeId!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) nextAssigneeId!: string | null;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
}
export class DeliveryDetailResponse extends DeliveryAssignmentResponse {
  @ApiProperty({ type: AccountResponse, nullable: true })
  assignee!: AccountResponse | null;
  @ApiProperty({ type: [DeliveryAuditResponse] })
  history!: DeliveryAuditResponse[];
}
export class OperationalOrderResponse extends PublishingOrderResponse {
  @ApiProperty({ type: DeliveryDetailResponse })
  delivery!: DeliveryDetailResponse;
}
export class OperationalOrderSummary extends PublishingOrderIdentityResponse {
  @ApiProperty({ type: PurchasedTermsResponse })
  agreement!: PurchasedTermsResponse;
  @ApiProperty({ type: DeliveryAssignmentResponse })
  delivery!: DeliveryAssignmentResponse;
}
export class OperationalOrderPage {
  @ApiProperty({ type: [OperationalOrderSummary] })
  items!: OperationalOrderSummary[];
  @ApiProperty({ type: "integer", nullable: true }) nextBeforeSequence!:
    number | null;
}
export class AssignmentRequest {
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483646 })
  expectedRevision!: number;
  @ApiProperty({ type: String, format: "uuid" }) idempotencyKey!: string;
}
export class ReturnAssignmentRequest extends AssignmentRequest {
  @ApiProperty({ type: String, maxLength: 320 }) reason!: string;
}
export class ReassignRequest extends ReturnAssignmentRequest {
  @ApiProperty({ type: String, format: "uuid" }) assigneeAccountId!: string;
}
export class AssignmentResult {
  @ApiProperty({ type: String, format: "uuid" }) orderId!: string;
  @ApiProperty({ type: "integer" }) revision!: number;
}
