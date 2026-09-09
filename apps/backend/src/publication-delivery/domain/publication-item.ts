import { z } from "zod";
import { assignmentInputSchema } from "./delivery-assignment.js";

const phrase = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).default("");
export const preparedVariantSchema = z
  .object({
    mode: z.enum(["MOCK", "MANUAL"]),
    title: phrase(200),
    bodyMarkdown: phrase(100_000),
  })
  .strict();
const publicUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  }, "请填写不含账号密码的 HTTP(S) 发布链接")
  .transform((value) => {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  })
  .pipe(z.string().max(2048));
export const resultInputSchema = z
  .object({
    title: phrase(200),
    url: publicUrl,
    publishedAt: z.string().datetime({ offset: true }),
    internalChannel: optionalText(160),
    internalNote: optionalText(320),
  })
  .strict();
export const publicationResultSchema = resultInputSchema.extend({
  platformId: z.string().uuid(),
  displayName: phrase(160),
});
export const replacementTargetSchema = z
  .object({
    platformId: z.string().uuid(),
    displayName: phrase(160),
  })
  .strict();
const base = assignmentInputSchema.extend({
  expectedItemRevision: z.number().int().min(0).max(2_147_483_646),
  platformId: z
    .string()
    .uuid()
    .transform((value) => value.toLowerCase()),
});
export const publicationCommandSchema = z.discriminatedUnion("action", [
  base.extend({ action: z.literal("BEGIN") }),
  base.extend({ action: z.literal("PREPARE_MOCK") }),
  base.extend({ action: z.literal("REPLACE_TARGET"), reason: phrase(320) }),
  base.extend({
    action: z.literal("SAVE_DRAFT"),
    title: phrase(200),
    bodyMarkdown: phrase(100_000),
  }),
  base.extend({
    action: z.literal("RECORD_RESULT"),
    result: resultInputSchema,
  }),
  base.extend({
    action: z.literal("CORRECT_RESULT"),
    result: resultInputSchema,
    reason: phrase(320),
  }),
]);
export type PublicationCommand = z.infer<typeof publicationCommandSchema>;
export type PreparedVariant = z.infer<typeof preparedVariantSchema>;
export type PublicationResult = z.infer<typeof publicationResultSchema>;
export type PublicationWorkReceipt = {
  orderId: string;
  slot: number;
  revision: number;
  orderRevision: number;
};
export type PublicationSource = {
  title: string;
  bodyMarkdown: string;
  quantity: number;
  purchasedPlatformId?: string;
  target: { platformId: string; displayName: string };
};

/** This seam varies for a real preparer; it has no publication or DB authority. */
export interface VariantPreparer {
  readonly mode: "MOCK" | "UNAVAILABLE";
  prepare(
    input: PublicationSource & { slot: number },
  ): Promise<PreparedVariant>;
}
export const VARIANT_PREPARER = Symbol("VARIANT_PREPARER");

export function customerPublicationResult(result: PublicationResult) {
  return {
    platformId: result.platformId,
    displayName: result.displayName,
    title: result.title,
    url: result.url,
    publishedAt: result.publishedAt,
  };
}
