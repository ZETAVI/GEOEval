import type { Dispatcher } from "undici";

export type AlipayTransportCode =
  | "REDIRECT"
  | "DESTINATION"
  | "RESPONSE_SIZE"
  | "RESPONSE_ENCODING"
  | "AUTH_HEADERS"
  | "DEADLINE"
  | "ABORTED";
export class AlipayTransportError extends Error {
  constructor(readonly code: AlipayTransportCode) {
    super(code);
  }
}
export const ALIPAY_RESPONSE_BYTES = 128 * 1024;

/** One SDK call owns its connection pool, including pre-connect cancellation. */
export function alipayCallTransport(
  createPool: (signal: AbortSignal) => Dispatcher,
  input: {
    origin: string;
    path: string;
    timeoutMs: number;
    signal?: AbortSignal;
    certificateSn?: string;
  },
) {
  const cancellation = new AbortController();
  const pool = createPool(cancellation.signal);
  let controller: Dispatcher.DispatchController | undefined;
  let error: AlipayTransportError | undefined;
  let bytes = 0;
  let dispatched = false;
  const deadline = performance.now() + input.timeoutMs;
  const abort = (code: AlipayTransportCode) => {
    error ??= new AlipayTransportError(code);
    cancellation.abort(error);
    controller?.abort(error);
  };
  const onAbort = () => abort("ABORTED");
  const timer = setTimeout(() => abort("DEADLINE"), input.timeoutMs);
  timer.unref();
  input.signal?.addEventListener("abort", onAbort, { once: true });
  if (input.signal?.aborted) onAbort();
  function check() {
    if (performance.now() >= deadline) abort("DEADLINE");
    if (error) throw error;
  }
  async function finish() {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onAbort);
    await pool.destroy();
  }
  const dispatcher = pool.compose((dispatch) => (options, handler) => {
    check();
    if (
      dispatched ||
      String(options.origin) !== input.origin ||
      options.path !== input.path ||
      options.method !== "POST"
    ) {
      abort("DESTINATION");
      throw error;
    }
    dispatched = true;
    // SDK/urllib use a header object; Undici may normalize it to flat pairs.
    const requestHeaders = options.headers;
    const headers = Array.isArray(requestHeaders)
      ? Object.fromEntries(
          Array.from({ length: requestHeaders.length / 2 }, (_, i) => [
            requestHeaders[i * 2],
            requestHeaders[i * 2 + 1],
          ]),
        )
      : { ...requestHeaders };
    headers["accept-encoding"] = "identity";
    return dispatch(
      { ...options, headers, idempotent: false },
      {
        onRequestStart(c, context) {
          controller = c;
          if (error) {
            c.abort(error);
            return;
          }
          handler.onRequestStart?.(c, context);
        },
        onResponseStart(c, status, responseHeaders, message) {
          if (status >= 300 && status < 400) {
            abort("REDIRECT");
            return;
          }
          const encoding = responseHeaders["content-encoding"];
          if (encoding !== undefined && encoding !== "identity") {
            abort("RESPONSE_ENCODING");
            return;
          }
          const length = responseHeaders["content-length"];
          if (
            length !== undefined &&
            (typeof length !== "string" ||
              !/^\d+$/.test(length) ||
              BigInt(length) > BigInt(ALIPAY_RESPONSE_BYTES))
          ) {
            abort("RESPONSE_SIZE");
            return;
          }
          if (status === 200) {
            for (const name of [
              "alipay-signature",
              "alipay-timestamp",
              "alipay-nonce",
            ]) {
              const value = responseHeaders[name];
              if (
                typeof value !== "string" ||
                value.length === 0 ||
                value.length > 1024
              ) {
                abort("AUTH_HEADERS");
                return;
              }
            }
            if (
              !/^\d+$/.test(responseHeaders["alipay-timestamp"] as string) ||
              (input.certificateSn &&
                responseHeaders["alipay-sn"] !== input.certificateSn)
            ) {
              abort("AUTH_HEADERS");
              return;
            }
          }
          handler.onResponseStart?.(c, status, responseHeaders, message);
        },
        onResponseData(c, chunk) {
          bytes += chunk.length;
          if (bytes > ALIPAY_RESPONSE_BYTES) {
            abort("RESPONSE_SIZE");
            return;
          }
          handler.onResponseData?.(c, chunk);
        },
        onResponseEnd(c, trailers) {
          handler.onResponseEnd?.(c, trailers);
        },
        onResponseError(c, cause) {
          handler.onResponseError?.(c, error ?? cause);
        },
        onRequestUpgrade(c) {
          abort("DESTINATION");
          c.abort(error!);
        },
      },
    );
  });
  return { dispatcher, check, finish };
}

/** SDK and urllib wrap causes. Read only our own error type, never remote text. */
export function transportFailure(
  value: unknown,
): AlipayTransportError | undefined {
  let current = value;
  for (let i = 0; i < 5 && current instanceof Error; i++) {
    if (current instanceof AlipayTransportError) return current;
    current = current.cause;
  }
  return undefined;
}
