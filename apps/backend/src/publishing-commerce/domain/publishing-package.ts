import { z } from "zod";

const wholePositive = z.number().int().positive().max(2_147_483_647);
const cleanText = (maximum: number) =>
  z
    .string()
    .transform((value) => value.normalize("NFKC").trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1).max(maximum));

export const packageFieldsSchema = z
  .object({
    name: cleanText(120),
    quantity: wholePositive,
    pointPrice: wholePositive,
    status: z.enum(["INACTIVE", "ACTIVE"]),
    platformIds: z
      .array(z.string().uuid())
      .min(1)
      .max(200)
      .refine((ids) => new Set(ids).size === ids.length, "媒体范围不能重复")
      .transform((ids) => [...ids].sort()),
  })
  .strict();
export const packageUpdateSchema = packageFieldsSchema
  .extend({
    expectedRevision: wholePositive,
    reason: cleanText(320),
  })
  .strict();

export type PublishingPackageFields = z.infer<typeof packageFieldsSchema>;
export type PublishingPackageView = PublishingPackageFields & {
  id: string;
  revision: number;
};
export type PublishingPackageAuditView = {
  id: string;
  actorAccountId: string;
  reason: string;
  createdAt: Date;
  beforeState: PublishingPackageView | null;
  afterState: PublishingPackageView;
};

export class PackageConflictError extends Error {}
export class PackageNotFoundError extends Error {}

export const PUBLISHING_PACKAGE_REPOSITORY = Symbol(
  "PUBLISHING_PACKAGE_REPOSITORY",
);
export interface PublishingPackageRepository {
  find(id: string): Promise<PublishingPackageView | null>;
  list(onlyActive: boolean): Promise<PublishingPackageView[]>;
  create(
    actorAccountId: string,
    fields: PublishingPackageFields,
  ): Promise<PublishingPackageView>;
  update(
    actorAccountId: string,
    id: string,
    fields: PublishingPackageFields,
    expectedRevision: number,
    reason: string,
  ): Promise<PublishingPackageView>;
  audits(id: string): Promise<PublishingPackageAuditView[]>;
}
