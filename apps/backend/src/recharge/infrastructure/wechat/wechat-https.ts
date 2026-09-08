import { request as httpsRequest, type RequestOptions } from "node:https";
import type { ClientRequest, IncomingMessage } from "node:http";
import { performance } from "node:perf_hooks";
import { requireProtocol, WechatProtocolError } from "./wechat-protocol.js";

export const WECHAT_API_ORIGINS = [
  "https://api.mch.weixin.qq.com",
  "https://api2.mch.weixin.qq.com",
] as const;
export type WechatHttpRequest = {
  method: "GET" | "POST";
  path: string;
  body: Buffer;
  headers: Readonly<Record<string, string>>;
};
export type WechatHttpResponse = {
  status: number;
  headers: Readonly<Record<string, readonly string[] | undefined>>;
  body: Buffer;
};
export type WechatExchange = (
  input: WechatHttpRequest,
) => Promise<WechatHttpResponse>;
type RequestFactory = (
  options: RequestOptions,
  receive: (response: IncomingMessage) => void,
) => ClientRequest;

/** Internal I/O seam. Application assembly uses defaults; controlled tests replace the request factory. */
export function createWechatHttpsExchange(
  options: {
    origin?: string;
    timeoutMs?: number;
    maxResponseBytes?: number;
  } = {},
  requestFactory: RequestFactory = httpsRequest,
): WechatExchange {
  const origin = options.origin ?? WECHAT_API_ORIGINS[0];
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxResponseBytes = options.maxResponseBytes ?? 2 * 1024 * 1024;
  requireProtocol(
    WECHAT_API_ORIGINS.some((value) => value === origin) &&
      Number.isInteger(timeoutMs) &&
      timeoutMs > 0 &&
      timeoutMs <= 60000 &&
      Number.isInteger(maxResponseBytes) &&
      maxResponseBytes > 0 &&
      maxResponseBytes <= 4 * 1024 * 1024,
    "INVALID_INPUT",
  );
  return async (input) => {
    requireProtocol(
      /^\/v3\/[\x21-\x7e]+$/.test(input.path) &&
        !input.path.includes("#") &&
        input.body.length <= 16384,
      "INVALID_INPUT",
    );
    const body = Buffer.from(input.body);
    return new Promise((resolve, reject) => {
      const started = performance.now();
      let req: ClientRequest | undefined, res: IncomingMessage | undefined;
      let finished = false;
      const timer = setTimeout(() => fail("TIMEOUT"), timeoutMs);
      const fail = (
        code: ConstructorParameters<typeof WechatProtocolError>[0],
      ) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        reject(new WechatProtocolError(code));
        res?.destroy();
        req?.destroy();
      };
      try {
        req = requestFactory(
          {
            protocol: "https:",
            hostname: new URL(origin).hostname,
            port: 443,
            method: input.method,
            path: input.path,
            agent: false,
            rejectUnauthorized: true,
            maxHeaderSize: 16384,
            insecureHTTPParser: false,
            headers: {
              ...input.headers,
              "Content-Length": String(body.length),
              "Accept-Encoding": "identity",
            },
          },
          (response) => {
            res = response;
            response.on("error", () => fail("RESPONSE_INTERRUPTED"));
            response.on("close", () => {
              if (!response.complete) fail("RESPONSE_INTERRUPTED");
            });
            const status = response.statusCode ?? 0;
            // Error bodies are not payment facts; do not parse, log, redirect or retry them.
            if (status < 200 || status >= 300) {
              finished = true;
              clearTimeout(timer);
              resolve({ status, headers: {}, body: Buffer.alloc(0) });
              response.destroy();
              return;
            }
            const encoding = response.headersDistinct["content-encoding"];
            if (
              encoding &&
              (encoding.length !== 1 || encoding[0] !== "identity")
            ) {
              fail("CONTENT_ENCODING");
              return;
            }
            const length = response.headersDistinct["content-length"];
            if (
              length &&
              (length.length !== 1 ||
                !/^\d+$/.test(length[0]!) ||
                !Number.isSafeInteger(Number(length[0])) ||
                Number(length[0]) > maxResponseBytes)
            ) {
              fail("RESPONSE_SIZE");
              return;
            }
            let size = 0;
            const chunks: Buffer[] = [];
            response.on("data", (chunk: Buffer) => {
              size += chunk.length;
              if (size > maxResponseBytes) {
                fail("RESPONSE_SIZE");
                return;
              }
              if (!finished) chunks.push(chunk);
            });
            response.on("end", () => {
              if (finished) return;
              if (!response.complete) {
                fail("RESPONSE_INTERRUPTED");
                return;
              }
              if (performance.now() - started >= timeoutMs) {
                fail("TIMEOUT");
                return;
              }
              finished = true;
              clearTimeout(timer);
              resolve({
                status,
                headers: response.headersDistinct,
                body: Buffer.concat(chunks),
              });
            });
          },
        );
        req.on("error", () => fail("TRANSPORT"));
        req.on("upgrade", (_response, socket) => {
          socket.destroy();
          fail("REDIRECT");
        });
        req.end(body);
      } catch {
        fail("TRANSPORT");
      }
    });
  };
}
