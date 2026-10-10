import type {
  AiAdapterResult,
  ResolvedAiAttemptRequest,
  ResolvedAiRoute,
} from "./ai-attempt.types.js";

export const AI_NATIVE_ATTEMPT_CODEC = Symbol("AI_NATIVE_ATTEMPT_CODEC");

/** Provider semantics only: endpoint routing and credentials belong to execution. */
export type PreparedNativeRequest = ResolvedAiRoute & {
  method: "POST";
  path: "/chat/completions" | "/responses";
  body: Record<string, unknown>;
};

export type RawNativeProviderResponse = {
  httpStatus: number;
  safeHeaders: Record<string, string>;
  bodyEncoding: "utf8" | "base64";
  rawBody: string;
};

/** Pure preparation/consumption. Neither method may perform a physical call. */
export interface AiNativeAttemptCodec {
  prepare(request: ResolvedAiAttemptRequest): PreparedNativeRequest;
  consume(
    request: ResolvedAiAttemptRequest,
    prepared: PreparedNativeRequest,
    response: RawNativeProviderResponse,
  ): AiAdapterResult;
}
