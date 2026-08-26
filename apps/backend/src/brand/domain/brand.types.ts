export type BrandProfileFields = {
  companyName: string;
  primaryIndustry: string | null;
  secondaryIndustry: string | null;
  characteristicOne: string | null;
  characteristicTwo: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  contactName: string | null;
  contactMobile: string | null;
};

export type BrandProfileView = BrandProfileFields & {
  id: string;
  accountId: string;
  status: "ACTIVE" | "ARCHIVED";
  evaluationFingerprint: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BrandReadiness = {
  readyForEvaluation: boolean;
  missingFields: string[];
};

export type BrandView = BrandProfileView &
  BrandReadiness & { isCurrent: boolean };

export type EditableBrandFields = Partial<
  Omit<BrandProfileFields, "companyName">
> & { companyName?: string | null };

export type EvaluationPurposeBrandView = {
  accountId: string;
  brandId: string;
  inputFingerprint: string;
  companyName: string;
  primaryIndustry: string;
  secondaryIndustry: string;
  characteristicOne: string;
  characteristicTwo: string;
  province: string;
  city: string;
  district: string;
};
