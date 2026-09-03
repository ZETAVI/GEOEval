import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const regionNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  officialCode: z.string().min(1),
  officialLevel: z.enum(["PROVINCE", "PREFECTURE", "COUNTY", "TOWNSHIP"]),
});

const derivedRegionSchema = z.object({
  sourceReleaseId: z.string().min(1),
  province: z.object({ id: z.string().min(1), label: z.string().min(1) }),
  city: z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    identityKind: z.enum([
      "OFFICIAL_DIVISION",
      "MUNICIPALITY_REPEAT",
      "PROVINCE_DIRECT_GROUP",
    ]),
    officialDivisionId: z.string().min(1).nullable(),
  }),
  terminal: regionNodeSchema.extend({
    officialLevel: z.enum(["COUNTY", "TOWNSHIP"]),
  }),
  officialPath: z.array(regionNodeSchema).min(2).max(3),
});

const receiptPayloadSchema = z.object({
  receiptVersion: z.literal("store-location-verification@2"),
  verificationId: z.string().uuid(),
  accountId: z.string().uuid(),
  targetBrandId: z.string().uuid(),
  targetKind: z.enum(["NEW_BRAND", "EXISTING_BRAND"]),
  searchInput: z.string().min(1).max(200),
  evidence: z.object({
    providerPlaceId: z.string().min(1).max(120),
    placeName: z.string().min(1).max(240),
    formattedAddress: z.string().min(1).max(500),
    coordinate: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      system: z.literal("GCJ_02"),
    }),
    provinceName: z.string().min(1).max(100),
    cityName: z.string().max(100).nullable(),
    districtName: z.string().max(100).nullable(),
    townshipName: z.string().max(100).nullable(),
    adcode: z.string().regex(/^\d{6}$/),
    towncode: z
      .string()
      .regex(/^\d{12}$/)
      .nullable(),
    providerContractVersion: z.string().min(1).max(100),
    verifiedAt: z.string().datetime(),
  }),
  officialRegion: derivedRegionSchema,
  queryLocality: z.object({
    kind: z.enum(["BUSINESS_AREA", "ADDRESS_LOCALITY"]),
    label: z.string().min(1).max(240),
  }),
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export type StoreLocationReceiptPayload = z.infer<typeof receiptPayloadSchema>;

export class StoreLocationReceiptError extends Error {}

export class StoreLocationReceiptCodec {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  issue(
    input: Omit<
      StoreLocationReceiptPayload,
      "receiptVersion" | "issuedAt" | "expiresAt"
    >,
  ): { verificationReceipt: string; expiresAt: Date } {
    const issuedAt = this.now().getTime();
    const payload = receiptPayloadSchema.parse({
      receiptVersion: "store-location-verification@2",
      ...input,
      issuedAt,
      expiresAt: issuedAt + this.ttlSeconds * 1000,
    });
    const encodedPayload = encode(JSON.stringify(payload));
    return {
      verificationReceipt: `v2.${encodedPayload}.${this.sign(encodedPayload)}`,
      expiresAt: new Date(payload.expiresAt),
    };
  }

  verify(receipt: string): StoreLocationReceiptPayload {
    const [version, encodedPayload, providedSignature, extra] =
      receipt.split(".");
    if (
      version !== "v2" ||
      !encodedPayload ||
      !providedSignature ||
      extra !== undefined
    ) {
      throw new StoreLocationReceiptError("门店验证凭证格式无效");
    }
    const expected = Buffer.from(this.sign(encodedPayload));
    const actual = Buffer.from(providedSignature);
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new StoreLocationReceiptError("门店验证凭证已被修改");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(decode(encodedPayload));
    } catch {
      throw new StoreLocationReceiptError("门店验证凭证内容无效");
    }
    const result = receiptPayloadSchema.safeParse(parsed);
    if (!result.success) {
      throw new StoreLocationReceiptError("门店验证凭证内容无效");
    }
    const now = this.now().getTime();
    if (result.data.expiresAt <= now) {
      throw new StoreLocationReceiptError("门店验证已过期，请重新选择门店");
    }
    return result.data;
  }

  private sign(encodedPayload: string): string {
    return createHmac("sha256", this.secret)
      .update(encodedPayload)
      .digest("base64url");
  }
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}
