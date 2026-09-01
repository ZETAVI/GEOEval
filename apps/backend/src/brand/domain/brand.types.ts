export type BrandProfileFields = {
  companyName: string;
  primaryIndustryId: string | null;
  secondaryIndustryId: string | null;
  otherProductOrService: string | null;
  characteristicOne: string | null;
  characteristicTwo: string | null;
  provinceRegionId: string | null;
  cityRegionId: string | null;
  terminalRegionId: string | null;
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

export type BrandReferenceDisplay = {
  primaryIndustryLabel: string | null;
  secondaryIndustryLabel: string | null;
  provinceRegionLabel: string | null;
  cityRegionLabel: string | null;
  terminalRegionLabel: string | null;
  terminalRegionLevel: "COUNTY" | "TOWNSHIP" | null;
};

export type BrandView = BrandProfileView &
  BrandReadiness &
  BrandReferenceDisplay & { isCurrent: boolean };

export type EditableBrandFields = Partial<
  Omit<BrandProfileFields, "companyName">
> & { companyName?: string | null };

export type EvaluationPurposeBrandView = {
  accountId: string;
  brandId: string;
  inputFingerprint: string;
  companyName: string;
  industry: {
    catalogId: string;
    catalogVersion: string;
    primary: { id: string; label: string };
    secondary: { id: string; label: string };
    otherProductOrService: string | null;
    recommendationSubject: string;
  };
  region: {
    sourceReleaseId: string;
    province: { id: string; label: string };
    city: {
      id: string;
      label: string;
      identityKind:
        "OFFICIAL_DIVISION" | "MUNICIPALITY_REPEAT" | "PROVINCE_DIRECT_GROUP";
      officialDivisionId: string | null;
    };
    terminal: {
      id: string;
      label: string;
      officialCode: string;
      officialLevel: "COUNTY" | "TOWNSHIP";
    };
    officialPath: Array<{
      id: string;
      label: string;
      officialCode: string;
      officialLevel: "PROVINCE" | "PREFECTURE" | "COUNTY" | "TOWNSHIP";
    }>;
  };
  characteristicOne: string;
  characteristicTwo: string;
};

export type EvaluationReportPurposeBrandView = {
  accountId: string;
  brandId: string;
  companyName: string;
  inputFingerprint: string;
};
