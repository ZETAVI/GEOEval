import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RequestChallengeRequest {
  @ApiProperty({ type: String, example: "13800138000" })
  mobile!: string;
}

export class ChallengeResponse {
  @ApiProperty({ type: String })
  challengeId!: string;

  @ApiProperty({ type: String })
  expiresAt!: string;

  @ApiPropertyOptional({
    type: String,
    description: "Only returned by the local/test adapter",
  })
  developmentCode?: string;
}

export class CompleteSessionRequest extends RequestChallengeRequest {
  @ApiProperty({ type: String })
  challengeId!: string;

  @ApiProperty({ type: String, example: "246810" })
  code!: string;
}

export class AccountResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  mobile!: string;

  @ApiProperty({
    type: String,
    enum: ["TERMINAL_CUSTOMER", "OPERATIONS", "ADMINISTRATOR", "AGENT"],
  })
  role!: string;
}
