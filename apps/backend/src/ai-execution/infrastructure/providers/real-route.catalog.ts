import { readFileSync } from "node:fs";

import { z } from "zod";

import type { ProviderRouteDefinition } from "./provider-route.js";

const routeSchema = z.object({
  routePolicyId: z.string().min(1),
  purpose: z.enum([
    "EVALUATION_ACQUISITION",
    "EVALUATION_INTERPRETATION",
    "EVALUATION_QUESTION_GENERATION",
    "OVERALL_SYNTHESIS",
    "BRAND_NAME_RESOLUTION",
    "REPORT_COMPOSITION",
  ]),
  providerKey: z.enum([
    "tencent-tokenhub",
    "volcengine-ark",
    "alibaba-model-studio",
    "baidu-qianfan",
  ]),
  serviceClass: z.string().min(1),
  protocol: z.enum(["chat-completions", "responses"]),
  requestedModel: z.string().min(1),
  structuredReasoningEffort: z.enum(["low", "medium", "xhigh"]).optional(),
  structuredThinking: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(65_536).optional(),
});

const catalogSchema = z.object({
  version: z.literal("evaluation-real-routes@4"),
  routes: z.array(routeSchema).min(14),
});

const catalog = catalogSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("../../../../ai-execution/real-routes.json", import.meta.url),
      "utf8",
    ),
  ),
);

const ids = new Set(catalog.routes.map((route) => route.routePolicyId));
if (ids.size !== catalog.routes.length) {
  throw new Error("Real AI route catalog contains duplicate route IDs");
}

export const REAL_AI_ROUTE_CATALOG_VERSION = catalog.version;
export const REAL_AI_ROUTES: readonly ProviderRouteDefinition[] =
  catalog.routes;
