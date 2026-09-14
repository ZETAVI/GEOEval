import { createHash, randomBytes } from "node:crypto";
import { BadRequestException, ConflictException } from "@nestjs/common";

export const ACQUISITION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const ENTRY_KEY = /^[A-Za-z0-9_-]{32}$/;
export const VISIT_TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const entryKey = () => randomBytes(24).toString("base64url");
export const visitToken = () => randomBytes(32).toString("base64url");
export const visitDigest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function unavailable(): never {
  throw new ConflictException({
    code: "ENTRY_UNAVAILABLE",
    message: "当前入口暂不可用，请重新打开有效的访问链接",
  });
}

export function parseEntryInput(raw: unknown): {
  entryKey?: string;
  visitToken?: string;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new BadRequestException("入口请求格式不正确");
  const body = raw as Record<string, unknown>;
  for (const [field, pattern] of [
    ["entryKey", ENTRY_KEY],
    ["visitToken", VISIT_TOKEN],
  ] as const) {
    if (
      body[field] !== undefined &&
      (typeof body[field] !== "string" || !pattern.test(body[field]))
    )
      throw new BadRequestException("入口请求格式不正确");
  }
  return {
    ...(typeof body.entryKey === "string" ? { entryKey: body.entryKey } : {}),
    ...(typeof body.visitToken === "string"
      ? { visitToken: body.visitToken }
      : {}),
  };
}
