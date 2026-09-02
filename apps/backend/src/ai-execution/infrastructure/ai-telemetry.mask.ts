import type { AiTelemetryContentMode } from "./ai-execution.config.js";

const redacted = "[redacted]";

export function maskTelemetryData(
  value: unknown,
  contentMode: AiTelemetryContentMode = "metadata-only",
): unknown {
  try {
    if (typeof value === "string") {
      return maskSerializedTelemetryData(value, contentMode);
    }
    return maskTelemetryValue(value, contentMode);
  } catch {
    return redacted;
  }
}

function maskSerializedTelemetryData(
  value: string,
  contentMode: AiTelemetryContentMode,
): string {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      return JSON.stringify(maskTelemetryValue(parsed, contentMode));
    }
  } catch {
    // Langfuse also invokes the mask for ordinary, non-JSON string attributes.
  }
  return maskInlineSecrets(value);
}

function maskTelemetryValue(
  value: unknown,
  contentMode: AiTelemetryContentMode,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskTelemetryValue(item, contentMode));
  }
  if (typeof value === "string") return maskInlineSecrets(value);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isAlwaysProtectedKey(key) ||
      (contentMode === "metadata-only" && isContentKey(key))
        ? redacted
        : maskTelemetryValue(item, contentMode),
    ]),
  );
}

function isAlwaysProtectedKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return (
    /credential|authorization|apikey|secret|password|cookie/.test(normalized) ||
    /^(access|refresh|id)token$/.test(normalized) ||
    normalized === "bearer" ||
    normalized === "raw" ||
    normalized.startsWith("rawrequest") ||
    normalized.startsWith("rawresponse") ||
    normalized.startsWith("rawenvelope") ||
    normalized === "providerrequest" ||
    normalized === "providerresponse" ||
    normalized === "providerenvelope" ||
    normalized === "sanitizedrequest" ||
    normalized === "reasoningcontent" ||
    normalized === "reasoningtext" ||
    normalized === "reasoningchain" ||
    normalized === "chainofthought" ||
    normalized === "thinkingcontent" ||
    normalized === "thinkingtext"
  );
}

function isContentKey(key: string): boolean {
  return /(input|output|prompt|answer|content|raw)/i.test(key);
}

function maskInlineSecrets(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(
      /\b(authorization|api[_-]?key|secret|password|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^\s,;}]+/gi,
      "$1=[redacted]",
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
