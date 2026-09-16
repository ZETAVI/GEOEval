import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PointBalanceResponse {
  @ApiProperty({ type: "integer" }) balance!: number;
  @ApiProperty({ type: "integer" }) revision!: number;
}
export class PointCustomerIdentityResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String }) mobile!: string;
  @ApiProperty({ type: String, enum: ["ACTIVE", "INACTIVE"] }) status!:
    "ACTIVE" | "INACTIVE";
}
export class PointAdminBalanceResponse extends PointBalanceResponse {
  @ApiProperty({ type: PointCustomerIdentityResponse })
  customer!: PointCustomerIdentityResponse;
  @ApiProperty({ type: "integer" }) grantedBalance!: number;
  @ApiProperty({ type: "integer" }) fundedBalance!: number;
}
export class PointAdjustmentRequest {
  @ApiProperty({ type: String, format: "uuid" }) idempotencyKey!: string;
  @ApiProperty({ type: "integer", minimum: -2147483647, maximum: 2147483647 })
  amount!: number;
  @ApiProperty({ type: String, minLength: 1, maxLength: 160 }) reason!: string;
  @ApiPropertyOptional({ type: String, maxLength: 320, nullable: true })
  internalNote?: string | null;
  @ApiPropertyOptional({ type: String, maxLength: 160, nullable: true })
  businessReference?: string | null;
}
export class PointChangeResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: "integer" }) sequence!: number;
  @ApiProperty({
    type: String,
    enum: ["ADMIN_ADJUSTMENT", "PUBLISHING_ORDER", "RECHARGE", "ORDER_RETURN"],
  })
  kind!: "ADMIN_ADJUSTMENT" | "PUBLISHING_ORDER" | "RECHARGE" | "ORDER_RETURN";
  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  returnedOrderId?: string | null;
  @ApiProperty({ type: String, format: "uuid", nullable: true })
  publishingOrderId!: string | null;
  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  rechargeOrderId?: string | null;
  @ApiProperty({ type: "integer" }) amount!: number;
  @ApiProperty({ type: "integer" }) balanceAfter!: number;
  @ApiProperty({ type: String }) reason!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
}
export class PointAdminChangeResponse extends PointChangeResponse {
  @ApiProperty({ type: String, format: "uuid" }) accountId!: string;
  @ApiProperty({ type: String, format: "uuid", nullable: true })
  actorAccountId!: string | null;
  @ApiProperty({ type: String, format: "uuid", nullable: true })
  idempotencyKey!: string | null;
  @ApiPropertyOptional({ type: String, enum: ["ACCOUNT", "SYSTEM"] })
  actorKind?: "ACCOUNT" | "SYSTEM";
  @ApiProperty({ type: "integer" }) grantedDelta!: number;
  @ApiProperty({ type: "integer" }) fundedDelta!: number;
  @ApiProperty({ type: String, nullable: true }) internalNote!: string | null;
  @ApiProperty({ type: String, nullable: true }) businessReference!:
    string | null;
}
export class PointHistoryResponse {
  @ApiProperty({ type: [PointChangeResponse] }) items!: PointChangeResponse[];
  @ApiProperty({ type: "integer", nullable: true }) nextBeforeSequence!:
    number | null;
}
export class PointAdminHistoryResponse {
  @ApiProperty({ type: [PointAdminChangeResponse] })
  items!: PointAdminChangeResponse[];
  @ApiProperty({ type: "integer", nullable: true }) nextBeforeSequence!:
    number | null;
}

export class AdminPointRecordResponse extends PointAdminChangeResponse {
  @ApiProperty({ type: String }) accountMobile!: string;
}
export class AdminPointRecordsResponse {
  @ApiProperty({ type: [AdminPointRecordResponse] })
  items!: AdminPointRecordResponse[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
