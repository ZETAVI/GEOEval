import type { GatewayFailureCode } from "../../application/payment-gateway.js";

/** No external message, payload or crypto exception is exposed to callers/loggers. */
export class WechatProtocolError extends Error {
  constructor(
    readonly code: GatewayFailureCode,
    readonly httpStatus?: number,
    readonly providerCode?: string,
  ) {
    super(code);
    this.name = "WechatProtocolError";
  }
}

export function requireProtocol(
  condition: unknown,
  code: GatewayFailureCode = "INVALID_RESPONSE",
): asserts condition {
  if (!condition) throw new WechatProtocolError(code);
}

export function object(value: unknown): Record<string, unknown> {
  requireProtocol(
    value !== null && typeof value === "object" && !Array.isArray(value),
  );
  return value as Record<string, unknown>;
}

export function identifier(value: unknown, max = 32): string {
  requireProtocol(
    typeof value === "string" &&
      value.length > 0 &&
      value.length <= max &&
      /^[A-Za-z0-9_-]+$/.test(value),
  );
  return value;
}

export function fen(value: unknown, allowZero = false): number {
  requireProtocol(
    typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= (allowZero ? 0 : 1),
  );
  return value;
}

export function rfc3339(value: unknown): string {
  requireProtocol(typeof value === "string");
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  requireProtocol(m);
  const year = Number(m[1]),
    month = Number(m[2]),
    day = Number(m[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  requireProtocol(
    month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= days[month - 1]! &&
      Number(m[4]) < 24 &&
      Number(m[5]) < 60 &&
      Number(m[6]) < 60 &&
      Number.isFinite(Date.parse(value)),
  );
  return new Date(value).toISOString();
}

export function parseJson(raw: Buffer): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  } catch {
    throw new WechatProtocolError("INVALID_RESPONSE");
  }
}

export function strictBase64(value: unknown, code: GatewayFailureCode): Buffer {
  requireProtocol(
    typeof value === "string" &&
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        value,
      ),
    code,
  );
  const bytes = Buffer.from(value, "base64");
  requireProtocol(bytes.length > 0 && bytes.toString("base64") === value, code);
  return bytes;
}
