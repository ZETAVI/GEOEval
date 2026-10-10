import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, describe, expect, it } from "vitest";

import type {
  ExecutionCenterEvent,
  ExecutionCenterSnapshot,
  ExecutionCenterStoredRequest,
} from "../src/ai-execution/domain/execution-center-receipt.repository.js";
import {
  ExecutionCenterClient,
  ExecutionCenterClientError,
} from "../src/ai-execution/infrastructure/execution-center.client.js";

const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe("execution-center one-call HTTP boundary", () => {
  it("returns durable acceptance without waiting and forwards native parameters unchanged", async () => {
    let receivedBody: unknown;
    let receivedHeaders: IncomingMessage["headers"];
    let calls = 0;
    const baseUrl = await localServer(async (incoming, response) => {
      calls++;
      receivedBody = JSON.parse(await body(incoming));
      receivedHeaders = incoming.headers;
      json(response, 202, wrapper(snapshot("QUEUED")));
    });
    const original = request();
    original.api = {
      endpointRef: "configured-provider",
      endpointVersion: "1",
      operation: "chat",
      bodyEncoding: "json",
      body: {
        model: "fixture-model",
        messages: [
          { role: "system", content: "精确系统上下文" },
          { role: "user", content: " 原始问题\n " },
        ],
        temperature: 0.6,
        enable_search: false,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
      },
      headers: { "Content-Type": "application/json" },
    };
    const task = await client(baseUrl).submit("geo-key", original);
    expect(task.items[0]!.state).toBe("QUEUED");
    expect(receivedBody).toEqual(original);
    expect(receivedHeaders!).toMatchObject({
      authorization: "Bearer fixture-caller-token",
      "idempotency-key": "geo-key",
    });
    expect(JSON.stringify(receivedBody)).not.toContain("fixture-caller-token");
    expect(calls).toBe(1);
  });

  it("accepts an idempotent 200 replay and reads native Unicode/BOM/whitespace without rewriting", async () => {
    const ready = snapshot("RESULT_AVAILABLE");
    ready.items[0]!.result = {
      kind: "api",
      transportStatus: "RESPONSE_RECEIVED",
      httpStatus: 429,
      safeHeaders: {},
      bodyEncoding: "utf8",
      rawBody: '\uFEFF \n{"城市":"广州☕"}\n ',
    };
    const methods: string[] = [];
    const baseUrl = await localServer((incoming, response) => {
      methods.push(incoming.method!);
      json(response, 200, wrapper(ready));
    });
    expect(await client(baseUrl).submit("same-key", request())).toEqual(ready);
    expect(await client(baseUrl).read("execution-fixture")).toEqual(ready);
    expect(methods).toEqual(["POST", "GET"]);
  });

  it.each([400, 401, 403, 404, 409, 413])(
    "classifies definite %s submission rejection without echoing the body or retrying",
    async (status) => {
      let calls = 0;
      const baseUrl = await localServer((_, response) => {
        calls++;
        json(response, status, {
          error: "sensitive-upstream-body fixture-caller-token",
        });
      });
      const error = await rejection(
        client(baseUrl).submit("one-key", request()),
      );
      expect(error).toMatchObject({
        code: "HTTP_REJECTED",
        httpStatus: status,
        outcomeUnknown: false,
      });
      expect(error.message).not.toContain("sensitive");
      expect(error.message).not.toContain("fixture-caller-token");
      expect(calls).toBe(1);
    },
  );

  it("keeps a 5xx or malformed accepted POST outcome unknown, while GET failure remains a read failure", async () => {
    let status = 503;
    const baseUrl = await localServer((_, response) =>
      json(response, status, { contractVersion: "wrong", task: snapshot() }),
    );
    expect(
      await rejection(client(baseUrl).submit("one-key", request())),
    ).toMatchObject({ httpStatus: 503, outcomeUnknown: true });
    expect(
      await rejection(client(baseUrl).read("execution-fixture")),
    ).toMatchObject({ httpStatus: 503, outcomeUnknown: false });
    status = 202;
    expect(
      await rejection(client(baseUrl).submit("one-key", request())),
    ).toMatchObject({ code: "INVALID_RESPONSE", outcomeUnknown: true });
  });

  it("does not follow redirects or send the configured token to their target", async () => {
    let redirectedCalls = 0;
    const target = await localServer((_, response) => {
      redirectedCalls++;
      json(response, 200, wrapper(snapshot()));
    });
    const baseUrl = await localServer((_, response) => {
      response.writeHead(307, { Location: target });
      response.end();
    });
    expect(
      await rejection(client(baseUrl).submit("one-key", request())),
    ).toMatchObject({ code: "REDIRECT_REJECTED", outcomeUnknown: true });
    expect(
      await rejection(client(baseUrl).read("execution-fixture")),
    ).toMatchObject({ code: "REDIRECT_REJECTED", outcomeUnknown: false });
    expect(redirectedCalls).toBe(0);
  });

  it("bounds POST timeouts and treats a dropped response as unknown without hidden retry", async () => {
    let calls = 0;
    let hang = true;
    const baseUrl = await localServer((_, response) => {
      calls++;
      if (!hang) response.destroy();
    });
    expect(
      await rejection(client(baseUrl, 25).submit("same-key", request())),
    ).toMatchObject({ code: "TIMEOUT", outcomeUnknown: true });
    hang = false;
    expect(
      await rejection(client(baseUrl).submit("same-key", request())),
    ).toMatchObject({ code: "NETWORK_ERROR", outcomeUnknown: true });
    expect(calls).toBe(2); // exactly the two explicit caller invocations.
  });

  it("rejects task/item/channel mismatches rather than accepting an unrelated response", async () => {
    let task = snapshot();
    const baseUrl = await localServer((_, response) =>
      json(response, 200, wrapper(task)),
    );
    task = { ...task, taskId: "other-task" };
    expect(
      await rejection(client(baseUrl).read("execution-fixture")),
    ).toMatchObject({ code: "INVALID_RESPONSE", outcomeUnknown: false });
    task = { ...snapshot(), callerRequestRef: "other-caller-ref" };
    expect(
      await rejection(client(baseUrl).submit("same-key", request())),
    ).toMatchObject({ code: "INVALID_RESPONSE", outcomeUnknown: true });
    task = {
      ...snapshot(),
      items: [{ itemId: "wrong-item", state: "QUEUED" }],
    };
    expect(
      await rejection(client(baseUrl).submit("same-key", request())),
    ).toMatchObject({ code: "INVALID_RESPONSE", outcomeUnknown: true });
    task = { ...snapshot(), items: [] };
    expect(
      await rejection(client(baseUrl).submit("same-key", request())),
    ).toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("fails invalid configuration/request before fetch and bounds untrusted response size", async () => {
    for (const baseUrl of [
      "http://control.example",
      "http://127.0.0.1.evil",
      "https://user:pass@control.example",
      "https://control.example/?token=secret",
      "https://control.example/#fragment",
    ]) {
      expect(() => client(baseUrl)).toThrow("INVALID_CENTER_CONFIG");
    }
    const https = new ExecutionCenterClient({
      centerRef: "configured",
      baseUrl: "https://control.example",
      callerToken: "fixture",
    });
    expect(https.centerRef).toBe("configured");
    let called = false;
    const noSend: typeof fetch = async () => {
      called = true;
      throw new Error("not called");
    };
    const local = new ExecutionCenterClient(
      {
        centerRef: "configured",
        baseUrl: "http://localhost",
        callerToken: "fixture",
      },
      noSend,
    );
    await expect(local.submit("bad key", request())).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      outcomeUnknown: false,
    });
    await expect(local.read("bad id")).rejects.toMatchObject({
      code: "INVALID_REQUEST",
    });
    expect(called).toBe(false);
    let cancelled = false;
    const huge: typeof fetch = async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            for (let index = 0; index < 33; index++)
              controller.enqueue(new Uint8Array(1_024 * 1_024));
          },
          cancel() {
            cancelled = true;
          },
        }),
        { status: 200 },
      );
    await expect(
      new ExecutionCenterClient(
        {
          centerRef: "configured",
          baseUrl: "http://localhost",
          callerToken: "fixture",
        },
        huge,
      ).submit("one-key", request()),
    ).rejects.toMatchObject({
      code: "RESPONSE_TOO_LARGE",
      outcomeUnknown: true,
    });
    expect(cancelled).toBe(true);
  });
});

describe("execution-center serialized SSE boundary", () => {
  it("handles UTF8 chunk boundaries, CR/LF/CRLF and multiline data; ready cannot move the cursor", async () => {
    let headers: IncomingMessage["headers"];
    let url: string;
    const baseUrl = await localServer(async (incoming, response) => {
      headers = incoming.headers;
      url = incoming.url!;
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
      });
      const payload = {
        ...event(8),
        note: "广州☕",
        rawBody: "not-a-safe-notification-field",
      };
      const bytes = Buffer.from(
        `\uFEFF: heartbeat\r\nevent: ready\rid: 999\rdata: {"cursor":999}\r\revent: execution\r\nid: 8\r\ndata: {\r\ndata: ${JSON.stringify(payload).slice(1)}\r\n\r\n`,
      );
      const split = bytes.indexOf(Buffer.from("州")) + 1;
      response.write(bytes.subarray(0, split));
      await delay(10);
      response.end(bytes.subarray(split));
    });
    const events: ExecutionCenterEvent[] = [];
    await client(baseUrl).events(
      2,
      async (value) => {
        events.push(value);
      },
      new AbortController().signal,
    );
    expect(events).toEqual([event(8)]);
    expect(events[0]).not.toHaveProperty("rawBody");
    expect(headers!).toMatchObject({
      authorization: "Bearer fixture-caller-token",
      "last-event-id": "2",
    });
    expect(url!).toBe("/api/v2/events?after=2");
  });

  it("delivers an early completion notification before the submission ACK", async () => {
    const ack = deferred();
    const notify = deferred();
    const connected = deferred();
    const order: string[] = [];
    const baseUrl = await localServer(async (incoming, response) => {
      if (incoming.url?.startsWith("/api/v2/events")) {
        response.writeHead(200, { "Content-Type": "text/event-stream" });
        response.flushHeaders();
        connected.resolve();
        await notify.promise;
        response.end(frame(event(1)));
      } else {
        await body(incoming);
        notify.resolve();
        await ack.promise;
        json(response, 202, wrapper(snapshot()));
      }
    });
    const reader = client(baseUrl).events(
      0,
      async () => {
        order.push("event");
      },
      new AbortController().signal,
    );
    await connected.promise;
    const submit = client(baseUrl)
      .submit("one-key", request())
      .then(() => order.push("ack"));
    await reader;
    expect(order).toEqual(["event"]);
    ack.resolve();
    await submit;
    expect(order).toEqual(["event", "ack"]);
  });

  it("awaits the durable consumer serially and stops after a callback failure so the caller can replay", async () => {
    let connections = 0;
    const cursors: string[] = [];
    const baseUrl = await localServer((incoming, response) => {
      connections++;
      cursors.push(incoming.url!);
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.end(frame(event(1)) + frame(event(2)));
    });
    const firstStarted = deferred();
    const release = deferred();
    const received: number[] = [];
    const operation = client(baseUrl).events(
      0,
      async (value) => {
        received.push(value.cursor);
        if (value.cursor === 1) {
          firstStarted.resolve();
          await release.promise;
        }
      },
      new AbortController().signal,
    );
    await firstStarted.promise;
    await delay(20);
    expect(received).toEqual([1]);
    release.resolve();
    await operation;
    expect(received).toEqual([1, 2]);
    const failed: number[] = [];
    await expect(
      client(baseUrl).events(
        0,
        async (value) => {
          failed.push(value.cursor);
          throw new Error("controlled consumer failure");
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow("controlled consumer failure");
    expect(failed).toEqual([1]);
    const replayed: number[] = [];
    await client(baseUrl).events(
      0,
      async (value) => {
        replayed.push(value.cursor);
      },
      new AbortController().signal,
    );
    expect(replayed).toEqual([1, 2]);
    expect(connections).toBe(3);
    expect(cursors).toEqual(Array(3).fill("/api/v2/events?after=0"));
  });

  it("discards a trailing incomplete frame and rejects inconsistent execution ids", async () => {
    let contents =
      frame(event(3)) +
      `event: execution\nid: 4\ndata: ${JSON.stringify(event(4))}`;
    const baseUrl = await localServer((_, response) => {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.end(contents);
    });
    const seen: number[] = [];
    await client(baseUrl).events(
      0,
      async (value) => {
        seen.push(value.cursor);
      },
      new AbortController().signal,
    );
    expect(seen).toEqual([3]);
    contents = `event: execution\nid: 2\ndata: ${JSON.stringify(event(3))}\n\n`;
    await expect(
      client(baseUrl).events(0, async () => {}, new AbortController().signal),
    ).rejects.toMatchObject({ code: "INVALID_EXECUTION_EVENT" });
    contents = frame(event(2)) + frame(event(1));
    await expect(
      client(baseUrl).events(0, async () => {}, new AbortController().signal),
    ).rejects.toMatchObject({ code: "INVALID_EVENT_CURSOR" });
  });

  it("keeps healthy SSE resident beyond HTTP handshake timeout and aborts the underlying connection", async () => {
    const closed = deferred();
    const connected = deferred();
    const baseUrl = await localServer((_, response) => {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.flushHeaders();
      response.on("close", closed.resolve);
      connected.resolve();
    });
    const controller = new AbortController();
    let ended = false;
    const operation = client(baseUrl, 25)
      .events(0, async () => {}, controller.signal)
      .then(() => {
        ended = true;
      });
    await connected.promise;
    await delay(50);
    expect(ended).toBe(false);
    controller.abort();
    await operation;
    await closed.promise;
    expect(ended).toBe(true);
  });

  it("fails invalid MIME, authorization, oversized frames and a stalled handshake without consuming events", async () => {
    let mode = "mime";
    let calls = 0;
    const baseUrl = await localServer((_, response) => {
      if (mode === "hang") return;
      if (mode === "auth") {
        response.writeHead(401);
        response.end("private token echo");
        return;
      }
      response.writeHead(200, {
        "Content-Type": mode === "mime" ? "text/plain" : "text/event-stream",
      });
      response.end(
        mode === "oversize" ? "data:" + "x".repeat(70_000) : frame(event(1)),
      );
    });
    const consume = async () => {
      calls++;
    };
    await expect(
      client(baseUrl).events(0, consume, new AbortController().signal),
    ).rejects.toMatchObject({ code: "INVALID_EVENT_STREAM" });
    mode = "auth";
    await expect(
      client(baseUrl).events(0, consume, new AbortController().signal),
    ).rejects.toMatchObject({ code: "HTTP_REJECTED", outcomeUnknown: false });
    mode = "oversize";
    await expect(
      client(baseUrl).events(0, consume, new AbortController().signal),
    ).rejects.toMatchObject({ code: "EVENT_FRAME_TOO_LARGE" });
    mode = "hang";
    await expect(
      client(baseUrl, 20).events(0, consume, new AbortController().signal),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(calls).toBe(0);
  });
});

function client(baseUrl: string, httpTimeoutMs = 1_000): ExecutionCenterClient {
  return new ExecutionCenterClient({
    centerRef: "fixture-center",
    baseUrl,
    callerToken: "fixture-caller-token",
    httpTimeoutMs,
  });
}
async function localServer(
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => void | Promise<void>,
): Promise<string> {
  const server = createServer((incoming, response) => {
    void handler(incoming, response);
  });
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("LOCAL_TEST_BIND_FAILED");
  return `http://127.0.0.1:${address.port}`;
}
async function body(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}
function request(): ExecutionCenterStoredRequest {
  return {
    contractVersion: "execution.v1",
    callerRequestRef: "geo-attempt-fixture",
    channel: "api",
    deadlineAt: 1_800_000_000_000,
    items: [{ itemId: "sample-fixture" }],
    api: {
      endpointRef: "configured",
      endpointVersion: "1",
      operation: "chat",
      bodyEncoding: "json",
      body: { model: "fixture" },
    },
  };
}
function snapshot(state = "RUNNING"): ExecutionCenterSnapshot {
  return {
    ...request(),
    taskId: "execution-fixture",
    items: [{ itemId: "sample-fixture", state }],
  };
}
function wrapper(task: ExecutionCenterSnapshot) {
  return { contractVersion: "execution.v1", task };
}
function event(cursor: number): ExecutionCenterEvent {
  return {
    cursor,
    seq: cursor,
    taskId: "execution-fixture",
    itemId: "sample-fixture",
    callerRequestRef: "geo-attempt-fixture",
    channel: "api",
    type: "RESULT_AVAILABLE",
    at: 1234,
    physicalAttemptId: "physical-fixture",
  };
}
function frame(event: ExecutionCenterEvent): string {
  return `event: execution\nid: ${event.cursor}\ndata: ${JSON.stringify(event)}\n\n`;
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function rejection(
  promise: Promise<unknown>,
): Promise<ExecutionCenterClientError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ExecutionCenterClientError);
    return error as ExecutionCenterClientError;
  }
  throw new Error("EXPECTED_REJECTION");
}
