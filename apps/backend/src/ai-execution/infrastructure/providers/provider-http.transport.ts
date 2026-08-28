export type ProviderHttpRequest = {
  url: string;
  method: "GET" | "POST";
  apiKey: string;
  body?: Record<string, unknown>;
};

export type ProviderHttpResponse = {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: unknown;
};

export class ProviderTransportError extends Error {
  constructor(
    readonly failureClass: "TIMEOUT" | "NETWORK_ERROR",
    readonly retryable: boolean,
  ) {
    super(failureClass);
  }
}

export class ProviderHttpTransport {
  constructor(private readonly timeoutMs: number) {}

  async send(request: ProviderHttpRequest): Promise<ProviderHttpResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: {
          Authorization: `Bearer ${request.apiKey}`,
          Accept: "application/json",
          ...(request.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        signal: controller.signal,
        redirect: "error",
      });
      const rawBody = await response.text();
      return {
        status: response.status,
        ok: response.ok,
        headers: sanitizeResponseHeaders(response.headers),
        body: parseBody(rawBody),
      };
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ProviderTransportError("TIMEOUT", true);
      }
      throw new ProviderTransportError("NETWORK_ERROR", true);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseBody(value: string): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function sanitizeResponseHeaders(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [name, value] of headers.entries()) {
    const normalized = name.toLowerCase();
    if (
      normalized === "set-cookie" ||
      normalized === "www-authenticate" ||
      normalized === "proxy-authenticate"
    ) {
      continue;
    }
    output[normalized] = value;
  }
  return output;
}
