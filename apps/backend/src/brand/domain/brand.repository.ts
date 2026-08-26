import type { BrandProfileFields, BrandProfileView } from "./brand.types.js";

export const BRAND_REPOSITORY = Symbol("BRAND_REPOSITORY");

export interface BrandRepository {
  list(
    accountId: string,
  ): Promise<{ brands: BrandProfileView[]; currentBrandId: string | null }>;
  find(
    accountId: string,
    brandId: string,
  ): Promise<BrandProfileView | undefined>;
  create(input: {
    accountId: string;
    fields: BrandProfileFields;
    evaluationFingerprint: string;
  }): Promise<BrandProfileView>;
  update(input: {
    accountId: string;
    brandId: string;
    fields: Partial<BrandProfileFields>;
    evaluationFingerprint: string;
  }): Promise<BrandProfileView | undefined>;
  selectCurrent(
    accountId: string,
    brandId: string,
  ): Promise<BrandProfileView | undefined>;
}
