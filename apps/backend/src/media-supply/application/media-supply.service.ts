import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";

import {
  MediaSupplyConflictError,
  MediaSupplyNotFoundError,
} from "../domain/media-supply.errors.js";
import {
  MEDIA_SUPPLY_REPOSITORY,
  type MediaSupplyRepository,
} from "../domain/media-supply.repository.js";
import {
  MEDIA_CATEGORIES,
  type MediaCategory,
  type MediaPlatformFields,
  type MediaResourceFields,
  type MediaSupplierFields,
} from "../domain/media-supply.types.js";

const CATEGORY_LABELS: Record<MediaCategory, string> = {
  CENTRAL_MEDIA: "央媒",
  PORTAL_MEDIA: "门户媒体",
  LOCAL_MEDIA: "地方媒体",
  VERTICAL_MEDIA: "垂直媒体",
  CONTENT_PLATFORM: "内容平台",
};

@Injectable()
export class MediaSupplyService {
  constructor(
    @Inject(MEDIA_SUPPLY_REPOSITORY)
    private readonly repository: MediaSupplyRepository,
  ) {}

  categories() {
    return MEDIA_CATEGORIES.map((id) => ({ id, label: CATEGORY_LABELS[id] }));
  }

  catalogRevision() {
    return this.repository.catalogRevision();
  }

  listCustomerPlatforms(input: {
    category?: string;
    limit?: number | string;
    cursor?: string;
  }) {
    const parsed = customerListSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException("媒体库查询参数不正确");
    return this.repository.listCustomerPlatforms({
      limit: parsed.data.limit,
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
      ...(parsed.data.cursor ? { cursor: parsed.data.cursor } : {}),
    });
  }

  async customerPlatform(platformId: string) {
    const platform = await this.repository.findCustomerPlatform(platformId);
    if (!platform) throw new NotFoundException("未找到该媒体平台");
    return platform;
  }

  listAdminPlatforms() {
    return this.repository.listAdminPlatforms();
  }

  async adminPlatform(platformId: string) {
    const platform = await this.repository.findAdminPlatform(platformId);
    if (!platform) throw new NotFoundException("未找到该媒体平台");
    return platform;
  }

  createPlatform(actorAccountId: string, input: unknown) {
    const parsed = parseOrBadRequest(platformCreateSchema, input);
    return this.execute(() =>
      this.repository.createPlatform(
        { actorAccountId, reason: "创建媒体平台" },
        parsed as MediaPlatformFields,
      ),
    );
  }

  updatePlatform(actorAccountId: string, platformId: string, input: unknown) {
    const parsed = parseOrBadRequest(platformUpdateSchema, input);
    const { reason, expectedRevision, ...fields } = parsed;
    return this.execute(() =>
      this.repository.updatePlatform(
        { actorAccountId, reason },
        platformId,
        fields as Partial<MediaPlatformFields>,
        expectedRevision,
      ),
    );
  }

  deletePlatform(actorAccountId: string, platformId: string, input: unknown) {
    const { reason, expectedRevision } = parseOrBadRequest(
      deleteOwnerSchema,
      input,
    );
    return this.execute(() =>
      this.repository.deletePlatform(
        { actorAccountId, reason },
        platformId,
        expectedRevision,
      ),
    );
  }

  listSuppliers() {
    return this.repository.listSuppliers();
  }

  async supplier(supplierId: string) {
    const supplier = await this.repository.findSupplier(supplierId);
    if (!supplier) throw new NotFoundException("未找到该供应商");
    return supplier;
  }

  createSupplier(actorAccountId: string, input: unknown) {
    const fields = parseOrBadRequest(supplierCreateSchema, input);
    return this.execute(() =>
      this.repository.createSupplier(
        { actorAccountId, reason: "创建供应商" },
        fields as MediaSupplierFields,
      ),
    );
  }

  updateSupplier(actorAccountId: string, supplierId: string, input: unknown) {
    const parsed = parseOrBadRequest(supplierUpdateSchema, input);
    const { reason, expectedRevision, ...fields } = parsed;
    return this.execute(() =>
      this.repository.updateSupplier(
        { actorAccountId, reason },
        supplierId,
        fields as Partial<MediaSupplierFields>,
        expectedRevision,
      ),
    );
  }

  deleteSupplier(actorAccountId: string, supplierId: string, input: unknown) {
    const { reason, expectedRevision } = parseOrBadRequest(
      deleteOwnerSchema,
      input,
    );
    return this.execute(() =>
      this.repository.deleteSupplier(
        { actorAccountId, reason },
        supplierId,
        expectedRevision,
      ),
    );
  }

  listResources(platformId: string) {
    return this.repository.listResources(platformId);
  }

  createResource(actorAccountId: string, input: unknown) {
    const fields = parseOrBadRequest(resourceCreateSchema, input);
    return this.execute(() =>
      this.repository.createResource(
        { actorAccountId, reason: "创建媒体资源" },
        fields as MediaResourceFields,
      ),
    );
  }

  updateResource(actorAccountId: string, resourceId: string, input: unknown) {
    const parsed = parseOrBadRequest(resourceUpdateSchema, input);
    const { reason, expectedRevision, ...fields } = parsed;
    return this.execute(() =>
      this.repository.updateResource(
        { actorAccountId, reason },
        resourceId,
        fields as Partial<MediaResourceFields>,
        expectedRevision,
      ),
    );
  }

  batchUpdateResourceStatus(actorAccountId: string, input: unknown) {
    const parsed = parseOrBadRequest(resourceBatchStatusSchema, input);
    return this.execute(() =>
      this.repository.batchUpdateResourceStatus(
        { actorAccountId, reason: parsed.reason },
        parsed.items,
        parsed.status,
      ),
    );
  }

  deleteResource(actorAccountId: string, resourceId: string, input: unknown) {
    const parsed = parseOrBadRequest(resourceDeleteSchema, input);
    const { reason, expectedSupplierRevision, ...requiredOptions } = parsed;
    const options = {
      ...requiredOptions,
      ...(expectedSupplierRevision === undefined
        ? {}
        : { expectedSupplierRevision }),
    };
    return this.execute(() =>
      this.repository.deleteResource(
        { actorAccountId, reason },
        resourceId,
        options,
      ),
    );
  }

  listAudits(input: {
    entityType?: string;
    entityId?: string;
    limit?: number | string;
  }) {
    const parsed = auditListSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException("审计查询参数不正确");
    return this.repository.listAudits({
      limit: parsed.data.limit,
      ...(parsed.data.entityType ? { entityType: parsed.data.entityType } : {}),
      ...(parsed.data.entityId ? { entityId: parsed.data.entityId } : {}),
    });
  }

  quotePlatform(platformId: string) {
    return this.execute(() => this.repository.quotePlatform(platformId));
  }

  fulfillmentCandidates(platformId: string) {
    return this.execute(() =>
      this.repository.fulfillmentCandidates(platformId),
    );
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof MediaSupplyNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof MediaSupplyConflictError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}

const reason = z.string().trim().min(1).max(320);
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value.startsWith("/") || value.startsWith("https://"),
    "仅支持 HTTPS 或项目资源路径",
  )
  .transform((value) => value || null)
  .nullable();

const deleteOwnerSchema = z
  .object({ reason, expectedRevision: z.number().int().positive() })
  .strict();
const platformFields = z.object({
  displayName: z.string().trim().min(1).max(160),
  aliases: z.array(z.string().trim().min(1).max(160)).max(20),
  description: nullableText(2000),
  logoUrl: optionalUrl,
  regionScope: z.enum(["DOMESTIC", "OVERSEAS"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  pointPrice: z.number().int().positive().max(2_147_483_647).nullable(),
  categories: z.array(z.enum(MEDIA_CATEGORIES)).min(1).transform(unique),
});
const platformCreateSchema = platformFields
  .extend({
    aliases: platformFields.shape.aliases.default([]),
    description: platformFields.shape.description.default(null),
    logoUrl: platformFields.shape.logoUrl.default(null),
    regionScope: platformFields.shape.regionScope.default("DOMESTIC"),
    status: platformFields.shape.status.default("INACTIVE"),
    pointPrice: platformFields.shape.pointPrice.default(null),
  })
  .strict()
  .refine((value) => value.status !== "ACTIVE" || value.pointPrice !== null, {
    message: "启用前必须设置有效积分价",
  });
const platformUpdateSchema = platformFields
  .partial()
  .extend({ expectedRevision: z.number().int().positive(), reason })
  .strict()
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) => key !== "reason" && key !== "expectedRevision",
      ),
    { message: "至少修改一个平台字段" },
  );

const supplierFields = z.object({
  displayName: z.string().trim().min(1).max(160),
  contactName: nullableText(160),
  contactMethod: nullableText(320),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: nullableText(4000),
});
const supplierCreateSchema = supplierFields
  .extend({
    contactName: supplierFields.shape.contactName.default(null),
    contactMethod: supplierFields.shape.contactMethod.default(null),
    status: supplierFields.shape.status.default("INACTIVE"),
    notes: supplierFields.shape.notes.default(null),
  })
  .strict();
const supplierUpdateSchema = supplierFields
  .partial()
  .extend({ expectedRevision: z.number().int().positive(), reason })
  .strict()
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) => key !== "reason" && key !== "expectedRevision",
      ),
    { message: "至少修改一个供应商字段" },
  );

const resourceFields = z.object({
  platformId: z.string().uuid(),
  supplierId: z.string().uuid(),
  resourceName: z.string().trim().min(1).max(240),
  accountIdentifier: nullableText(240),
  accountUrl: optionalUrl,
  publicationMode: z.enum(["FIRST_PUBLISH", "REPOST"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  publicVisibility: z.enum(["HIDDEN", "FULL", "MASKED"]),
  publicAlias: nullableText(240),
  qualityTier: z.enum(["HIGH", "MEDIUM", "LOW"]),
  procurementCostYuan: z
    .number()
    .int()
    .nonnegative()
    .max(2_147_483_647)
    .nullable(),
  caseUrl: optionalUrl,
  publicationNotes: nullableText(8000),
});
const resourceCreateSchema = resourceFields
  .extend({
    accountIdentifier: resourceFields.shape.accountIdentifier.default(null),
    accountUrl: resourceFields.shape.accountUrl.default(null),
    publicationMode:
      resourceFields.shape.publicationMode.default("FIRST_PUBLISH"),
    status: resourceFields.shape.status.default("ACTIVE"),
    publicVisibility: resourceFields.shape.publicVisibility.default("HIDDEN"),
    publicAlias: resourceFields.shape.publicAlias.default(null),
    qualityTier: resourceFields.shape.qualityTier.default("MEDIUM"),
    procurementCostYuan: resourceFields.shape.procurementCostYuan.default(null),
    caseUrl: resourceFields.shape.caseUrl.default(null),
    publicationNotes: resourceFields.shape.publicationNotes.default(null),
  })
  .strict()
  .refine(
    (value) =>
      value.publicVisibility !== "MASKED" || Boolean(value.publicAlias),
    { message: "脱敏展示必须填写客户展示名称" },
  );
const resourceUpdateSchema = resourceFields
  .partial()
  .extend({ expectedRevision: z.number().int().positive(), reason })
  .strict()
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) => key !== "reason" && key !== "expectedRevision",
      ),
    { message: "至少修改一个资源字段" },
  );

const resourceBatchStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
    items: z
      .array(
        z
          .object({
            resourceId: z.string().uuid(),
            expectedRevision: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(200)
      .refine(
        (items) =>
          new Set(items.map((item) => item.resourceId)).size === items.length,
        "不能重复选择同一资源",
      ),
    reason,
  })
  .strict();

const resourceDeleteSchema = z
  .object({
    reason,
    expectedRevision: z.number().int().positive(),
    deleteUnreferencedSupplier: z.boolean().default(false),
    expectedSupplierRevision: z.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.deleteUnreferencedSupplier ||
      value.expectedSupplierRevision !== undefined,
    { message: "同时删除供应商时必须提供供应商版本" },
  );

const customerListSchema = z.object({
  category: z.enum(MEDIA_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

const auditListSchema = z.object({
  entityType: z.string().trim().min(1).max(80).optional(),
  entityId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

function parseOrBadRequest<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestException(
      parsed.error.issues[0]?.message ?? "媒体库数据格式不正确",
    );
  }
  return parsed.data;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
