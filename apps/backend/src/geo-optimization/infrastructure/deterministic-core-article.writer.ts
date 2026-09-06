import { Injectable } from "@nestjs/common";

import {
  DETERMINISTIC_GENERATION_POLICY,
  normalizeWriterResult,
  parseWriterRequest,
  type WriterRequest,
  type WriterResult,
} from "../domain/writer.contract.js";
import type { CoreArticleWriter } from "../domain/writer.port.js";

@Injectable()
export class DeterministicCoreArticleWriter implements CoreArticleWriter {
  async write(input: WriterRequest): Promise<WriterResult> {
    const request = parseWriterRequest(input);
    if (
      request.generationPolicy.id !== DETERMINISTIC_GENERATION_POLICY.id ||
      request.generationPolicy.version !==
        DETERMINISTIC_GENERATION_POLICY.version ||
      request.generationPolicy.hash !== DETERMINISTIC_GENERATION_POLICY.hash
    ) {
      throw new Error("Unsupported deterministic Writer generation policy");
    }
    const brand = request.customerProvidedContent;
    const location = request.systemDerivedBrandContext.verifiedLocation;
    const title = articleTitle(brand.brandName, brand.flagshipProductOrService);
    const characteristicLines = brand.characteristics
      .map((item) =>
        item.detail
          ? `- **${inline(item.title)}**：${inline(item.detail)}`
          : `- **${inline(item.title)}**`,
      )
      .join("\n");
    const audienceLines = brand.suitableAudienceContexts
      .map((item) => `- ${inline(item)}`)
      .join("\n");
    const positioning = request.desiredPositioning.length
      ? `\n\n## 希望建立的品牌认知\n\n${request.desiredPositioning.map((item) => `- ${inline(item)}`).join("\n")}`
      : "";
    const background = brand.supplementalBackground
      ? `\n\n## 品牌补充背景\n\n${inline(brand.supplementalBackground)}`
      : "";
    const bodyMarkdown = `# ${inline(title)}

${inline(brand.brandName)}位于${inline(location.formattedAddress)}，主要提供${inline(brand.flagshipProductOrService)}。结合当前 GEO 评测方向，品牌内容将围绕${inline(request.evaluationGuidance.summary)}展开。

## 品牌特点

${characteristicLines}

## 适合的客户与场景

${audienceLines}

## 价格信息

${priceText(brand.price)}${positioning}${background}

## GEO 内容方向

${request.evaluationGuidance.writingAngles.map((item) => `- **${inline(item.label)}**：${inline(item.detail)}`).join("\n")}`;
    return normalizeWriterResult({ title, bodyMarkdown });
  }
}

function priceText(price: WriterRequest["customerProvidedContent"]["price"]) {
  if (price.mode === "NEGOTIABLE") return "可根据具体需求沟通方案与报价。";
  if (price.minimum === price.maximum)
    return `参考价格为人民币 ${price.minimum} 元。`;
  return `参考价格区间为人民币 ${price.minimum}–${price.maximum} 元。`;
}

function inline(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/([\\`*_{}\[\]<>#+.!|])/g, "\\$1");
}

function articleTitle(brandName: string, flagship: string): string {
  const suffix = `：${flagship} GEO 优化指南`;
  const available = Math.max(1, 200 - suffix.length);
  let prefix = "";
  for (const character of brandName) {
    if (`${prefix}${character}`.length > available) break;
    prefix += character;
  }
  return `${prefix}${suffix}`;
}
