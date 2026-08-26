import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function challengeDigest(
  pepper: string,
  challengeId: string,
  mobile: string,
  code: string,
): string {
  return createHmac("sha256", pepper)
    .update(`${challengeId}:${mobile}:${code}`)
    .digest("hex");
}

export function sessionDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function digestsMatch(expected: string, actual: string): boolean {
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(actual, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
