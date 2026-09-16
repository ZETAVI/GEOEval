import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
export class SupportCreateRequest {
  @ApiPropertyOptional({ type: String, format: "uuid" })
  publishingOrderId?: string;
  @ApiProperty({ type: String, maxLength: 100 }) subject!: string;
  @ApiProperty({ type: String, maxLength: 4000 }) message!: string;
  @ApiPropertyOptional({ type: String, format: "uuid" })
  rechargeOrderId?: string;
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
}
export class SupportCommandRequest {
  @ApiProperty({ type: String, enum: ["CLAIM", "REPLY", "RESOLVE", "RELEASE"] })
  action!: string;
  @ApiPropertyOptional({
    type: String,
    maxLength: 4000,
    description: "Required except when claiming",
  })
  message?: string;
  @ApiProperty({ type: Number }) expectedRevision!: number;
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
}
export class SupportReceiptResponse {
  @ApiProperty({ type: String, format: "uuid" }) ticketId!: string;
  @ApiProperty({ type: String, format: "uuid" }) eventId!: string;
  @ApiProperty({ type: Number }) revision!: number;
}
export class SupportSummaryResponse {
  @ApiProperty({ type: String, nullable: true }) publishingOrderId!:
    string | null;
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: Number }) sequence!: number;
  @ApiProperty({ type: String }) subject!: string;
  @ApiProperty({ type: String, enum: ["GENERAL", "RECHARGE", "ORDER"] })
  kind!: string;
  @ApiProperty({ type: String, enum: ["PROCESSING", "RESOLVED"] })
  status!: string;
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: Boolean }) assigned!: boolean;
  @ApiProperty({ type: Boolean }) mine!: boolean;
  @ApiProperty({ type: String }) createdAt!: string;
  @ApiProperty({ type: String }) updatedAt!: string;
}
export class SupportEventResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) action!: string;
  @ApiProperty({ type: String }) author!: string;
  @ApiProperty({ type: String, nullable: true }) message!: string | null;
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: String }) createdAt!: string;
}
export class SupportDetailResponse extends SupportSummaryResponse {
  @ApiProperty({ type: String, nullable: true }) rechargeOrderId!:
    string | null;
  @ApiProperty({ type: [SupportEventResponse] })
  events!: SupportEventResponse[];
  @ApiProperty({ type: Number, nullable: true }) nextAfter!: number | null;
}
export class SupportOrderContextResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: Number }) number!: number;
  @ApiProperty({ type: String, nullable: true }) endedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) appealUntil!: string | null;
  @ApiProperty({ type: String, nullable: true }) openTicketId!: string | null;
  @ApiProperty({ type: Boolean }) canCreate!: boolean;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
}
export class SupportPageResponse {
  @ApiProperty({ type: SupportOrderContextResponse, nullable: true })
  order!: SupportOrderContextResponse | null;
  @ApiProperty({ type: [SupportSummaryResponse] })
  items!: SupportSummaryResponse[];
  @ApiProperty({ type: Number, nullable: true }) nextBefore!: number | null;
}
