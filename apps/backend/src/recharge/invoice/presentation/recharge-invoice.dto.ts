import { ApiProperty } from "@nestjs/swagger";

export class RechargeInvoiceApplicationRequest {
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
  @ApiProperty({ enum: ["INDIVIDUAL", "ENTERPRISE"] }) buyerType!:
    "INDIVIDUAL" | "ENTERPRISE";
  @ApiProperty({ type: String, default: "个人" }) title!: string;
  @ApiProperty({ type: String, required: false }) taxNumber?: string;
  @ApiProperty({ type: String, format: "email" }) email!: string;
  @ApiProperty({ type: Boolean, enum: [true] }) confirmedAccurate!: true;
}

export class RechargeInvoiceResubmissionRequest extends RechargeInvoiceApplicationRequest {
  @ApiProperty({ type: Number, minimum: 1 }) expectedRevision!: number;
}

export class RechargeInvoiceCommandRequest {
  @ApiProperty({
    enum: [
      "CLAIM",
      "REQUEST_CORRECTION",
      "COMPLETE",
      "ASSIGN",
      "RETURN_TO_POOL",
      "TAKE_OVER",
    ],
  })
  action!:
    | "CLAIM"
    | "REQUEST_CORRECTION"
    | "COMPLETE"
    | "ASSIGN"
    | "RETURN_TO_POOL"
    | "TAKE_OVER";
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
  @ApiProperty({ type: Number, minimum: 1 }) expectedRevision!: number;
  @ApiProperty({
    enum: ["NAME_TAX_MISMATCH", "TAX_NUMBER_INVALID", "EMAIL_INVALID", "OTHER"],
    required: false,
  })
  reasonCode?:
    "NAME_TAX_MISMATCH" | "TAX_NUMBER_INVALID" | "EMAIL_INVALID" | "OTHER";
  @ApiProperty({ type: String, required: false }) note?: string;
  @ApiProperty({ type: String, required: false }) invoiceNumber?: string;
  @ApiProperty({ type: String, format: "date", required: false })
  issuedOn?: string;
  @ApiProperty({ type: Boolean, enum: [true], required: false })
  confirmedSent?: true;
  @ApiProperty({ type: String, format: "uuid", required: false })
  assigneeAccountId?: string;
}

export class RechargeInvoiceSubmissionResponse {
  @ApiProperty({ enum: ["INDIVIDUAL", "ENTERPRISE"] }) buyerType!:
    "INDIVIDUAL" | "ENTERPRISE";
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String, nullable: true }) taxNumber!: string | null;
  @ApiProperty({ type: String, format: "email" }) email!: string;
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: String, format: "date-time" }) submittedAt!: string;
}

export class RechargeInvoiceCorrectionResponse {
  @ApiProperty({ type: String }) code!: string;
  @ApiProperty({ type: String }) summary!: string;
  @ApiProperty({ type: String, nullable: true }) note!: string | null;
}

export class RechargeInvoiceIssuedResponse {
  @ApiProperty({ type: String }) invoiceNumber!: string;
  @ApiProperty({ type: String, format: "date" }) issuedOn!: string;
  @ApiProperty({ type: String, format: "date-time" }) confirmedSentAt!: string;
  @ApiProperty({ type: String }) maskedEmail!: string;
}

export class RechargeInvoiceResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: Number }) number!: number;
  @ApiProperty({ type: String, format: "uuid" }) rechargeOrderId!: string;
  @ApiProperty({ type: String }) amountFen!: string;
  @ApiProperty({ enum: ["CNY"] }) currency!: "CNY";
  @ApiProperty({ enum: ["PROCESSING", "NEEDS_CORRECTION", "ISSUED"] })
  status!: "PROCESSING" | "NEEDS_CORRECTION" | "ISSUED";
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: RechargeInvoiceSubmissionResponse })
  submission!: RechargeInvoiceSubmissionResponse;
  @ApiProperty({ type: RechargeInvoiceCorrectionResponse, nullable: true })
  correction!: RechargeInvoiceCorrectionResponse | null;
  @ApiProperty({ type: RechargeInvoiceIssuedResponse, nullable: true })
  issued!: RechargeInvoiceIssuedResponse | null;
  @ApiProperty({ type: String, format: "date-time" }) submittedAt!: string;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: string;
}

export class RechargeInvoicePageResponse {
  @ApiProperty({ type: [RechargeInvoiceResponse] })
  items!: RechargeInvoiceResponse[];
  @ApiProperty({ type: Number, nullable: true }) nextCursor!: number | null;
}

export class RechargeInvoiceOrderSummariesResponse {
  @ApiProperty({ type: [RechargeInvoiceResponse] })
  items!: RechargeInvoiceResponse[];
}

export class RechargeInvoiceDefaultResponse {
  @ApiProperty({ type: RechargeInvoiceSubmissionResponse, nullable: true })
  submission!: RechargeInvoiceSubmissionResponse | null;
}

export class RechargeInvoiceAssigneeResponse {
  @ApiProperty({ type: String, format: "uuid" }) accountId!: string;
  @ApiProperty({ type: String }) mobile!: string;
  @ApiProperty({ enum: ["OPERATIONS", "ADMINISTRATOR"] }) role!:
    "OPERATIONS" | "ADMINISTRATOR";
}

export class RechargeInvoiceAuditResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String }) action!: string;
  @ApiProperty({ type: String, format: "uuid" }) actorAccountId!: string;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: string;
}

export class InternalRechargeInvoiceResponse extends RechargeInvoiceResponse {
  @ApiProperty({ type: String, format: "uuid" }) accountId!: string;
  @ApiProperty({ type: String }) customerMobile!: string;
  @ApiProperty({ type: RechargeInvoiceAssigneeResponse, nullable: true })
  assignee!: RechargeInvoiceAssigneeResponse | null;
  @ApiProperty({ type: [RechargeInvoiceAuditResponse], required: false })
  audit?: RechargeInvoiceAuditResponse[];
}

export class InternalRechargeInvoicePageResponse {
  @ApiProperty({ type: [InternalRechargeInvoiceResponse] })
  items!: InternalRechargeInvoiceResponse[];
  @ApiProperty({ type: Number, nullable: true }) nextCursor!: number | null;
}
