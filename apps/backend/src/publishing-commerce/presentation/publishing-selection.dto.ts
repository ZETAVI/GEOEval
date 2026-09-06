import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import type { PublishingIntent } from "../domain/publishing-selection.js";
import { PublishingPackageScopeResponse } from "./publishing-package.dto.js";

export class RandomPublishingIntent {
  @ApiProperty({ type: String, enum: ["RANDOM"] }) mode!: "RANDOM";
  @ApiProperty({ type: String, format: "uuid" }) packageId!: string;
}
export class PrecisePublishingLine {
  @ApiProperty({ type: String, format: "uuid" }) platformId!: string;
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647 })
  quantity!: number;
}
export class PrecisePublishingIntent {
  @ApiProperty({ type: String, enum: ["PRECISE"] }) mode!: "PRECISE";
  @ApiProperty({ type: [PrecisePublishingLine], minItems: 1, maxItems: 200 })
  lines!: PrecisePublishingLine[];
}
@ApiExtraModels(RandomPublishingIntent, PrecisePublishingIntent)
export class PublishingSelectionContent {
  @ApiProperty({ type: String, format: "uuid" }) articleId!: string;
  @ApiProperty({ type: "integer", minimum: 1 }) articleRevision!: number;
  @ApiProperty({
    type: Object,
    oneOf: [
      { $ref: getSchemaPath(RandomPublishingIntent) },
      { $ref: getSchemaPath(PrecisePublishingIntent) },
    ],
  })
  intent!: PublishingIntent;
}
export class SavePublishingSelectionRequest extends PublishingSelectionContent {
  @ApiProperty({ type: "integer", minimum: 0, maximum: 2147483646 })
  expectedRevision!: number;
}
export class PublishingSelectionResponse extends PublishingSelectionContent {
  @ApiProperty({ type: String, format: "uuid" }) brandId!: string;
  @ApiProperty({ type: "integer" }) revision!: number;
}
export class PublishingArticleResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: "integer" }) revision!: number;
  @ApiProperty({ type: String, enum: ["DRAFT", "CONFIRMED"] }) status!:
    "DRAFT" | "CONFIRMED";
  @ApiProperty({ type: "integer", nullable: true }) confirmedRevision!:
    number | null;
}
export class PublishingBrandResponse {
  @ApiProperty({ type: String, format: "uuid" }) id!: string;
  @ApiProperty({ type: String }) companyName!: string;
}
export class PublishingQuoteLineResponse extends PrecisePublishingLine {
  @ApiProperty({ type: String }) displayName!: string;
  @ApiProperty({ type: "integer", nullable: true }) unitPoints!: number | null;
  @ApiProperty({ type: "integer", nullable: true }) totalPoints!: number | null;
  @ApiProperty({ type: Boolean }) available!: boolean;
}
export class PublishingQuoteResponse {
  @ApiProperty({ type: "integer" }) selectionRevision!: number;
  @ApiProperty({ type: String, format: "uuid" }) articleId!: string;
  @ApiProperty({ type: "integer" }) articleRevision!: number;
  @ApiProperty({ type: String, enum: ["RANDOM", "PRECISE"] }) mode!:
    "RANDOM" | "PRECISE";
  @ApiProperty({ type: String, nullable: true }) packageName!: string | null;
  @ApiProperty({ type: [PublishingPackageScopeResponse] })
  scope!: PublishingPackageScopeResponse[];
  @ApiProperty({ type: [PublishingQuoteLineResponse] })
  lines!: PublishingQuoteLineResponse[];
  @ApiProperty({ type: "integer" }) quantity!: number;
  @ApiProperty({ type: "integer", nullable: true }) totalPoints!: number | null;
  @ApiProperty({ type: "integer", nullable: true }) shortfall!: number | null;
  @ApiProperty({ type: "integer", nullable: true }) suggestedRechargeYuan!:
    number | null;
  @ApiProperty({
    type: [String],
    enum: [
      "ARTICLE_CHANGED",
      "ARTICLE_UNCONFIRMED",
      "OFFER_UNAVAILABLE",
      "TOTAL_OUT_OF_RANGE",
    ],
  })
  problems!: string[];
}
export class PublishingWorkspaceResponse {
  @ApiProperty({ type: PublishingBrandResponse, nullable: true })
  brand!: PublishingBrandResponse | null;
  @ApiProperty({ type: PublishingArticleResponse, nullable: true })
  article!: PublishingArticleResponse | null;
  @ApiProperty({ type: "integer" }) balance!: number;
  @ApiProperty({ type: PublishingSelectionResponse, nullable: true })
  selection!: PublishingSelectionResponse | null;
  @ApiProperty({ type: PublishingQuoteResponse, nullable: true })
  quote!: PublishingQuoteResponse | null;
}
