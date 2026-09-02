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
  type MediaListingFields,
  type MediaPlatformFields,
  type MediaResourceFields,
  type MediaSupplySourceFields,
} from "../domain/media-supply.types.js";

const CATEGORY_LABELS: Record<MediaCategory, string> = {
  CENTRAL_MEDIA: "央媒",
  PORTAL_MEDIA: "门户媒体",
  LOCAL_MEDIA: "地方媒体",
  VERTICAL_MEDIA: "垂直媒体",
  CONTENT_PLATFORM: "内容平台",
  OVERSEAS_MEDIA: "海外媒体",
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
    const { reason, ...fields } = parsed;
    return this.execute(() =>
      this.repository.createPlatform(
        { actorAccountId, reason },
        fields as MediaPlatformFields,
      ),
    );
  }

  updatePlatform(actorAccountId: string, platformId: string, input: unknown) {
    const parsed = parseOrBadRequest(platformUpdateSchema, input);
    const { reason, ...fields } = parsed;
    return this.execute(() =>
      this.repository.updatePlatform(
        { actorAccountId, reason },
        platformId,
        fields as Partial<MediaPlatformFields>,
      ),
    );
  }

  deletePlatform(actorAccountId: string, platformId: string, input: unknown) {
    const { reason } = parseOrBadRequest(reasonSchema, input);
    return this.execute(() =>
      this.repository.deletePlatform({ actorAccountId, reason }, platformId),
    );
  }

  upsertListing(actorAccountId: string, platformId: string, input: unknown) {
    const parsed = parseOrBadRequest(listingSchema, input);
    const { reason, expectedRevision, ...fields } = parsed;
    return this.execute(() =>
      this.repository.upsertListing(
        { actorAccountId, reason },
        platformId,
        fields as MediaListingFields,
        expectedRevision,
      ),
    );
  }

  listSources() {
    return this.repository.listSources();
  }

  createSource(actorAccountId: string, input: unknown) {
    const parsed = parseOrBadRequest(sourceCreateSchema, input);
    const { reason, ...fields } = parsed;
    return this.execute(() =>
      this.repository.createSource(
        { actorAccountId, reason },
        fields as MediaSupplySourceFields,
      ),
    );
  }

  updateSource(actorAccountId: string, sourceId: string, input: unknown) {
    const parsed = parseOrBadRequest(sourceUpdateSchema, input);
    const { reason, ...fields } = parsed;
    return this.execute(() =>
      this.repository.updateSource(
        { actorAccountId, reason },
        sourceId,
        fields as Partial<MediaSupplySourceFields>,
      ),
    );
  }

  deleteSource(actorAccountId: string, sourceId: string, input: unknown) {
    const { reason } = parseOrBadRequest(reasonSchema, input);
    return this.execute(() =>
      this.repository.deleteSource({ actorAccountId, reason }, sourceId),
    );
  }

  listResources(platformId: string) {
    return this.repository.listResources(platformId);
  }

  createResource(actorAccountId: string, input: unknown) {
    const parsed = parseOrBadRequest(resourceCreateSchema, input);
    const { reason, ...fields } = parsed;
    return this.execute(() =>
      this.repository.createResource(
        { actorAccountId, reason },
        fields as MediaResourceFields,
      ),
    );
  }

  updateResource(actorAccountId: string, resourceId: string, input: unknown) {
    const parsed = parseOrBadRequest(resourceUpdateSchema, input);
    const { reason, ...fields } = parsed;
    return this.execute(() =>
      this.repository.updateResource(
        { actorAccountId, reason },
        resourceId,
        fields as Partial<MediaResourceFields>,
      ),
    );
  }

  deleteResource(actorAccountId: string, resourceId: string, input: unknown) {
    const { reason } = parseOrBadRequest(reasonSchema, input);
    return this.execute(() =>
      this.repository.deleteResource({ actorAccountId, reason }, resourceId),
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

const reasonSchema = z.object({ reason }).strict();
const platformFields = z.object({
  displayName: z.string().trim().min(1).max(160),
  aliases: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  description: nullableText(2000).default(null),
  logoUrl: optionalUrl.default(null),
  regionScope: z.enum(["DOMESTIC", "OVERSEAS"]).default("DOMESTIC"),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  categories: z.array(z.enum(MEDIA_CATEGORIES)).min(1).transform(unique),
});
const platformCreateSchema = platformFields.extend({ reason }).strict();
const platformUpdateSchema = platformFields
  .partial()
  .extend({ reason })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== "reason"), {
    message: "至少修改一个平台字段",
  });

const listingSchema = z
  .object({
    status: z.enum(["DRAFT", "ON_SHELF", "PAUSED", "OFF_SHELF"]),
    pointPrice: z.number().int().positive().max(2_147_483_647).nullable(),
    expectedRevision: z.number().int().positive().optional(),
    reason,
  })
  .strict()
  .refine((value) => value.status !== "ON_SHELF" || value.pointPrice !== null, {
    message: "上架前必须设置有效积分价",
  });

const sourceFields = z.object({
  name: z.string().trim().min(1).max(160),
  contactName: nullableText(160).default(null),
  contactMethod: nullableText(320).default(null),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  notes: nullableText(4000).default(null),
});
const sourceCreateSchema = sourceFields.extend({ reason }).strict();
const sourceUpdateSchema = sourceFields
  .partial()
  .extend({ reason })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== "reason"), {
    message: "至少修改一个供给来源字段",
  });

const resourceFields = z.object({
  platformId: z.string().uuid(),
  supplySourceId: z.string().uuid(),
  resourceName: z.string().trim().min(1).max(240),
  accountIdentifier: nullableText(240).default(null),
  accountUrl: optionalUrl.default(null),
  publicationMode: z.enum(["FIRST_PUBLISH", "REPOST"]).default("FIRST_PUBLISH"),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE"),
  publicVisibility: z.enum(["HIDDEN", "FULL", "MASKED"]).default("HIDDEN"),
  publicAlias: nullableText(240).default(null),
  qualityTier: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  procurementCostFen: z
    .number()
    .int()
    .nonnegative()
    .max(2_147_483_647)
    .nullable()
    .default(null),
  caseUrl: optionalUrl.default(null),
  publicationNotes: nullableText(8000).default(null),
});
const resourceCreateSchema = resourceFields
  .extend({ reason })
  .strict()
  .refine(
    (value) =>
      value.publicVisibility !== "MASKED" || Boolean(value.publicAlias),
    { message: "脱敏展示必须填写客户展示名称" },
  );
const resourceUpdateSchema = resourceFields
  .partial()
  .extend({ reason })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== "reason"), {
    message: "至少修改一个资源字段",
  });

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
