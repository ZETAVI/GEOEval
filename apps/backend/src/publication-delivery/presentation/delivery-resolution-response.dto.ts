import { ApiProperty } from "@nestjs/swagger";

export class DeliveryResolutionResponse {
  @ApiProperty({
    type: String,
    enum: ["CONTINUE", "TERMINATE"],
    nullable: true,
  })
  mode!: "CONTINUE" | "TERMINATE" | null;
  @ApiProperty({ type: "integer" }) points!: number;
  @ApiProperty({ type: "integer" }) agreementRevision!: number;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty({ type: String, nullable: true }) exceptionReason!:
    string | null;
  @ApiProperty({ type: Boolean }) stopped!: boolean;
  @ApiProperty({ type: "integer", nullable: true }) returnedPoints!:
    number | null;
  @ApiProperty({ type: Boolean }) eligible!: boolean;
}
export class CustomerResolutionResponse {
  @ApiProperty({
    type: String,
    enum: ["CONTINUE", "TERMINATE"],
    nullable: true,
  })
  mode!: "CONTINUE" | "TERMINATE" | null;
  @ApiProperty({ type: "integer" }) agreedPoints!: number;
  @ApiProperty({ type: "integer", nullable: true }) returnedPoints!:
    number | null;
  @ApiProperty({ type: Boolean }) stopped!: boolean;
}
