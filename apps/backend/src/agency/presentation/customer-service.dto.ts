import { ApiProperty } from "@nestjs/swagger";
import { BrandResponse } from "../../brand/presentation/brand.dto.js";
export class AgencyCustomerContactResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) mobile!: string;
  @ApiProperty({ type: Date }) createdAt!: Date;
}
export class AgencyCustomerListResponse {
  @ApiProperty({ type: () => [AgencyCustomerContactResponse] })
  items!: AgencyCustomerContactResponse[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class AgencyCustomerDetailResponse {
  @ApiProperty({ type: () => AgencyCustomerContactResponse })
  customer!: AgencyCustomerContactResponse;
  @ApiProperty({ type: () => [BrandResponse] }) brands!: BrandResponse[];
}
export class AgencyTransferRequest {
  @ApiProperty({ type: String, nullable: true }) agentAccountId!: string | null;
  @ApiProperty({ type: Number, minimum: 0 }) expectedRevision!: number;
  @ApiProperty({ type: String, maxLength: 300 }) reason!: string;
  @ApiProperty({ type: String, format: "uuid" }) requestId!: string;
}
export class AgencyAttributionResponse {
  @ApiProperty({ type: String }) customerId!: string;
  @ApiProperty({ type: String, nullable: true }) agentAccountId!: string | null;
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: String, nullable: true }) updatedAt!: string | null;
}
export class AgencyTransferResponse extends AgencyAttributionResponse {
  @ApiProperty({ type: String, enum: ["CHANGED", "UNCHANGED", "REPLAYED"] })
  outcome!: "CHANGED" | "UNCHANGED" | "REPLAYED";
}
export class AgencyTransferAuditResponse {
  @ApiProperty({ type: String, nullable: true }) actorMobile!: string | null;
  @ApiProperty({ type: String, nullable: true }) agentMobile!: string | null;
  @ApiProperty({ type: String, nullable: true }) beforeAgentMobile!:
    string | null;
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) actorAccountId!: string;
  @ApiProperty({ type: String, nullable: true }) beforeAgentAccountId!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) agentAccountId!: string | null;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty({ type: Number, nullable: true }) resultRevision!: number | null;
  @ApiProperty({ type: Date }) createdAt!: Date;
}
export class AgencyAdminCustomerResponse extends AgencyAttributionResponse {
  @ApiProperty({ type: String, nullable: true }) agentMobile!: string | null;
  @ApiProperty({ type: () => [AgencyTransferAuditResponse] })
  events!: AgencyTransferAuditResponse[];
}
