export type BrandCharacteristic = {
  id: string;
  title: string;
  detail: string | null;
};

export type BrandCharacteristicMutation = {
  id?: string;
  title: string;
  detail?: string | null;
};

export type BrandPriceInformation =
  | { mode: "RANGE"; minimum: number; maximum: number }
  | { mode: "NEGOTIABLE" }
  | null;

export type BrandArticleInformation = {
  price: BrandPriceInformation;
  suitableAudienceContexts: string[];
  supplementalBackground: string | null;
  desiredPositioning: string[];
};

export type BrandProfileFields = {
  companyName: string;
  primaryIndustryId: string | null;
  secondaryIndustryId: string | null;
  otherProductOrService: string | null;
  flagshipProductOrService: string | null;
  characteristics: BrandCharacteristic[];
  articleInformation: BrandArticleInformation;
  contactName: string | null;
  contactMobile: string | null;
};

export type OfficialRegionNode = {
  id: string;
  label: string;
  officialCode: string;
  officialLevel: "PROVINCE" | "PREFECTURE" | "COUNTY" | "TOWNSHIP";
};

export type DerivedOfficialRegion = {
  sourceReleaseId: string;
  province: { id: string; label: string };
  city: {
    id: string;
    label: string;
    identityKind:
      "OFFICIAL_DIVISION" | "MUNICIPALITY_REPEAT" | "PROVINCE_DIRECT_GROUP";
    officialDivisionId: string | null;
  };
  terminal: OfficialRegionNode & { officialLevel: "COUNTY" | "TOWNSHIP" };
  officialPath: OfficialRegionNode[];
};

export type BrandStoreLocation = {
  id: string;
  brandId: string;
  semanticFactId: string;
  verificationId: string;
  receiptIssuedAt: Date;
  searchInput: string;
  provider: "AMAP";
  providerPlaceId: string;
  providerContractVersion: string;
  verifiedAt: Date;
  placeName: string;
  formattedAddress: string;
  provinceName: string;
  cityName: string | null;
  districtName: string | null;
  townshipName: string | null;
  providerAdcode: string;
  providerTowncode: string | null;
  officialRegion: DerivedOfficialRegion;
  coordinate: {
    longitude: number;
    latitude: number;
    system: "GCJ_02";
  };
  queryLocality: {
    kind: "BUSINESS_AREA" | "ADDRESS_LOCALITY";
    label: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type BrandStoreLocationWrite = Omit<
  BrandStoreLocation,
  "id" | "brandId" | "createdAt" | "updatedAt"
>;

export type BrandProfileView = BrandProfileFields & {
  id: string;
  accountId: string;
  status: "ACTIVE" | "ARCHIVED";
  evaluationFingerprint: string;
  writingContextFingerprint: string;
  revision: number;
  storeLocation: BrandStoreLocation | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BrandReadiness = {
  readyForEvaluation: boolean;
  missingFields: string[];
};

export type BrandArticleInformationReadiness = {
  readyForArticleGeneration: boolean;
  articleInformationMissingFields: string[];
};

export type BrandReferenceDisplay = {
  primaryIndustryLabel: string | null;
  secondaryIndustryLabel: string | null;
};

export type BrandView = BrandProfileView &
  BrandReadiness &
  BrandArticleInformationReadiness &
  BrandReferenceDisplay & { isCurrent: boolean };

export type EditableBrandFields = {
  [Field in keyof BrandProfileFields]?: BrandProfileFields[Field] | null;
};

export type BrandMutationFields = Omit<
  EditableBrandFields,
  "characteristics" | "articleInformation"
> & {
  characteristics?: BrandCharacteristicMutation[];
  articleInformation?: BrandArticleInformation;
};

export type LocationChangeRequest =
  | { action: "REMOVE" }
  | {
      action: "REPLACE";
      verificationReceipt: string;
    };

export type BrandMutationInput = BrandMutationFields & {
  locationChange?: LocationChangeRequest;
};

export type BrandUpdateInput = BrandMutationInput & {
  expectedRevision: number;
};

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
  region: DerivedOfficialRegion;
  storeLocation: {
    semanticFactId: string;
    placeName: string;
    formattedAddress: string;
    coordinate: BrandStoreLocation["coordinate"];
    queryLocality: BrandStoreLocation["queryLocality"];
    source: {
      provider: "AMAP";
      placeId: string;
      contractVersion: string;
      verifiedAt: Date;
    };
  };
  flagshipProductOrService: string;
  characteristics: string[];
};

export type EvaluationReportPurposeBrandView = {
  accountId: string;
  brandId: string;
  companyName: string;
  inputFingerprint: string;
};

export type WriterPurposeBrandView = {
  accountId: string;
  brandId: string;
  revision: number;
  writingContextFingerprint: string;
  companyName: string;
  industry: EvaluationPurposeBrandView["industry"];
  region: DerivedOfficialRegion;
  storeLocation: {
    semanticFactId: string;
    placeName: string;
    formattedAddress: string;
    queryLocality: BrandStoreLocation["queryLocality"];
  };
  flagshipProductOrService: string;
  characteristics: BrandCharacteristic[];
  articleInformation: BrandArticleInformation;
};
