import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

import type {
  ExecutionCenterEvent,
  ExecutionCenterSnapshot,
  ExecutionCenterStoredRequest,
} from "../../src/ai-execution/domain/execution-center-receipt.repository.js";

type NativeResponse = { status: number; body: Record<string, unknown> };
export type DelegatedCenterHost = {
  baseUrl: string;
  implementation: "protocol-fixture" | "real-sqlite-center";
  holdProvider: boolean;
  dropNextAck: boolean;
  rejectStatus: number;
  providerCalls: Array<{
    body: Record<string, unknown>;
    authorization: string | undefined;
  }>;
  submittedKeys: string[];
  eventConnections: number;
  holdAck(): () => void;
  releaseProvider(): void;
  close(): Promise<void>;
};

/** Test-only adapter. CI has no source dependency on the separately managed center repo. */
export async function startDelegatedCenterHost(
  respond: (body: Record<string, unknown>) => Promise<NativeResponse>,
): Promise<DelegatedCenterHost> {
  const servers: Server[] = [];
  const blockers = new Set<() => void>();
  let ackRelease: (() => void) | undefined;
  let ackGate = Promise.resolve();
  let stopCenter = async () => {};
  let directory: string | undefined;
  const host: DelegatedCenterHost = {
    baseUrl: "",
    implementation: "protocol-fixture",
    holdProvider: false,
    dropNextAck: false,
    rejectStatus: 0,
    providerCalls: [],
    submittedKeys: [],
    eventConnections: 0,
    holdAck() {
      ackGate = new Promise<void>((resolve) => {
        ackRelease = resolve;
      });
      return () => {
        ackRelease?.();
        ackRelease = undefined;
      };
    },
    releaseProvider() {
      host.holdProvider = false;
      for (const release of blockers) release();
      blockers.clear();
    },
    async close() {
      host.releaseProvider();
      ackRelease?.();
      for (const server of servers.reverse()) {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      await stopCenter();
      if (directory) await rm(directory, { recursive: true, force: true });
    },
  };
  const provider = createServer(async (request, response) => {
    try {
      const body = (await readBody(request)) as Record<string, unknown>;
      host.providerCalls.push({
        body,
        authorization: request.headers.authorization,
      });
      const output = await respond(body);
      if (host.holdProvider)
        await new Promise<void>((resolve) => blockers.add(resolve));
      if (!response.destroyed) sendJson(response, output.status, output.body);
    } catch {
      // Test fixture errors must fail the observed response, never escape the HTTP callback.
      if (!response.destroyed)
        sendJson(response, 500, { error: { code: "FIXTURE_PROVIDER_ERROR" } });
    }
  });
  servers.push(provider);
  const providerUrl = await listen(provider);
  let backend: Server;
  const root = process.env.EXECUTION_CENTER_FIXTURE_ROOT;
  if (root) {
    host.implementation = "real-sqlite-center";
    const load = (name: string) =>
      import(pathToFileURL(join(root, "src", name)).href);
    const [ledgerModule, transportModule, serviceModule, httpModule] =
      await Promise.all([
        load("execution-repository.js"),
        load("native-api-transport.js"),
        load("execution-service.js"),
        load("execution-http.js"),
      ]);
    directory = await mkdtemp(join(tmpdir(), "geoeval-delegated-center-"));
    const repository = new ledgerModule.SQLiteExecutionRepository(
      join(directory, "ledger.sqlite"),
    );
    const apiTransport = new transportModule.NativeApiTransport({
      endpoints: {
        fixture: {
          version: "1",
          allowedCallers: ["geo-fixture"],
          auth: {
            header: "authorization",
            scheme: "Bearer",
            secretRef: "synthetic-provider",
          },
          operations: { chat: { url: providerUrl + "/chat", method: "POST" } },
        },
      },
      resolveSecret: async () => "synthetic-provider-key",
      allowInsecureLoopback: true,
    });
    const service = new serviceModule.ExecutionService({
      repository,
      apiTransport,
      maxConcurrency: 4,
    });
    service.start();
    backend = httpModule.createExecutionServer({
      service,
      authenticate: (request: IncomingMessage) =>
        request.headers.authorization === "Bearer synthetic-caller-key"
          ? "geo-fixture"
          : null,
      heartbeatMs: 10_000,
    });
    stopCenter = async () => {
      await service.stop({ timeoutMs: 1_000 });
      repository.close();
    };
  } else {
    backend = protocolFixture(providerUrl);
  }
  servers.push(backend);
  const backendUrl = await listen(backend);
  const proxy = createServer(async (incoming, outgoing) => {
    const requestBody =
      incoming.method === "POST"
        ? JSON.stringify(await readBody(incoming))
        : undefined;
    const isSubmission =
      incoming.method === "POST" && incoming.url === "/api/v2/executions";
    if (isSubmission) {
      host.submittedKeys.push(String(incoming.headers["idempotency-key"]));
      if (host.rejectStatus) {
        sendJson(outgoing, host.rejectStatus, {
          error: { code: "CONFIGURATION_REJECTED" },
        });
        return;
      }
    }
    const controller = new AbortController();
    outgoing.on("close", () => controller.abort());
    try {
      const headers: Record<string, string> = {};
      for (const field of [
        "authorization",
        "content-type",
        "idempotency-key",
        "last-event-id",
        "accept",
      ] as const) {
        if (typeof incoming.headers[field] === "string")
          headers[field] = incoming.headers[field];
      }
      const response = await fetch(backendUrl + incoming.url, {
        method: incoming.method,
        headers,
        ...(requestBody ? { body: requestBody } : {}),
        signal: controller.signal,
        redirect: "manual",
      });
      if (isSubmission) {
        const body = await response.text();
        if (host.dropNextAck) {
          host.dropNextAck = false;
          outgoing.destroy();
          return;
        }
        await ackGate;
        if (!outgoing.destroyed) {
          outgoing.writeHead(response.status, {
            "Content-Type": "application/json",
          });
          outgoing.end(body);
        }
        return;
      }
      outgoing.writeHead(response.status, {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
      });
      outgoing.flushHeaders();
      if (incoming.url?.startsWith("/api/v2/events")) host.eventConnections++;
      if (response.body)
        for await (const chunk of response.body) {
          if (outgoing.destroyed) break;
          outgoing.write(chunk);
        }
      outgoing.end();
    } catch {
      if (!outgoing.destroyed) outgoing.destroy();
    }
  });
  servers.push(proxy);
  host.baseUrl = await listen(proxy);
  return host;
}

function protocolFixture(providerUrl: string): Server {
  const keys = new Map<string, { request: string; taskId: string }>();
  const tasks = new Map<string, ExecutionCenterSnapshot>();
  const eventLog: ExecutionCenterEvent[] = [];
  const listeners = new Set<() => void>();
  const emit = (task: ExecutionCenterSnapshot, type: string) => {
    const cursor = eventLog.length + 1;
    eventLog.push({
      cursor,
      seq: cursor,
      taskId: task.taskId,
      callerRequestRef: task.callerRequestRef,
      itemId: task.items[0]!.itemId,
      channel: "api",
      type,
      at: Date.now(),
      physicalAttemptId: String(task.items[0]!.physicalAttemptId),
    });
    for (const listener of listeners) listener();
  };
  const execute = async (
    task: ExecutionCenterSnapshot,
    request: ExecutionCenterStoredRequest,
  ) => {
    task.items[0]!.state = "RUNNING";
    emit(task, "DISPATCHING");
    try {
      const api = request.api as Record<string, unknown>;
      const response = await fetch(providerUrl + "/chat", {
        method: "POST",
        headers: {
          Authorization: "Bearer synthetic-provider-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(api.body),
        redirect: "manual",
      });
      const rawBody = await response.text();
      task.items[0]!.state = "RESULT_AVAILABLE";
      task.items[0]!.result = {
        kind: "api",
        transportStatus: "RESPONSE_RECEIVED",
        httpStatus: response.status,
        safeHeaders: { "content-type": "application/json" },
        rawBody,
        bodyEncoding: "utf8",
      };
      emit(task, "RESULT_AVAILABLE");
    } catch {
      task.items[0]!.state = "OUTCOME_UNKNOWN";
      task.items[0]!.error = {
        code: "TRANSPORT_OUTCOME_UNKNOWN",
        outcomeUnknown: true,
      };
      emit(task, "OUTCOME_UNKNOWN");
    }
  };
  return createServer(async (request, response) => {
    if (request.headers.authorization !== "Bearer synthetic-caller-key") {
      sendJson(response, 401, { error: { code: "UNAUTHENTICATED" } });
      return;
    }
    const url = new URL(request.url!, "http://fixture");
    if (url.pathname === "/api/v2/events") {
      let after = Number(url.searchParams.get("after") || 0);
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.write("event: ready\ndata: {}\n\n");
      const pump = () => {
        for (const event of eventLog.filter((event) => event.cursor > after)) {
          response.write(
            `event: execution\nid: ${event.cursor}\ndata: ${JSON.stringify(event)}\n\n`,
          );
          after = event.cursor;
        }
      };
      listeners.add(pump);
      pump();
      response.on("close", () => listeners.delete(pump));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/v2/executions") {
      const input = (await readBody(request)) as ExecutionCenterStoredRequest;
      const key = String(request.headers["idempotency-key"]);
      const prior = keys.get(key);
      if (prior) {
        if (prior.request !== JSON.stringify(input)) {
          sendJson(response, 409, { error: { code: "IDEMPOTENCY_CONFLICT" } });
          return;
        }
        sendJson(response, 200, {
          contractVersion: "execution.v1",
          task: tasks.get(prior.taskId),
        });
        return;
      }
      const task: ExecutionCenterSnapshot = {
        contractVersion: "execution.v1",
        channel: "api",
        callerRequestRef: input.callerRequestRef,
        taskId: `execution-${randomUUID()}`,
        deadlineAt: input.deadlineAt,
        items: [
          {
            itemId: input.items[0]!.itemId,
            state: "QUEUED",
            physicalAttemptId: `physical-${randomUUID()}`,
          },
        ],
      };
      tasks.set(task.taskId, task);
      keys.set(key, { request: JSON.stringify(input), taskId: task.taskId });
      emit(task, "ITEM_QUEUED");
      sendJson(response, 202, { contractVersion: "execution.v1", task });
      void execute(task, input);
      return;
    }
    const taskId = url.pathname.slice("/api/v2/executions/".length);
    const task = tasks.get(taskId);
    sendJson(
      response,
      task ? 200 : 404,
      task
        ? { contractVersion: "execution.v1", task }
        : { error: { code: "NOT_FOUND" } },
    );
  });
}
async function listen(server: Server): Promise<string> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("FIXTURE_BIND_FAILED");
  return `http://127.0.0.1:${address.port}`;
}
async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}
