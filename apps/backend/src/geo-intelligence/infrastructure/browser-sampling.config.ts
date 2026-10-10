export type BrowserSamplingConfig =
  | { mode: "ai-provider" }
  | { mode: "execution-center"; accountAlias: string; centerRef: string }
  | {
      mode: "browser-control-plane";
      baseUrl: string;
      bearerToken: string;
      accountId: string;
      requestTimeoutMs: number;
      pollIntervalMs: number;
      collectionDeadlineMs: number;
      maximumWaitMs: number;
    };

export const BROWSER_SAMPLING_CONFIG = Symbol("BROWSER_SAMPLING_CONFIG");
