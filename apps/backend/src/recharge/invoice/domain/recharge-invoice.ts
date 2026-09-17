import { createHash } from "node:crypto";
import { z } from "zod";

const requestId = z.uuid();
const email = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
const title = z.string().trim().min(1).max(160);
const submissionBase = {
  email,
  confirmedAccurate: z.literal(true),
};

const individualSubmission = z
  .object({
    buyerType: z.literal("INDIVIDUAL"),
    title: title.default("个人"),
    taxNumber: z.undefined().optional(),
    ...submissionBase,
  })
  .strict();

const enterpriseSubmission = z
  .object({
    buyerType: z.literal("ENTERPRISE"),
    title,
    taxNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[0-9A-Z]{15,20}$/),
    ...submissionBase,
  })
  .strict();

export const invoiceApplicationInput = z.discriminatedUnion("buyerType", [
  individualSubmission.extend({ requestId }),
  enterpriseSubmission.extend({ requestId }),
]);

export const invoiceResubmissionInput = z.discriminatedUnion("buyerType", [
  individualSubmission.extend({
    requestId,
    expectedRevision: z.number().int().positive(),
  }),
  enterpriseSubmission.extend({
    requestId,
    expectedRevision: z.number().int().positive(),
  }),
]);

const commandBase = {
  requestId,
  expectedRevision: z.number().int().positive(),
};

export const invoiceCommandInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CLAIM"), ...commandBase }).strict(),
  z
    .object({
      action: z.literal("REQUEST_CORRECTION"),
      ...commandBase,
      reasonCode: z.enum([
        "NAME_TAX_MISMATCH",
        "TAX_NUMBER_INVALID",
        "EMAIL_INVALID",
        "OTHER",
      ]),
      note: z.string().trim().max(320).optional(),
    })
    .strict()
    .superRefine((value, context) => {
      if (value.reasonCode === "OTHER" && !value.note)
        context.addIssue({
          code: "custom",
          path: ["note"],
          message: "其他原因需要补充说明",
        });
    }),
  z
    .object({
      action: z.literal("COMPLETE"),
      ...commandBase,
      invoiceNumber: z.string().trim().min(1).max(120),
      issuedOn: z.iso.date(),
      confirmedSent: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("ASSIGN"),
      ...commandBase,
      assigneeAccountId: z.uuid(),
    })
    .strict(),
  z.object({ action: z.literal("RETURN_TO_POOL"), ...commandBase }).strict(),
  z.object({ action: z.literal("TAKE_OVER"), ...commandBase }).strict(),
]);

export const customerInvoiceListQuery = z
  .object({
    cursor: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const customerInvoiceOrderSummariesQuery = z
  .object({
    orderIds: z
      .string()
      .transform((value) => [...new Set(value.split(",").filter(Boolean))])
      .pipe(z.array(z.uuid()).min(1).max(50)),
  })
  .strict();

export const internalInvoiceListQuery = z
  .object({
    scope: z.enum(["UNASSIGNED", "MINE"]).optional(),
    status: z.enum(["PROCESSING", "NEEDS_CORRECTION", "ISSUED"]).optional(),
    accountId: z.uuid().optional(),
    assigneeAccountId: z.uuid().optional(),
    cursor: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type InvoiceSubmissionInput =
  z.infer<typeof individualSubmission> | z.infer<typeof enterpriseSubmission>;

export function invoiceRequestDigest(action: string, input: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify({ action, input }))
    .digest("hex");
}

export function publicCorrectionReason(code: string, note: string | null) {
  const label: Record<string, string> = {
    NAME_TAX_MISMATCH: "企业名称与税号不匹配",
    TAX_NUMBER_INVALID: "税号格式或内容有误",
    EMAIL_INVALID: "接收邮箱无法使用",
    OTHER: "开票资料需要修改",
  };
  return { code, summary: label[code] ?? "开票资料需要修改", note };
}
