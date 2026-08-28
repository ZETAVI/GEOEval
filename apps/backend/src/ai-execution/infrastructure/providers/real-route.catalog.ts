import { readFileSync } from "node:fs";

import { z } from "zod";

import type { ProviderRouteDefinition } from "./provider-route.js";

const routeSchema = z.object({
  routePolicyId: z.string().min(1),
  purpose: z.enum([
    "EVALUATION_ACQUISITION",
    "EVALUATION_INTERPRETATION",
    "OVERALL_SYNTHESIS",
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
});

const catalogSchema = z.object({
  version: z.literal("evaluation-real-routes@1"),
  routes: z.array(routeSchema).min(9),
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
