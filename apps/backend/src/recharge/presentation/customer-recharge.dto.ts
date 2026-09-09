import { ApiProperty } from "@nestjs/swagger";
export class RechargeCreateRequest {
  @ApiProperty({ type: "integer", minimum: 1 }) amountYuan!: number;
  @ApiProperty({ type: String, format: "uuid" }) idempotencyKey!: string;
  @ApiProperty({ type: String, enum: ["WECHAT_NATIVE"] })
  method!: "WECHAT_NATIVE";
}
export class RechargeOptionsResponse {
  @ApiProperty({ type: Boolean }) available!: boolean;
  @ApiProperty({ type: Boolean }) controlled!: boolean;
  @ApiProperty({ type: "integer", nullable: true }) minAmountYuan!:
    number | null;
  @ApiProperty({ type: "integer", nullable: true }) maxAmountYuan!:
    number | null;
  @ApiProperty({ type: [Number] }) shortcutAmounts!: number[];
  @ApiProperty({ type: [String], enum: ["WECHAT_NATIVE"] })
  methods!: "WECHAT_NATIVE"[];
  @ApiProperty({ type: "integer" }) pointsPerYuan!: number;
  @ApiProperty({ type: String, nullable: true }) supportMessage!: string | null;
}
export class RechargeSummaryResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: "integer" }) amountYuan!: number;
  @ApiProperty({ type: "integer" }) points!: number;
  @ApiProperty({ type: String, enum: ["WECHAT_NATIVE"] })
  method!: "WECHAT_NATIVE";
  @ApiProperty({
    type: String,
    enum: ["PENDING_PAYMENT", "CONFIRMING", "SUCCESSFUL", "CLOSED"],
  })
  status!: "PENDING_PAYMENT" | "CONFIRMING" | "SUCCESSFUL" | "CLOSED";
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: string;
  @ApiProperty({ type: String, format: "date-time" }) paymentExpiresAt!: string;
  @ApiProperty({ type: String, format: "date-time", nullable: true }) paidAt!:
    string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  closedAt!: string | null;
}
export class RechargeQrResponse {
  @ApiProperty({ type: String }) value!: string;
  @ApiProperty({ type: String, format: "date-time" }) expiresAt!: string;
}
export class RechargeDetailResponse extends RechargeSummaryResponse {
  @ApiProperty({ type: Boolean }) cancelRequested!: boolean;
  @ApiProperty({ type: Boolean }) canVerify!: boolean;
  @ApiProperty({ type: Boolean }) canCancel!: boolean;
  @ApiProperty({ type: Boolean }) supportRequired!: boolean;
  @ApiProperty({ type: RechargeQrResponse, nullable: true })
  qr!: RechargeQrResponse | null;
}
export class RechargeReadResponse {
  @ApiProperty({ type: RechargeDetailResponse }) order!: RechargeDetailResponse;
  @ApiProperty({ type: String, format: "date-time" }) serverTime!: string;
}
export class RechargePageResponse {
  @ApiProperty({ type: [RechargeSummaryResponse] })
  items!: RechargeSummaryResponse[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class RechargeCommandRequest {}
export class RechargeAcceptedResponse {
  @ApiProperty({ type: Boolean, enum: [true] }) accepted!: true;
}
