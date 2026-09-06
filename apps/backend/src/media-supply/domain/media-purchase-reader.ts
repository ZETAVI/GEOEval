import type { MediaPlatformQuote } from "./media-supply.types.js";
export interface MediaPurchaseReader {
  platforms(ids: string[]): Promise<MediaPlatformQuote[]>;
}
