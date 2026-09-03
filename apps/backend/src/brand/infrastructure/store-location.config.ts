export type StoreLocationRuntimeConfig = {
  mode: "disabled" | "deterministic" | "amap";
  receiptSigningSecret: string;
  receiptTtlSeconds: number;
  requestTimeoutMs: number;
  amapBaseUrl: string;
  amapWebServiceKey: string;
};

export const STORE_LOCATION_CONFIG = Symbol("STORE_LOCATION_CONFIG");
