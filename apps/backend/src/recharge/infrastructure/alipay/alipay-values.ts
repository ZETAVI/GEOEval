import { createHash } from "node:crypto";

export class AlipayProtocolError extends Error {}
export function requireValue(
  value: unknown,
  code = "INVALID_RESPONSE",
): asserts value {
  if (!value) throw new AlipayProtocolError(code);
}
export function record(value: unknown): Record<string, unknown> {
  requireValue(
    value !== null && typeof value === "object" && !Array.isArray(value),
  );
  return value as Record<string, unknown>;
}
export function identifier(value: unknown, max = 64): string {
  requireValue(
    typeof value === "string" &&
      value.length <= max &&
      /^[A-Za-z0-9_]+$/.test(value),
  );
  return value;
}
export function amountFen(value: unknown): number {
  requireValue(
    typeof value === "string" && /^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(value),
    "AMOUNT_INVALID",
  );
  const [yuan, decimal = ""] = value.split(".");
  const fen = BigInt(yuan!) * 100n + BigInt(decimal.padEnd(2, "0"));
  requireValue(fen <= 10_000_000_000n, "AMOUNT_INVALID");
  return Number(fen);
}
export function amountYuan(fen: number): string {
  requireValue(
    Number.isSafeInteger(fen) && fen > 0 && fen <= 10_000_000_000,
    "INVALID_INPUT",
  );
  return `${Math.floor(fen / 100)}.${String(fen % 100).padStart(2, "0")}`;
}
export function shanghaiDate(value: Date): string {
  requireValue(Number.isFinite(value.getTime()), "INVALID_INPUT");
  return new Date(value.getTime() + 8 * 3600_000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}
export function channelDate(value: unknown): string | null {
  if (value === undefined) return null;
  requireValue(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value),
  );
  const d = new Date(value.replace(" ", "T") + "+08:00");
  requireValue(Number.isFinite(d.getTime()) && shanghaiDate(d) === value);
  return d.toISOString();
}
export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
/** Strict form decoding: URLSearchParams alone silently accepts malformed UTF-8. */
export function decodeNotification(body: Buffer): Record<string, string> {
  requireValue(
    Buffer.isBuffer(body) && body.length > 0 && body.length <= 128 * 1024,
    "INVALID_NOTIFICATION",
  );
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(body);
  const result: Record<string, string> = Object.create(null);
  for (const pair of raw.split("&")) {
    const at = pair.indexOf("=");
    requireValue(at > 0, "INVALID_NOTIFICATION");
    const decode = (s: string) => decodeURIComponent(s.replaceAll("+", " "));
    const name = decode(pair.slice(0, at));
    requireValue(
      /^[a-z][a-z0-9_]*$/.test(name) && !Object.hasOwn(result, name),
      "INVALID_NOTIFICATION",
    );
    result[name] = decode(pair.slice(at + 1));
  }
  return result;
}
