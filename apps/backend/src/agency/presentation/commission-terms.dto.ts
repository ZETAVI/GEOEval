import { ApiProperty } from "@nestjs/swagger";
export class CommissionTermsRequest {
  @ApiProperty({ type: Boolean }) enabled!: boolean;
  @ApiProperty({ type: Number, nullable: true, minimum: 0, maximum: 10000 })
  rateBps!: number | null;
  @ApiProperty({ type: Number, minimum: 0 }) expectedRevision!: number;
  @ApiProperty({ type: String, maxLength: 320 }) reason!: string;
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
}
export class CommissionTermsResponse {
  @ApiProperty({ type: String }) agentAccountId!: string;
  @ApiProperty({ type: Boolean }) enabled!: boolean;
  @ApiProperty({ type: Number, nullable: true }) rateBps!: number | null;
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: String, nullable: true }) updatedAt!: string | null;
}
export class CommissionTermsAuditResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) actorAccountId!: string;
  @ApiProperty({ type: String }) reason!: string;
  @ApiProperty({ type: String }) createdAt!: string;
  @ApiProperty({ type: () => CommissionTermsResponse })
  before!: CommissionTermsResponse;
  @ApiProperty({ type: () => CommissionTermsResponse })
  after!: CommissionTermsResponse;
}
export class CommissionTermsDetailResponse extends CommissionTermsResponse {
  @ApiProperty({ type: () => [CommissionTermsAuditResponse] })
  audits!: CommissionTermsAuditResponse[];
}
