import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type { EvaluationPlatformPolicy } from "./domain/evaluation.types.js";

type ObjectivityProfileFile = {
  id: string;
  version: string;
  content: string;
};

const objectivityFile = JSON.parse(
  readFileSync(
    new URL(
      "../../geo-intelligence/evaluation-objectivity.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Partial<ObjectivityProfileFile>;

if (
  typeof objectivityFile.id !== "string" ||
  typeof objectivityFile.version !== "string" ||
  typeof objectivityFile.content !== "string" ||
  !objectivityFile.content.trim()
) {
  throw new Error("Invalid production evaluation objectivity profile");
}

export const EVALUATION_OBJECTIVITY_PROFILE = {
  id: objectivityFile.id,
  version: objectivityFile.version,
  content: objectivityFile.content,
  contentHash: createHash("sha256")
    .update(objectivityFile.content)
    .digest("hex"),
};

export const EVALUATION_PLATFORM_POLICY: EvaluationPlatformPolicy[] = [
  {
    key: "deepseek",
    label: "DeepSeek",
    routePolicyId: "evaluation.deepseek",
    model: "deepseek-v4-flash",
    searchMode: "AUTO",
  },
  {
    key: "doubao",
    label: "豆包",
    routePolicyId: "evaluation.doubao",
    model: "doubao-seed-2-0-lite-260428",
    searchMode: "AUTO",
  },
  {
    key: "qwen",
    label: "千问",
    routePolicyId: "evaluation.qwen",
    model: "qwen3.7-flash",
    searchMode: "AUTO",
  },
  {
    key: "ernie",
    label: "文心一言",
    routePolicyId: "evaluation.ernie",
    model: "ernie-4.5-turbo-128k",
    searchMode: "AUTO",
  },
  {
    key: "hunyuan",
    label: "腾讯元宝",
    routePolicyId: "evaluation.hunyuan",
    model: "hy3",
    searchMode: "AUTO",
  },
];
