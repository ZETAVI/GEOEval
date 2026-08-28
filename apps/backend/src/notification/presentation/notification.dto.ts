import { ApiProperty, getSchemaPath } from "@nestjs/swagger";

export class EvaluationReportNotificationTargetResponse {
  @ApiProperty({ type: String, enum: ["EVALUATION_REPORT"] })
  kind!: "EVALUATION_REPORT";
  @ApiProperty({ type: String })
  brandId!: string;
  @ApiProperty({ type: String })
  runId!: string;
  @ApiProperty({ type: String })
  reportId!: string;
}

export class EvaluationRetryNotificationTargetResponse {
  @ApiProperty({ type: String, enum: ["EVALUATION_RETRY"] })
  kind!: "EVALUATION_RETRY";
  @ApiProperty({ type: String })
  brandId!: string;
  @ApiProperty({ type: String })
  runId!: string;
}

export class NotificationResponse {
  @ApiProperty({ type: String })
  id!: string;
  @ApiProperty({
    type: String,
    enum: ["EVALUATION_COMPLETED", "EVALUATION_RETRY_REQUIRED"],
  })
  kind!: "EVALUATION_COMPLETED" | "EVALUATION_RETRY_REQUIRED";
  @ApiProperty({ type: String })
  title!: string;
  @ApiProperty({ type: String })
  summary!: string;
  @ApiProperty({
    type: () => Object,
    oneOf: [
      { $ref: getSchemaPath(EvaluationReportNotificationTargetResponse) },
      { $ref: getSchemaPath(EvaluationRetryNotificationTargetResponse) },
    ],
  })
  target!:
    | EvaluationReportNotificationTargetResponse
    | EvaluationRetryNotificationTargetResponse;
  @ApiProperty({ type: String, format: "date-time" })
  occurredAt!: Date;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  readAt!: Date | null;
}

export class NotificationListResponse {
  @ApiProperty({ type: [NotificationResponse] })
  items!: NotificationResponse[];
  @ApiProperty({ type: Number })
  unreadCount!: number;
  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}

export class NotificationReadAllResponse {
  @ApiProperty({ type: Number })
  unreadCount!: number;
}
