import type {
  ExecutionCenterEvent,
  ExecutionCenterSnapshot,
  ExecutionCenterStoredRequest,
  ExecutionCenterTaskSnapshot,
  ExecutionCenterWebTaskSnapshot,
  ExecutionCenterWebStoredRequest,
} from "../domain/execution-center-receipt.repository.js";

export const EXECUTION_CENTER_CLIENT = Symbol("EXECUTION_CENTER_CLIENT");
export type ExecutionCenterClientConfig = {
  centerRef: string;
  baseUrl: string;
  callerToken: string;
  httpTimeoutMs?: number;
};

export class ExecutionCenterClientError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number | undefined = undefined,
    readonly outcomeUnknown = false,
  ) {
    // Never echo a configured URL/token, upstream body, prompt, or native output.
    super(code);
  }
}

const MAX_RESPONSE_BYTES = 32 * 1_024 * 1_024;
const MAX_FRAME_CHARACTERS = 64 * 1_024;
const KNOWN_SUBMISSION_REJECTIONS = new Set([400, 401, 403, 404, 409, 413]);
const ITEM_STATES = new Set([
  "QUEUED",
  "DISPATCHING",
  "RUNNING",
  "RESULT_AVAILABLE",
  "FAILED",
  "OUTCOME_UNKNOWN",
  "CANCELLED",
]);

/** Technical one-call client. Business retries, deadlines and receipt recovery stay outside. */
export class ExecutionCenterClient {
  readonly centerRef: string;
  private readonly baseUrl: URL;
  private readonly callerToken: string;
  private readonly timeoutMs: number;

  constructor(
    config: ExecutionCenterClientConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.centerRef = config.centerRef;
    this.baseUrl = validateConfig(config);
    this.callerToken = config.callerToken;
    this.timeoutMs = config.httpTimeoutMs ?? 5_000;
  }

  async submit(
    idempotencyKey: string,
    request: ExecutionCenterStoredRequest,
  ): Promise<ExecutionCenterSnapshot> {
    if (request.channel !== "api")
      throw new ExecutionCenterClientError("INVALID_REQUEST");
    const task = await this.submitTask(idempotencyKey, request);
    if (task.channel !== "api")
      throw new ExecutionCenterClientError("INVALID_RESPONSE", undefined, true);
    return task;
  }

  async submitWeb(
    idempotencyKey: string,
    request: ExecutionCenterWebStoredRequest,
  ): Promise<ExecutionCenterWebTaskSnapshot> {
    if (request.channel !== "web")
      throw new ExecutionCenterClientError("INVALID_REQUEST");
    const task = await this.submitTask(idempotencyKey, request);
    if (task.channel !== "web")
      throw new ExecutionCenterClientError("INVALID_RESPONSE", undefined, true);
    return task;
  }

  private async submitTask(
    idempotencyKey: string,
    request: ExecutionCenterStoredRequest | ExecutionCenterWebStoredRequest,
  ): Promise<ExecutionCenterTaskSnapshot> {
    if (!identifier(idempotencyKey) || !validRequestIdentity(request)) {
      throw new ExecutionCenterClientError("INVALID_REQUEST");
    }
    let body: string;
    try {
      body = JSON.stringify(request);
    } catch {
      throw new ExecutionCenterClientError("INVALID_REQUEST");
    }
    const task = await this.snapshotRequest("api/v2/executions", {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
        "Content-Type": "application/json",
      },
      body,
    });
    if (
      task.channel !== request.channel ||
      task.callerRequestRef !== request.callerRequestRef ||
      task.deadlineAt !== request.deadlineAt ||
      task.items.length !== request.items.length ||
      task.items.some(
        (item, index) => item.itemId !== request.items[index]!.itemId,
      )
    ) {
      throw new ExecutionCenterClientError("INVALID_RESPONSE", undefined, true);
    }
    return task;
  }

  async read(taskId: string): Promise<ExecutionCenterSnapshot> {
    const task = await this.readTask(taskId);
    if (task.channel !== "api")
      throw new ExecutionCenterClientError("INVALID_RESPONSE");
    return task;
  }

  async readTask(taskId: string): Promise<ExecutionCenterTaskSnapshot> {
    if (!identifier(taskId))
      throw new ExecutionCenterClientError("INVALID_REQUEST");
    const task = await this.snapshotRequest(
      `api/v2/executions/${encodeURIComponent(taskId)}`,
      { method: "GET" },
    );
    if (task.taskId !== taskId)
      throw new ExecutionCenterClientError("INVALID_RESPONSE");
    return task;
  }

  async readWeb(taskId: string): Promise<ExecutionCenterWebTaskSnapshot> {
    const task = await this.readTask(taskId);
    if (task.channel !== "web")
      throw new ExecutionCenterClientError("INVALID_RESPONSE");
    return task;
  }

  /** One SSE connection; await each committed consumer before reading the next frame. */
  async events(
    after: number,
    onEvent: (event: ExecutionCenterEvent) => Promise<void>,
    signal: AbortSignal,
  ): Promise<void> {
    if (!safeInteger(after, 0))
      throw new ExecutionCenterClientError("INVALID_CURSOR");
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) controller.abort();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let callbackFailed = false;
    try {
      const response = await this.fetchImpl(
        this.url(`api/v2/events?after=${after}`),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.callerToken}`,
            Accept: "text/event-stream",
            ...(after > 0 ? { "Last-Event-ID": String(after) } : {}),
          },
          redirect: "manual",
          cache: "no-store",
          signal: controller.signal,
        },
      );
      clearTimeout(timeout); // timeout limits the handshake, not a healthy resident stream.
      if (response.status !== 200) {
        await response.body?.cancel().catch(() => undefined);
        throw new ExecutionCenterClientError(
          response.status >= 300 && response.status < 400
            ? "REDIRECT_REJECTED"
            : "HTTP_REJECTED",
          response.status,
        );
      }
      if (
        response.headers
          .get("content-type")
          ?.split(";", 1)[0]
          ?.trim()
          .toLowerCase() !== "text/event-stream" ||
        !response.body
      ) {
        await response.body?.cancel().catch(() => undefined);
        throw new ExecutionCenterClientError("INVALID_EVENT_STREAM");
      }
      reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let line = "";
      let skipLf = false;
      let frameLength = 0;
      let eventType = "";
      let eventId = "";
      let data: string[] = [];
      let lastDelivered = after;
      const processLine = async (value: string): Promise<void> => {
        if (value === "") {
          const frame = { type: eventType, id: eventId, data: data.join("\n") };
          eventType = "";
          eventId = "";
          data = [];
          frameLength = 0;
          // ready/comment frames never advance or fabricate a durable cursor.
          if (frame.type !== "execution" || frame.data === "") return;
          const event = parseEvent(frame.id, frame.data);
          if (event.cursor <= lastDelivered)
            throw new ExecutionCenterClientError("INVALID_EVENT_CURSOR");
          try {
            await onEvent(event);
          } catch (error) {
            callbackFailed = true;
            throw error;
          }
          lastDelivered = event.cursor;
          return;
        }
        frameLength += value.length;
        if (frameLength > MAX_FRAME_CHARACTERS)
          throw new ExecutionCenterClientError("EVENT_FRAME_TOO_LARGE");
        if (value.startsWith(":")) return;
        const separator = value.indexOf(":");
        const field = separator < 0 ? value : value.slice(0, separator);
        let content = separator < 0 ? "" : value.slice(separator + 1);
        if (content.startsWith(" ")) content = content.slice(1);
        if (field === "event") eventType = content;
        else if (field === "id" && !content.includes("\u0000"))
          eventId = content;
        else if (field === "data") data.push(content);
      };
      const consumeText = async (text: string): Promise<void> => {
        for (const character of text) {
          if (signal.aborted) return;
          if (skipLf) {
            skipLf = false;
            if (character === "\n") continue;
          }
          if (character === "\r" || character === "\n") {
            await processLine(line);
            line = "";
            skipLf = character === "\r";
          } else {
            line += character;
            if (line.length + frameLength > MAX_FRAME_CHARACTERS)
              throw new ExecutionCenterClientError("EVENT_FRAME_TOO_LARGE");
          }
        }
      };
      while (!signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) {
          await consumeText(decoder.decode());
          // WHATWG: discard a trailing incomplete event; only blank lines dispatch.
          return;
        }
        await consumeText(decoder.decode(chunk.value, { stream: true }));
      }
    } catch (error) {
      if (signal.aborted) return;
      if (callbackFailed || error instanceof ExecutionCenterClientError)
        throw error;
      throw new ExecutionCenterClientError(
        controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR",
      );
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      controller.abort();
      if (reader) {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    }
  }

  private url(path: string): URL {
    return new URL(path, this.baseUrl);
  }

  private async snapshotRequest(
    path: string,
    request: {
      method: "GET" | "POST";
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<ExecutionCenterTaskSnapshot> {
    const isSubmission = request.method === "POST";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.url(path), {
        ...request,
        headers: {
          Authorization: `Bearer ${this.callerToken}`,
          Accept: "application/json",
          ...request.headers,
        },
        redirect: "manual",
        signal: controller.signal,
      });
      if (
        response.status !== 200 &&
        !(isSubmission && response.status === 202)
      ) {
        await response.body?.cancel().catch(() => undefined);
        const redirect = response.status >= 300 && response.status < 400;
        throw new ExecutionCenterClientError(
          redirect ? "REDIRECT_REJECTED" : "HTTP_REJECTED",
          response.status,
          isSubmission && !KNOWN_SUBMISSION_REJECTIONS.has(response.status),
        );
      }
      const raw = await boundedBody(response, MAX_RESPONSE_BYTES, isSubmission);
      let wrapper: unknown;
      try {
        wrapper = JSON.parse(raw);
      } catch {
        throw new ExecutionCenterClientError(
          "INVALID_RESPONSE",
          response.status,
          isSubmission,
        );
      }
      if (
        !record(wrapper) ||
        wrapper.contractVersion !== "execution.v1" ||
        !validSnapshot(wrapper.task)
      ) {
        throw new ExecutionCenterClientError(
          "INVALID_RESPONSE",
          response.status,
          isSubmission,
        );
      }
      return wrapper.task;
    } catch (error) {
      if (error instanceof ExecutionCenterClientError) throw error;
      throw new ExecutionCenterClientError(
        controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR",
        undefined,
        isSubmission,
      );
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }
}

async function boundedBody(
  response: Response,
  limit: number,
  unknown: boolean,
): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit)
        throw new ExecutionCenterClientError(
          "RESPONSE_TOO_LARGE",
          response.status,
          unknown,
        );
      chunks.push(chunk.value);
    }
    const merged = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(merged);
    } catch {
      throw new ExecutionCenterClientError(
        "INVALID_RESPONSE",
        response.status,
        unknown,
      );
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function validateConfig(config: ExecutionCenterClientConfig): URL {
  let url: URL;
  try {
    url = new URL(config.baseUrl);
  } catch {
    throw new ExecutionCenterClientError("INVALID_CENTER_CONFIG");
  }
  if (
    !identifier(config.centerRef) ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname))
    ) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    typeof config.callerToken !== "string" ||
    !config.callerToken.trim() ||
    /[\r\n]/.test(config.callerToken) ||
    config.callerToken.length > 8_192 ||
    !safeInteger(config.httpTimeoutMs ?? 5_000, 1)
  ) {
    throw new ExecutionCenterClientError("INVALID_CENTER_CONFIG");
  }
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

function validRequestIdentity(
  value: unknown,
): value is ExecutionCenterStoredRequest | ExecutionCenterWebStoredRequest {
  return (
    record(value) &&
    value.contractVersion === "execution.v1" &&
    ["api", "web"].includes(String(value.channel)) &&
    identifier(value.callerRequestRef) &&
    safeInteger(value.deadlineAt, 1) &&
    Array.isArray(value.items) &&
    value.items.length >= 1 &&
    value.items.length <= (value.channel === "api" ? 1 : 4) &&
    value.items.every(
      (item: unknown) => record(item) && identifier(item.itemId),
    ) &&
    new Set(value.items.map((item: Record<string, unknown>) => item.itemId))
      .size === value.items.length
  );
}
function validSnapshot(value: unknown): value is ExecutionCenterTaskSnapshot {
  if (!validRequestIdentity(value) || !identifier(value.taskId)) return false;
  return value.items.every(
    (item: unknown) =>
      record(item) &&
      typeof item.state === "string" &&
      ITEM_STATES.has(item.state),
  );
}
function parseEvent(id: string, data: string): ExecutionCenterEvent {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    throw new ExecutionCenterClientError("INVALID_EXECUTION_EVENT");
  }
  if (
    !/^[1-9][0-9]*$/.test(id) ||
    !record(value) ||
    !safeInteger(value.cursor, 1) ||
    Number(id) !== value.cursor ||
    (value.seq !== undefined && value.seq !== value.cursor) ||
    !identifier(value.taskId) ||
    !identifier(value.itemId) ||
    !identifier(value.callerRequestRef) ||
    !["api", "web"].includes(value.channel as string) ||
    typeof value.type !== "string" ||
    !/^[A-Z][A-Z0-9_]{0,63}$/.test(value.type) ||
    !safeInteger(value.at, 0)
  ) {
    throw new ExecutionCenterClientError("INVALID_EXECUTION_EVENT");
  }
  const event: ExecutionCenterEvent = {
    cursor: value.cursor,
    seq: value.cursor,
    taskId: value.taskId,
    itemId: value.itemId,
    callerRequestRef: value.callerRequestRef,
    channel: value.channel as "api" | "web",
    type: value.type,
    at: value.at,
  };
  for (const key of ["physicalAttemptId", "stage", "code"] as const) {
    if (value[key] !== undefined) {
      if (!identifier(value[key]))
        throw new ExecutionCenterClientError("INVALID_EXECUTION_EVENT");
      event[key] = value[key];
    }
  }
  for (const key of ["contentChars", "receivedBytes"] as const) {
    if (value[key] !== undefined) {
      if (!safeInteger(value[key], 0))
        throw new ExecutionCenterClientError("INVALID_EXECUTION_EVENT");
      event[key] = value[key];
    }
  }
  return event;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function identifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/.test(value)
  );
}
function safeInteger(value: unknown, minimum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum;
}
