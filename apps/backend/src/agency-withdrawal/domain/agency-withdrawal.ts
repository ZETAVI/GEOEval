import { createHash } from "node:crypto";
import { z } from "zod";

const requestId = z.string().uuid();
const expectedRevision = z.number().int().min(0).max(2147483646);
const money = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine((value) => BigInt(value) <= 9223372036854775807n);
const reason = z.string().trim().min(2).max(320);

export const payoutProfileInput = z
  .object({
    expectedRevision,
    requestId,
    recipientType: z.enum(["INDIVIDUAL", "ENTERPRISE"]),
    accountName: z.string().trim().min(2).max(120),
    accountNumber: z
      .string()
      .transform((value) => value.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^\d{8,30}$/)),
    bankName: z.string().trim().min(2).max(120),
    openingBranch: z.string().trim().min(2).max(160),
    contactMobile: z
      .string()
      .trim()
      .regex(/^\+?\d{7,20}$/),
    consentVersion: z.literal("agency-payout-v1"),
    sensitiveDataConsent: z.literal(true),
  })
  .strict();

export const withdrawalPolicyInput = z
  .object({
    expectedRevision,
    requestId,
    minimumFen: money,
    reason,
  })
  .strict();

export const withdrawalSubmitInput = z
  .object({ requestId, amountFen: money })
  .strict();

export const withdrawalCommandInput = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("WITHDRAW"), expectedRevision, requestId })
    .strict(),
  z
    .object({ action: z.literal("APPROVE"), expectedRevision, requestId })
    .strict(),
  z
    .object({
      action: z.literal("REJECT"),
      expectedRevision,
      requestId,
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal("COMPLETE"),
      expectedRevision,
      requestId,
      bankTransactionReference: z.string().trim().min(2).max(160),
      externalPaidAt: z.iso.datetime({ offset: true }).optional(),
      note: z.string().trim().max(320).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("PAYMENT_FAILED"),
      expectedRevision,
      requestId,
      reason,
    })
    .strict(),
]);

export const payoutRevealInput = z.object({ requestId, reason }).strict();

export function requestDigest(action: string, input: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify({ action, input }))
    .digest("hex");
}

export function parseMoney(value: string): bigint {
  return BigInt(money.parse(value));
}

export function maskedAccount(last4: string): string {
  return `**** **** **** ${last4}`;
}

export const PAYOUT_CONSENT_VERSION = "agency-payout-v1";
