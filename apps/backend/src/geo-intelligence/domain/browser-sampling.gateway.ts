export const BROWSER_SAMPLING_GATEWAY = Symbol("BROWSER_SAMPLING_GATEWAY");

export const BROWSER_SAMPLING_FAILURE_CODES = [
  "NETWORK",
  "REGION_RESTRICTED",
  "AUTH_EXPIRED",
  "VERIFICATION_CHALLENGE",
  "DOM_DRIFT",
  "PLATFORM_SUBMISSION_FAILED",
  "PLATFORM_GENERATION_FAILED",
  "TIMEOUT",
  "ANSWER_ECHOED_QUERY",
  "REMOTE_BROWSER_FAILED",
] as const;

export type BrowserSamplingFailureCode =
  (typeof BROWSER_SAMPLING_FAILURE_CODES)[number];

export type BrowserSamplingCapturedItem = {
  index: number;
  completionStatus: "CAPTURED" | "CAPTURED_LATE";
  answer: string;
  collectionSlaMet: boolean;
  capturedAtMs: number | null;
  timings: Record<string, unknown> | null;
  resetReady: boolean;
  assistantRoleVerified: true;
  nonEchoVerified: true;
};

export type BrowserSamplingFailedItem = {
  index: number;
  completionStatus: "FAILED";
  failureCode: BrowserSamplingFailureCode;
  failureMessage: string | null;
  collectionSlaMet: false;
  capturedAtMs: number | null;
  timings: Record<string, unknown> | null;
  resetReady: boolean;
};

export type BrowserSamplingItem =
  BrowserSamplingCapturedItem | BrowserSamplingFailedItem;

export type BrowserSamplingBatchState =
  | {
      kind: "RUNNING";
      status: string;
    }
  | {
      kind: "TERMINAL";
      status: "SUCCEEDED" | "FAILED" | "CANCELLED";
      items: BrowserSamplingItem[];
      collectionElapsedMs: number | null;
      failureCode: BrowserSamplingFailureCode | null;
      failureMessage: string | null;
    };

export interface BrowserSamplingGateway {
  submitBatch(input: {
    platform: string;
    accountId: string;
    prompts: string[];
    idempotencyKey: string;
    collectionDeadlineMs: number;
  }): Promise<{ externalTaskId: string }>;
  readBatch(externalTaskId: string): Promise<BrowserSamplingBatchState>;
}

export class BrowserSamplingTransportError extends Error {}

export function normalizeBrowserSamplingFailureCode(
  value: unknown,
): BrowserSamplingFailureCode {
  return typeof value === "string" &&
    (BROWSER_SAMPLING_FAILURE_CODES as readonly string[]).includes(value)
    ? (value as BrowserSamplingFailureCode)
    : "REMOTE_BROWSER_FAILED";
}
