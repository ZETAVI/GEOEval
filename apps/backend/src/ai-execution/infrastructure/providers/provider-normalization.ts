import type { AiProviderEvidence } from "../../domain/ai-attempt.types.js";

export type NormalizedProviderResponse = {
  outputText: string | undefined;
  returnedModel: string | undefined;
  requestId: string | undefined;
  finishReason: string | undefined;
  sourceMetadata: Array<Record<string, unknown>>;
  searchObservation: "TRIGGERED" | "NOT_TRIGGERED" | "UNKNOWN";
  reasoningEvidenceKind: "TEXT" | "SUMMARY" | "TOKEN_COUNT" | "NONE";
  usage: Record<string, unknown> | undefined;
};

export function normalizeProviderResponse(
  body: unknown,
  headers: Record<string, string>,
): NormalizedProviderResponse {
  if (!isRecord(body)) {
    return {
      outputText: undefined,
      returnedModel: undefined,
      requestId: requestIdFromHeaders(headers),
      finishReason: undefined,
      sourceMetadata: [],
      searchObservation: "UNKNOWN",
      reasoningEvidenceKind: "NONE",
      usage: undefined,
    };
  }
  const objects = allRecords(body);
  const sourceMetadata = objects.filter(isSourceRecord);
  const explicitSearchCount = firstNumber([
    pathNumber(body, ["usage", "x_tools", "web_search", "count"]),
    pathNumber(body, ["usage", "tool_usage", "web_search_call"]),
    pathNumber(body, ["usage", "tool_usage", "web_search"]),
    pathNumber(body, ["usage", "web_search_count"]),
  ]);
  const searchCallPresent = objects.some(
    (item) =>
      item.type === "web_search_call" ||
      item.delta_tag === "search_status" ||
      Array.isArray(item.search_results),
  );
  const reasoningText = firstNonEmptyString(objects, ["reasoning_content"]);
  const reasoningSummary = firstNonEmptyString(objects, [
    "reasoning_summary",
    "summary_text",
  ]);
  const reasoningTokens = firstNumber([
    pathNumber(body, [
      "usage",
      "completion_tokens_details",
      "reasoning_tokens",
    ]),
    pathNumber(body, ["usage", "output_tokens_details", "reasoning_tokens"]),
  ]);
  return {
    outputText: extractOutputText(body),
    returnedModel:
      typeof body.model === "string" && body.model ? body.model : undefined,
    requestId:
      (typeof body.id === "string" && body.id ? body.id : undefined) ??
      requestIdFromHeaders(headers),
    finishReason:
      pathString(body, ["choices", 0, "finish_reason"]) ??
      (typeof body.status === "string" ? body.status : undefined),
    sourceMetadata,
    searchObservation:
      searchCallPresent ||
      sourceMetadata.length > 0 ||
      (explicitSearchCount ?? 0) > 0
        ? "TRIGGERED"
        : explicitSearchCount === 0
          ? "NOT_TRIGGERED"
          : "UNKNOWN",
    reasoningEvidenceKind: reasoningText
      ? "TEXT"
      : reasoningSummary
        ? "SUMMARY"
        : (reasoningTokens ?? 0) > 0
          ? "TOKEN_COUNT"
          : "NONE",
    usage: isRecord(body.usage) ? body.usage : undefined,
  };
}

export function providerEvidence(input: {
  providerKey: string;
  serviceClass: string;
  protocol: string;
  sanitizedRequest: Record<string, unknown>;
  responseHeaders: Record<string, string>;
  rawResponse: unknown;
  normalized: NormalizedProviderResponse;
}): AiProviderEvidence {
  return {
    providerKey: input.providerKey,
    serviceClass: input.serviceClass,
    protocol: input.protocol,
    ...(input.normalized.returnedModel
      ? { returnedModel: input.normalized.returnedModel }
      : {}),
    ...(input.normalized.requestId
      ? { requestId: input.normalized.requestId }
      : {}),
    ...(input.normalized.finishReason
      ? { finishReason: input.normalized.finishReason }
      : {}),
    searchObservation: input.normalized.searchObservation,
    reasoningEvidenceKind: input.normalized.reasoningEvidenceKind,
    ...(input.normalized.sourceMetadata.length > 0
      ? { sourceMetadata: input.normalized.sourceMetadata }
      : {}),
    sanitizedRequest: input.sanitizedRequest,
    responseHeaders: input.responseHeaders,
    rawResponse: input.rawResponse,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractOutputText(body: Record<string, unknown>): string | undefined {
  if (typeof body.output_text === "string" && body.output_text) {
    return body.output_text;
  }
  const chat = pathString(body, ["choices", 0, "message", "content"]);
  if (chat) return chat;
  const parts = allRecords(body)
    .filter(
      (item) => item.type === "output_text" && typeof item.text === "string",
    )
    .map((item) => item.text as string);
  return parts.length > 0 ? parts.join("") : undefined;
}

function isSourceRecord(value: Record<string, unknown>): boolean {
  if (typeof value.url !== "string" && typeof value.uri !== "string") {
    return false;
  }
  return (
    value.type === "url_citation" ||
    value.type === "url" ||
    value.type === "source" ||
    "title" in value ||
    "name" in value ||
    "index" in value
  );
}

function allRecords(value: unknown, output: Record<string, unknown>[] = []) {
  if (!isRecord(value) && !Array.isArray(value)) return output;
  if (isRecord(value)) {
    output.push(value);
    for (const item of Object.values(value)) allRecords(item, output);
    return output;
  }
  for (const item of value) allRecords(item, output);
  return output;
}

function firstNonEmptyString(
  objects: Record<string, unknown>[],
  keys: string[],
): string | undefined {
  for (const object of objects) {
    for (const key of keys) {
      const value = object[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return undefined;
}

function pathString(
  value: unknown,
  path: Array<string | number>,
): string | undefined {
  const found = pathValue(value, path);
  return typeof found === "string" && found ? found : undefined;
}

function pathNumber(
  value: unknown,
  path: Array<string | number>,
): number | undefined {
  const found = pathValue(value, path);
  return typeof found === "number" && Number.isFinite(found)
    ? found
    : undefined;
}

function pathValue(value: unknown, path: Array<string | number>): unknown {
  let current = value;
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
      continue;
    }
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function firstNumber(values: Array<number | undefined>): number | undefined {
  return values.find((value): value is number => value !== undefined);
}

function requestIdFromHeaders(headers: Record<string, string>) {
  return (
    headers["x-request-id"] ??
    headers["x-tt-logid"] ??
    headers["x-bce-request-id"] ??
    headers["trace-id"]
  );
}
