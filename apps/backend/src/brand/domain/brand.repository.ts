import type {
  BrandProfileFields,
  BrandProfileView,
  BrandStoreLocationWrite,
} from "./brand.types.js";

export const BRAND_REPOSITORY = Symbol("BRAND_REPOSITORY");

export class BrandConcurrentUpdateError extends Error {}
export class BrandStoreLocationReceiptReplayError extends Error {}

export interface BrandRepository {
  list(
    accountId: string,
  ): Promise<{ brands: BrandProfileView[]; currentBrandId: string | null }>;
  find(
    accountId: string,
    brandId: string,
  ): Promise<BrandProfileView | undefined>;
  create(input: {
    brandId?: string;
    accountId: string;
    fields: BrandProfileFields;
    storeLocation: BrandStoreLocationWrite | null;
    evaluationFingerprint: string;
    writingContextFingerprint: string;
  }): Promise<BrandProfileView>;
  update(input: {
    accountId: string;
    brandId: string;
    expectedRevision: number;
    fields: BrandProfileFields;
    storeLocation: BrandStoreLocationWrite | null;
    evaluationFingerprint: string;
    writingContextFingerprint: string;
  }): Promise<BrandProfileView | undefined>;
  selectCurrent(
    accountId: string,
    brandId: string,
  ): Promise<BrandProfileView | undefined>;
}
