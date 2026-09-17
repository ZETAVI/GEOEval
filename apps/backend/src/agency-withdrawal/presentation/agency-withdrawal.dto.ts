import { ApiProperty } from "@nestjs/swagger";

export class PayoutProfileRequest {
  @ApiProperty({ type: Number, minimum: 0 }) expectedRevision!: number;
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
  @ApiProperty({ enum: ["INDIVIDUAL", "ENTERPRISE"] }) recipientType!:
    "INDIVIDUAL" | "ENTERPRISE";
  @ApiProperty({ type: String }) accountName!: string;
  @ApiProperty({
    type: String,
    description: "Digits; never returned after save",
  })
  accountNumber!: string;
  @ApiProperty({ type: String }) bankName!: string;
  @ApiProperty({ type: String }) openingBranch!: string;
  @ApiProperty({ type: String }) contactMobile!: string;
  @ApiProperty({ enum: ["agency-payout-v1"] })
  consentVersion!: "agency-payout-v1";
  @ApiProperty({ type: Boolean }) sensitiveDataConsent!: true;
}

export class PayoutProfileResponse {
  @ApiProperty({ enum: ["INDIVIDUAL", "ENTERPRISE"] }) recipientType!:
    "INDIVIDUAL" | "ENTERPRISE";
  @ApiProperty({ type: String }) accountName!: string;
  @ApiProperty({ type: String }) maskedAccountNumber!: string;
  @ApiProperty({ type: String }) bankName!: string;
  @ApiProperty({ type: String }) openingBranch!: string;
  @ApiProperty({ type: String }) contactMobile!: string;
  @ApiProperty({ type: String }) consentVersion!: string;
  @ApiProperty({ type: String, format: "date-time" }) consentedAt!: string;
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: string;
}

export class PayoutProfileStateResponse {
  @ApiProperty({ type: PayoutProfileResponse, nullable: true })
  profile!: PayoutProfileResponse | null;
}

export class WithdrawalPolicyRequest {
  @ApiProperty({ type: Number, minimum: 0 }) expectedRevision!: number;
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
  @ApiProperty({ type: String }) minimumFen!: string;
  @ApiProperty({ type: String }) reason!: string;
}

export class WithdrawalPolicyResponse {
  @ApiProperty({ type: String }) minimumFen!: string;
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: string;
}

export class WithdrawalPolicyStateResponse {
  @ApiProperty({ type: WithdrawalPolicyResponse, nullable: true })
  policy!: WithdrawalPolicyResponse | null;
}

export class WithdrawalSubmitRequest {
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
  @ApiProperty({ type: String }) amountFen!: string;
}

export class WithdrawalCommandRequest {
  @ApiProperty({
    enum: ["WITHDRAW", "APPROVE", "REJECT", "COMPLETE", "PAYMENT_FAILED"],
  })
  action!: "WITHDRAW" | "APPROVE" | "REJECT" | "COMPLETE" | "PAYMENT_FAILED";
  @ApiProperty({ type: Number, minimum: 1 }) expectedRevision!: number;
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
  @ApiProperty({ type: String, required: false }) reason?: string;
  @ApiProperty({ type: String, required: false })
  bankTransactionReference?: string;
  @ApiProperty({ type: String, format: "date-time", required: false })
  externalPaidAt?: string;
  @ApiProperty({ type: String, required: false }) note?: string;
}

export class PayoutRevealRequest {
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
  @ApiProperty({ type: String }) reason!: string;
}

export class PayoutRevealResponse {
  @ApiProperty({ type: String, format: "uuid" }) withdrawalId!: string;
  @ApiProperty({ type: String }) accountName!: string;
  @ApiProperty({ type: String }) accountNumber!: string;
  @ApiProperty({ type: String }) bankName!: string;
  @ApiProperty({ type: String }) openingBranch!: string;
}

export class WithdrawalPayoutResponse {
  @ApiProperty({ enum: ["INDIVIDUAL", "ENTERPRISE"] }) recipientType!:
    "INDIVIDUAL" | "ENTERPRISE";
  @ApiProperty({ type: String }) accountName!: string;
  @ApiProperty({ type: String }) maskedAccountNumber!: string;
  @ApiProperty({ type: String }) bankName!: string;
  @ApiProperty({ type: String }) openingBranch!: string;
  @ApiProperty({ type: String }) contactMobile!: string;
}

export class WithdrawalResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: Number }) number!: number;
  @ApiProperty({ type: String, format: "uuid" }) agentId!: string;
  @ApiProperty({ type: String }) amountFen!: string;
  @ApiProperty({
    enum: [
      "PENDING_REVIEW",
      "PAYING",
      "COMPLETED",
      "REJECTED",
      "PAYMENT_FAILED",
      "WITHDRAWN",
    ],
  })
  status!:
    | "PENDING_REVIEW"
    | "PAYING"
    | "COMPLETED"
    | "REJECTED"
    | "PAYMENT_FAILED"
    | "WITHDRAWN";
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: WithdrawalPayoutResponse })
  payout!: WithdrawalPayoutResponse;
  @ApiProperty({ type: String, format: "date-time" }) submittedAt!: string;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  approvedAt!: string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  resolvedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) resultReason!: string | null;
  @ApiProperty({ type: String, nullable: true }) bankTransactionReference!:
    string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  externalPaidAt!: string | null;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: string;
}

export class WithdrawalPageResponse {
  @ApiProperty({ type: [WithdrawalResponse] }) items!: WithdrawalResponse[];
  @ApiProperty({ type: Number, nullable: true }) nextCursor!: number | null;
}

export class WithdrawalSummaryResponse {
  @ApiProperty({ type: String }) bookedFen!: string;
  @ApiProperty({ type: String }) availableFen!: string;
  @ApiProperty({ type: String }) processingFen!: string;
  @ApiProperty({ type: String }) withdrawnFen!: string;
  @ApiProperty({ type: String, nullable: true }) minimumFen!: string | null;
  @ApiProperty({ type: Boolean }) profileConfigured!: boolean;
  @ApiProperty({ type: Boolean }) enabled!: boolean;
}
