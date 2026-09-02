import type {
  MediaCatalogAuditView,
  MediaCategory,
  MediaFulfillmentCandidate,
  MediaMutationContext,
  MediaPlatformAdminView,
  MediaPlatformCustomerView,
  MediaPlatformFields,
  MediaPlatformPage,
  MediaPlatformQuote,
  MediaResourceFields,
  MediaResourceView,
  MediaSupplySourceFields,
  MediaSupplySourceView,
} from "./media-supply.types.js";

export const MEDIA_SUPPLY_REPOSITORY = Symbol("MEDIA_SUPPLY_REPOSITORY");

export interface MediaSupplyRepository {
  catalogRevision(): Promise<string>;
  listCustomerPlatforms(input: {
    category?: MediaCategory;
    limit: number;
    cursor?: string;
  }): Promise<MediaPlatformPage>;
  findCustomerPlatform(
    platformId: string,
  ): Promise<MediaPlatformCustomerView | undefined>;
  listAdminPlatforms(): Promise<MediaPlatformAdminView[]>;
  findAdminPlatform(
    platformId: string,
  ): Promise<MediaPlatformAdminView | undefined>;
  createPlatform(
    context: MediaMutationContext,
    fields: MediaPlatformFields,
  ): Promise<MediaPlatformAdminView>;
  updatePlatform(
    context: MediaMutationContext,
    platformId: string,
    fields: Partial<MediaPlatformFields>,
    expectedRevision?: number,
  ): Promise<MediaPlatformAdminView>;
  deletePlatform(
    context: MediaMutationContext,
    platformId: string,
  ): Promise<void>;
  listSources(): Promise<MediaSupplySourceView[]>;
  createSource(
    context: MediaMutationContext,
    fields: MediaSupplySourceFields,
  ): Promise<MediaSupplySourceView>;
  updateSource(
    context: MediaMutationContext,
    sourceId: string,
    fields: Partial<MediaSupplySourceFields>,
  ): Promise<MediaSupplySourceView>;
  deleteSource(context: MediaMutationContext, sourceId: string): Promise<void>;
  listResources(platformId: string): Promise<MediaResourceView[]>;
  createResource(
    context: MediaMutationContext,
    fields: MediaResourceFields,
  ): Promise<MediaResourceView>;
  updateResource(
    context: MediaMutationContext,
    resourceId: string,
    fields: Partial<MediaResourceFields>,
  ): Promise<MediaResourceView>;
  deleteResource(
    context: MediaMutationContext,
    resourceId: string,
  ): Promise<void>;
  listAudits(input: {
    entityType?: string;
    entityId?: string;
    limit: number;
  }): Promise<MediaCatalogAuditView[]>;
  quotePlatform(platformId: string): Promise<MediaPlatformQuote>;
  fulfillmentCandidates(
    platformId: string,
  ): Promise<MediaFulfillmentCandidate[]>;
}
