import { createHash } from "node:crypto";
import { z } from "zod";

import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import type { AiTelemetryContentMode } from "../infrastructure/ai-execution.config.js";
import { maskTelemetryData } from "../infrastructure/ai-telemetry.mask.js";
import { buildM4SubjectGroundedTask } from "./m4-parser-evidence-first.js";

const minimalContextSchema = z.object({
  companyName: z.string().min(1),
  questionKind: z.enum([
    "INDUSTRY_RECOMMENDATION",
    "CHARACTERISTIC_ONE",
    "CHARACTERISTIC_TWO",
  ]),
  question: z.string().min(1),
  originalAnswer: z.string().min(1),
});

// Experimental input ablation only: keep the frozen P3 instruction and P2
// output contract identical. Runtime Parser input is not changed.
export function buildM4ContextVariants(base: StructuredOutputAttemptInput) {
  const full = buildM4SubjectGroundedTask(base);
  const minimal: StructuredOutputAttemptInput = {
    ...full,
    userContext: minimalContextSchema.parse(full.userContext),
  };
  return { full, minimal };
}

const chatBodySchema = z.object({
  model: z.string().min(1),
  messages: z
    .array(z.object({ role: z.enum(["system", "user"]), content: z.string() }))
    .min(1),
  enable_thinking: z.boolean().optional(),
  reasoning_effort: z.string().optional(),
  response_format: z.object({
    type: z.literal("json_schema"),
    json_schema: z.object({
      name: z.string(),
      strict: z.literal(true),
      schema: z.record(z.string(), z.unknown()),
    }),
  }),
});

// A read-only view of the already constructed Chat Completions body, never a
// second request builder. Unsupported bodies fail only the diagnostic view.
// The experiment caller must isolate that failure from its Provider result.
export function presentM4StructuredRequest(
  sanitizedRequest: unknown,
  contentMode: AiTelemetryContentMode = "metadata-only",
): {
  model: string;
  input?: Array<{ role: "system" | "user"; content: string }>;
  metadata: Record<string, unknown>;
} {
  const { body } = z.object({ body: chatBodySchema }).parse(sanitizedRequest);
  const metadata = {
    displayProjectionVersion: "experiment.m4.structured-request-view@1",
    messageHash: hash(body.messages),
    schemaHash: hash(body.response_format.json_schema.schema),
    schemaName: body.response_format.json_schema.name,
    ...(body.enable_thinking === undefined
      ? {}
      : { enable_thinking: body.enable_thinking }),
    ...(body.reasoning_effort === undefined
      ? {}
      : { reasoning_effort: body.reasoning_effort }),
  };
  if (contentMode !== "local-diagnostic")
    return { model: body.model, metadata };
  return {
    model: body.model,
    // Mask each serialized user message independently: JSON inside content
    // must not bypass the existing protected-key masking.
    input: body.messages.map(({ role, content }) => ({
      role,
      content: maskTelemetryData(content, contentMode) as string,
    })),
    metadata: {
      ...metadata,
      requestSettings: maskTelemetryData(
        { response_format: body.response_format },
        contentMode,
      ),
    },
  };
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
