import { afterEach, describe, expect, it } from "vitest";
import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import type {
  ExecutionCenterStoredRequest,
  ExecutionCenterWebStoredRequest,
  ExecutionCenterWebTaskSnapshot,
} from "../src/ai-execution/domain/execution-center-receipt.repository.js";
import { ExecutionCenterClient } from "../src/ai-execution/infrastructure/execution-center.client.js";
import { ExecutionCenterBrowserSamplingGateway } from "../src/ai-execution/infrastructure/execution-center-browser-sampling.gateway.js";
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
async function server(
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => void | Promise<void>,
) {
  const value = createServer(handler);
  servers.push(value);
  value.listen(0, "127.0.0.1");
  await once(value, "listening");
  const address = value.address();
  if (!address || typeof address === "string")
    throw new Error("missing fixture listener");
  return "http://127.0.0.1:" + address.port;
}
function client(baseUrl: string) {
  return new ExecutionCenterClient({
    centerRef: "p4-fixture",
    baseUrl,
    callerToken: "fixture-only",
  });
}
function request(): ExecutionCenterWebStoredRequest {
  return {
    contractVersion: "execution.v1",
    channel: "web",
    callerRequestRef: "geo:web:00000000-0000-4000-8000-000000000169",
    deadlineAt: Date.now() + 130000,
    items: [1, 2, 3, 4].map((index) => ({ itemId: "sample" + index })),
    web: { platform: "deepseek", accountAlias: "fixture" },
    metadata: { runId: "run", cycleId: "cycle" },
  };
}
function snapshot(
  input: ExecutionCenterWebStoredRequest,
): ExecutionCenterWebTaskSnapshot {
  return {
    ...input,
    taskId: "execution-p4",
    items: input.items.map((item, index) => ({
      ...item,
      state: index === 0 ? "RESULT_AVAILABLE" : "RUNNING",
      ...(index === 0
        ? {
            result: {
              kind: "web",
              answerContent: "首题完整回答",
              readingText: "首题完整回答",
              content: {
                version: 2,
                blocks: [{ type: "table", rows: [["原文"]] }],
                sources: [{ url: "https://fixture.invalid/source" }],
              },
              images: [{ id: "img1", src: "https://fixture.invalid/image" }],
            },
          }
        : {}),
    })),
  };
}
async function readBody(request: IncomingMessage) {
  let value = "";
  for await (const chunk of request) value += chunk;
  return JSON.parse(value);
}
describe("P4 shared API and web execution HTTP seam", () => {
  it("rejects a cross-channel single-item request before POST while retaining API's narrow boundary", async () => {
    let calls = 0;
    const url = await server((_, response) => {
      calls++;
      response.end("{}");
    });
    const input = request();
    input.items = [input.items[0]!];
    await expect(
      client(url).submit(
        "key",
        input as unknown as ExecutionCenterStoredRequest,
      ),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    input.channel = "api" as "web";
    await expect(client(url).submitWeb("key", input)).rejects.toMatchObject({
      code: "INVALID_REQUEST",
    });
    expect(calls).toBe(0);
  });
  it("submits one 4-item task unchanged and exposes the first rich result while siblings run", async () => {
    const input = request();
    const ready = snapshot(input);
    let posted: unknown;
    let calls = 0;
    const url = await server(async (incoming, response) => {
      calls++;
      if (incoming.method === "POST") posted = await readBody(incoming);
      response.writeHead(incoming.method === "POST" ? 202 : 200, {
        "Content-Type": "application/json",
      });
      response.end(
        JSON.stringify({ contractVersion: "execution.v1", task: ready }),
      );
    });
    const transport = client(url);
    const gateway = new ExecutionCenterBrowserSamplingGateway(transport);
    const submitted = await gateway.submitBatch({
      idempotencyKey: "same-batch",
      request: input,
    });
    expect(posted).toEqual(input);
    expect(submitted.items.map((item) => item.state)).toEqual([
      "RESULT_AVAILABLE",
      "RUNNING",
      "RUNNING",
      "RUNNING",
    ]);
    expect((await gateway.readBatch(ready.taskId)).items[0]!.result).toEqual(
      ready.items[0]!.result,
    );
    expect(calls).toBe(2);
    await expect(transport.read(ready.taskId)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    }); // API receipt stays narrow.
  });
  it("validates all item IDs, channel and order rather than only the first returned item", async () => {
    const input = request();
    let changed: ExecutionCenterWebTaskSnapshot = snapshot(input);
    const url = await server((_, response) =>
      response.end(
        JSON.stringify({ contractVersion: "execution.v1", task: changed }),
      ),
    );
    changed.items[3]!.itemId = "wrong-last";
    await expect(
      client(url).submitWeb("same-key", input),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", outcomeUnknown: true });
    changed = snapshot(input);
    changed.items.reverse();
    await expect(
      client(url).submitWeb("same-key", input),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", outcomeUnknown: true });
    changed = {
      ...snapshot(input),
      channel: "api",
    } as unknown as ExecutionCenterWebTaskSnapshot;
    await expect(
      client(url).submitWeb("same-key", input),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", outcomeUnknown: true });
  });
  it.each(["duplicate", "five", "api-four"] as const)(
    "rejects %s item sets before any physical submission",
    async (kind) => {
      let calls = 0;
      const url = await server((_, response) => {
        calls++;
        response.end("{}");
      });
      const input = request();
      if (kind === "duplicate") input.items[3]!.itemId = input.items[0]!.itemId;
      if (kind === "five") input.items.push({ itemId: "fifth" });
      if (kind === "api-four") input.channel = "api" as "web";
      await expect(client(url).submitWeb("key", input)).rejects.toMatchObject({
        code: "INVALID_REQUEST",
        outcomeUnknown: false,
      });
      expect(calls).toBe(0);
    },
  );
  it("uses one SSE channel for interleaved API and web terminal events without returning rich bodies in notifications", async () => {
    const events = [
      {
        cursor: 1,
        taskId: "api-task",
        itemId: "api-item",
        callerRequestRef: "geo:parser:attempt",
        channel: "api",
        type: "RESULT_AVAILABLE",
        at: 1,
      },
      {
        cursor: 3,
        taskId: "web-task",
        itemId: "web-item",
        callerRequestRef: "geo:web:batch",
        channel: "web",
        type: "RESULT_AVAILABLE",
        at: 2,
      },
    ];
    const url = await server((_, response) => {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.end(
        events
          .map(
            (event) =>
              "event: execution\nid: " +
              event.cursor +
              "\ndata: " +
              JSON.stringify({ ...event, prompt: "not-a-notification-field" }) +
              "\n\n",
          )
          .join(""),
      );
    });
    const seen: unknown[] = [];
    await client(url).events(
      0,
      async (event) => {
        seen.push(event);
      },
      new AbortController().signal,
    );
    expect(seen).toEqual(
      events.map((event) => ({ ...event, seq: event.cursor })),
    );
  });
  it("fails a missing configured channel clearly without creating a second transport or listener", async () => {
    const gateway = new ExecutionCenterBrowserSamplingGateway(null);
    await expect(gateway.readBatch("task")).rejects.toMatchObject({
      code: "CHANNEL_UNAVAILABLE",
    });
    await expect(
      gateway.submitBatch({ idempotencyKey: "key", request: request() }),
    ).rejects.toMatchObject({ code: "CHANNEL_UNAVAILABLE" });
  });
});
