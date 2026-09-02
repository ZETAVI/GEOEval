export const MEDIA_CATEGORIES = [
  "CENTRAL_MEDIA",
  "PORTAL_MEDIA",
  "LOCAL_MEDIA",
  "VERTICAL_MEDIA",
  "CONTENT_PLATFORM",
  "OVERSEAS_MEDIA",
] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];
export type MediaRegionScope = "DOMESTIC" | "OVERSEAS";
export type MediaPlatformStatus = "ACTIVE" | "ARCHIVED";
export type MediaListingStatus = "DRAFT" | "ON_SHELF" | "PAUSED" | "OFF_SHELF";
export type MediaResourceStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type MediaSupplySourceStatus = "ACTIVE" | "INACTIVE";
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
  categories: MediaCategory[];
}

export interface MediaListingFields {
  status: MediaListingStatus;
  pointPrice: number | null;
}

export interface MediaSupplySourceFields {
  name: string;
  contactName: string | null;
  contactMethod: string | null;
  status: MediaSupplySourceStatus;
  notes: string | null;
}

export interface MediaResourceFields {
  platformId: string;
  supplySourceId: string;
  resourceName: string;
  accountIdentifier: string | null;
  accountUrl: string | null;
  publicationMode: MediaPublicationMode;
  status: MediaResourceStatus;
  publicVisibility: MediaPublicVisibility;
  publicAlias: string | null;
  qualityTier: MediaQualityTier;
  procurementCostFen: number | null;
  caseUrl: string | null;
  publicationNotes: string | null;
}

export interface MediaListingView extends MediaListingFields {
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaPlatformAdminView extends MediaPlatformFields {
  id: string;
  normalizedName: string;
  listing: MediaListingView | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaSupplySourceView extends MediaSupplySourceFields {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaResourceView extends MediaResourceFields {
  id: string;
  source: MediaSupplySourceView;
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
  listingRevision: number;
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
  listingRevision: number | null;
}

export interface MediaFulfillmentCandidate {
  resourceId: string;
  resourceName: string;
  accountIdentifier: string | null;
  accountUrl: string | null;
  publicationMode: MediaPublicationMode;
  qualityTier: MediaQualityTier;
  supplySourceId: string;
  supplySourceName: string;
  contactName: string | null;
  contactMethod: string | null;
  procurementCostFen: number | null;
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
