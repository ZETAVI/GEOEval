import { ApiProperty } from "@nestjs/swagger";

export class CreateFoundationRecordRequest {
  @ApiProperty({ type: String, example: "F0 recovery probe" })
  name!: string;
}

export class FoundationEffectResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  businessKey!: string;

  @ApiProperty({ type: String })
  result!: string;
}

export class FoundationRecordResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ enum: ["ACCEPTED", "PROCESSED"] })
  status!: "ACCEPTED" | "PROCESSED";

  @ApiProperty({ type: String })
  correlationId!: string;

  @ApiProperty({ type: () => [FoundationEffectResponse] })
  effects!: FoundationEffectResponse[];
}

export class FoundationBacklogResponse {
  @ApiProperty({ type: Number })
  pending!: number;

  @ApiProperty({ type: Number })
  dispatched!: number;
}
