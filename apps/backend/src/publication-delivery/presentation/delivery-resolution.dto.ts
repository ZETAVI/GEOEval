import { ApiProperty } from "@nestjs/swagger";
import { AssignmentRequest } from "./delivery-assignment.dto.js";
import { PublicationTargetResponse } from "./publication-work.dto.js";

export class SaveDeliveryResolutionRequest extends AssignmentRequest {
  @ApiProperty({ type: String, required: false, format: "uuid" })
  ticketId?: string;
  @ApiProperty({ type: Number, required: false })
  expectedTicketRevision?: number;
  @ApiProperty({ type: Boolean, required: false, default: false })
  resolveTicket?: boolean;
  @ApiProperty({ enum: ["CONTINUE", "TERMINATE"] }) mode!:
    "CONTINUE" | "TERMINATE";
  @ApiProperty({ type: "integer", minimum: 0, maximum: 2147483647 })
  points!: number;
  @ApiProperty({ type: String, minLength: 1, maxLength: 320 }) reason!: string;
}
export class DeliveryExceptionRequest extends AssignmentRequest {
  @ApiProperty({ type: String, maxLength: 320, nullable: true }) reason!:
    string | null;
}
export class SettleDeliveryReturnRequest {
  @ApiProperty({ type: "integer", minimum: 1 })
  expectedAgreementRevision!: number;
  @ApiProperty({ type: String, format: "uuid" }) idempotencyKey!: string;
}
export class DeliveryReturnReceipt {
  @ApiProperty({ type: String, format: "uuid" }) orderId!: string;
  @ApiProperty({ type: String, format: "uuid" }) ledgerId!: string;
  @ApiProperty({ type: "integer" }) agreementRevision!: number;
  @ApiProperty({ type: "integer" }) points!: number;
}
export class DeliveryReplacementTargetsResponse {
  @ApiProperty({ type: [PublicationTargetResponse] })
  items!: PublicationTargetResponse[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
