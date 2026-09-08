import { ServiceUnavailableException } from "@nestjs/common";
import type {
  PublicationSource,
  VariantPreparer,
  PreparedVariant,
} from "../domain/publication-item.js";

export class MockVariantPreparer implements VariantPreparer {
  readonly mode: "MOCK" | "UNAVAILABLE";
  constructor(enabled: boolean) {
    this.mode = enabled ? "MOCK" : "UNAVAILABLE";
  }
  async prepare(
    input: PublicationSource & { slot: number },
  ): Promise<PreparedVariant> {
    if (this.mode !== "MOCK")
      throw new ServiceUnavailableException(
        "发布内容生成尚未接入；可使用人工内容",
      );
    // Deterministic placeholder, not a generated-quality or publication claim.
    return {
      mode: "MOCK",
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
    };
  }
}
