export const STORE_LOCATION_PROVIDER = Symbol("STORE_LOCATION_PROVIDER");

export type StoreLocationProviderFailureCode =
  | "PLACE_NOT_FOUND"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_CONFIGURATION"
  | "PROVIDER_CAPACITY";

export class StoreLocationProviderError extends Error {
  constructor(
    readonly code: StoreLocationProviderFailureCode,
    message: string,
  ) {
    super(message);
  }
}

export type ProviderPlaceEvidence = {
  providerPlaceId: string;
  placeName: string;
  formattedAddress: string;
  coordinate: { longitude: number; latitude: number; system: "GCJ_02" };
  provinceName: string;
  cityName: string | null;
  districtName: string | null;
  townshipName: string | null;
  adcode: string;
  towncode: string | null;
  businessAreaLabels: string[];
  providerContractVersion: string;
  verifiedAt: Date;
};

export interface StoreLocationProvider {
  resolveSelectedPlace(input: {
    providerPlaceId: string;
  }): Promise<ProviderPlaceEvidence>;
}
