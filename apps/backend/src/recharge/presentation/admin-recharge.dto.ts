import { ApiProperty } from "@nestjs/swagger";
import { RechargeSummaryResponse } from "./customer-recharge.dto.js";
export class AdminRechargeSummaryResponse extends RechargeSummaryResponse {
  @ApiProperty({ type: String, format: "uuid" }) accountId!: string;
  @ApiProperty({ type: String }) accountMobile!: string;
}
export class AdminRechargePageResponse {
  @ApiProperty({ type: [AdminRechargeSummaryResponse] })
  items!: AdminRechargeSummaryResponse[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class AdminRechargeDetailResponse extends AdminRechargeSummaryResponse {
  @ApiProperty({ type: String }) merchantOrderNo!: string;
  @ApiProperty({ type: String, nullable: true }) providerTransactionId!:
    string | null;
  @ApiProperty({ type: String, format: "uuid", nullable: true }) ledgerId!:
    string | null;
  @ApiProperty({ type: "integer", nullable: true }) creditedPoints!:
    number | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  creditedAt!: string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  lastQueriedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) diagnostic!: string | null;
  @ApiProperty({ type: String, enum: ["PENDING", "DELIVERED"], nullable: true })
  notificationState!: "PENDING" | "DELIVERED" | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  notificationDeliveredAt!: string | null;
}
