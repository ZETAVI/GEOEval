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
  MediaResourceBatchItem,
  MediaResourceDeleteOptions,
  MediaResourceDeleteResult,
  MediaResourceView,
  MediaSupplierDetailView,
  MediaSupplierFields,
  MediaSupplierView,
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
    expectedRevision: number,
  ): Promise<void>;
  listSuppliers(): Promise<MediaSupplierView[]>;
  findSupplier(
    supplierId: string,
  ): Promise<MediaSupplierDetailView | undefined>;
  createSupplier(
    context: MediaMutationContext,
    fields: MediaSupplierFields,
  ): Promise<MediaSupplierView>;
  updateSupplier(
    context: MediaMutationContext,
    supplierId: string,
    fields: Partial<MediaSupplierFields>,
    expectedRevision: number,
  ): Promise<MediaSupplierView>;
  deleteSupplier(
    context: MediaMutationContext,
    supplierId: string,
    expectedRevision: number,
  ): Promise<void>;
  listResources(platformId: string): Promise<MediaResourceView[]>;
  createResource(
    context: MediaMutationContext,
    fields: MediaResourceFields,
  ): Promise<MediaResourceView>;
  updateResource(
    context: MediaMutationContext,
    resourceId: string,
    fields: Partial<MediaResourceFields>,
    expectedRevision: number,
  ): Promise<MediaResourceView>;
  batchUpdateResourceStatus(
    context: MediaMutationContext,
    items: MediaResourceBatchItem[],
    status: MediaResourceFields["status"],
  ): Promise<MediaResourceView[]>;
  deleteResource(
    context: MediaMutationContext,
    resourceId: string,
    options: MediaResourceDeleteOptions,
  ): Promise<MediaResourceDeleteResult>;
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
