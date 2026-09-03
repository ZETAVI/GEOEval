export const MEDIA_CATEGORIES = [
  "CENTRAL_MEDIA",
  "PORTAL_MEDIA",
  "LOCAL_MEDIA",
  "VERTICAL_MEDIA",
  "CONTENT_PLATFORM",
] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];
export type MediaRegionScope = "DOMESTIC" | "OVERSEAS";
export type MediaPlatformStatus = "ACTIVE" | "INACTIVE";
export type MediaResourceStatus = "ACTIVE" | "INACTIVE";
export type MediaSupplierStatus = "ACTIVE" | "INACTIVE";
export type MediaResourceEffectiveStatus =
  "ACTIVE" | "RESOURCE_INACTIVE" | "SUPPLIER_INACTIVE";
export type MediaPublicationMode = "FIRST_PUBLISH" | "REPOST";
export type MediaPublicVisibility = "HIDDEN" | "FULL" | "MASKED";
export type MediaQualityTier = "HIGH" | "MEDIUM" | "LOW";

export interface MediaPlatformFields {
  displayName: string;
  aliases: string[];
  description: string | null;
  logoUrl: string | null;
  regionScope: MediaRegionScope;
  status: MediaPlatformStatus;
  pointPrice: number | null;
  categories: MediaCategory[];
}

export interface MediaSupplierFields {
  displayName: string;
  contactName: string | null;
  contactMethod: string | null;
  status: MediaSupplierStatus;
  notes: string | null;
}

export interface MediaResourceFields {
  platformId: string;
  supplierId: string;
  resourceName: string;
  accountIdentifier: string | null;
  accountUrl: string | null;
  publicationMode: MediaPublicationMode;
  status: MediaResourceStatus;
  publicVisibility: MediaPublicVisibility;
  publicAlias: string | null;
  qualityTier: MediaQualityTier;
  procurementCostYuan: number | null;
  caseUrl: string | null;
  publicationNotes: string | null;
}

export interface MediaPlatformAdminView extends MediaPlatformFields {
  id: string;
  normalizedName: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaSupplierView extends MediaSupplierFields {
  id: string;
  normalizedName: string;
  revision: number;
  resourceCount: number;
  platformCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaSupplierAssociation {
  resourceId: string;
  resourceName: string;
  resourceStatus: MediaResourceStatus;
  effectiveStatus: MediaResourceEffectiveStatus;
  resourceRevision: number;
  platformId: string;
  platformDisplayName: string;
}

export interface MediaSupplierDetailView extends MediaSupplierView {
  resources: MediaSupplierAssociation[];
}

export interface MediaResourceView extends MediaResourceFields {
  id: string;
  supplier: MediaSupplierView;
  effectiveStatus: MediaResourceEffectiveStatus;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaResourceExample {
  id: string;
  displayName: string;
  publicationMode: MediaPublicationMode;
}

export interface MediaPlatformCustomerView {
  id: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  regionScope: MediaRegionScope;
  categories: MediaCategory[];
  pointPrice: number;
  revision: number;
  examples: MediaResourceExample[];
}

export interface MediaPlatformPage {
  items: MediaPlatformCustomerView[];
  nextCursor: string | null;
}

export interface MediaPlatformQuote {
  platformId: string;
  displayName: string;
  buyable: boolean;
  pointPrice: number | null;
  revision: number;
}

export interface MediaFulfillmentCandidate {
  resourceId: string;
  resourceName: string;
  accountIdentifier: string | null;
  accountUrl: string | null;
  publicationMode: MediaPublicationMode;
  qualityTier: MediaQualityTier;
  supplierId: string;
  supplierName: string;
  contactName: string | null;
  contactMethod: string | null;
  procurementCostYuan: number | null;
  caseUrl: string | null;
  publicationNotes: string | null;
}

export interface MediaCatalogAuditView {
  id: string;
  actorAccountId: string;
  entityType: string;
  entityId: string;
  action: string;
  reason: string;
  beforeState: unknown;
  afterState: unknown;
  createdAt: Date;
}

export interface MediaMutationContext {
  actorAccountId: string;
  reason: string;
}

export interface MediaResourceBatchItem {
  resourceId: string;
  expectedRevision: number;
}

export interface MediaResourceDeleteOptions {
  expectedRevision: number;
  deleteUnreferencedSupplier: boolean;
  expectedSupplierRevision?: number;
}

export interface MediaResourceDeleteResult {
  resourceId: string;
  supplierId: string;
  supplierDeleted: boolean;
}
