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
  ExecutionCenterTaskSnapshot,
  ExecutionCenterEvent,
} from "../../src/ai-execution/domain/execution-center-receipt.repository.js";

const platforms = ["doubao", "deepseek", "qwen", "wenxin", "yuanbao"];
const gate = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};
export type P4CenterHost = {
  baseUrl: string;
  implementation: "protocol-fixture" | "real-sqlite-unix-center";
  holdSiblings: boolean;
  holdCleanup: boolean;
  blockedPlatforms: Set<string>;
  webCalls: Array<{
    platform: string;
    items: Array<{ itemId: string; prompt: string }>;
  }>;
  providerCalls: Array<{
    body: Record<string, unknown>;
    authorization: string | undefined;
  }>;
  releaseSiblings(): void;
  releaseCleanup(): void;
  close(): Promise<void>;
};

/** Clearly marked local responses; no actual platform, Cloud account, or paid API is used. */
export function p4FixtureRichAnswer(platform: string) {
  const answer = `【本地夹具，非真实平台回答】花悦庭主打北京烤鸭，门店环境与预约信息需要核实。平台：${platform}。`;
  return {
    answer,
    assistantRole: true,
    nonEchoVerified: true,
    finality: { state: "COMPLETE", reason: "PLATFORM_COMPLETION_MARKER" },
    readingText: `${answer}\n\n餐厅: 花悦庭 | 菜品: 北京烤鸭\n\n[图片：烤鸭]`,
    content: {
      version: 2,
      blocks: [
        {
          type: "paragraph",
          inlines: [
            { type: "text", text: answer },
            { type: "citation", label: "1", sourceId: "source-1" },
          ],
        },
        {
          type: "table",
          rows: [
            [
              { text: "餐厅", header: true },
              { text: "菜品", header: true },
            ],
            [
              { text: "花悦庭", header: false },
              { text: "北京烤鸭", header: false },
            ],
          ],
        },
        { type: "image", id: "image-1", alt: "烤鸭" },
      ],
      sources: [
        {
          id: "source-1",
          href: "https://source.fixture.invalid/restaurant",
          title: "本地信源夹具",
        },
      ],
      sourceCapture: { status: "CAPTURED" },
    },
    images: [
      {
        id: "image-1",
        src: "https://image.fixture.invalid/duck.jpg",
        alt: "烤鸭",
        width: 640,
        height: 480,
        role: "content",
        availability: "remote_url",
      },
    ],
  };
}

export async function startP4CenterHost(
  respond: (body: Record<string, unknown>) => Promise<Record<string, unknown>>,
): Promise<P4CenterHost> {
  const servers: Server[] = [];
  const siblingGate = gate();
  const cleanupGate = gate();
  let stop = async () => {};
  const directory = await mkdtemp(join(tmpdir(), "geoeval-p4-center-"));
  const host: P4CenterHost = {
    baseUrl: "",
    implementation: "protocol-fixture",
    holdSiblings: true,
    holdCleanup: true,
    blockedPlatforms: new Set(),
    webCalls: [],
    providerCalls: [],
    releaseSiblings() {
      host.holdSiblings = false;
      host.blockedPlatforms.clear();
      siblingGate.release();
    },
    releaseCleanup() {
      host.holdCleanup = false;
      cleanupGate.release();
    },
    async close() {
      host.releaseSiblings();
      host.releaseCleanup();
      for (const server of servers.reverse()) {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      await stop();
      await rm(directory, { recursive: true, force: true });
    },
  };
  const provider = createServer(async (request, response) => {
    try {
      const body = await readBody(request);
      host.providerCalls.push({
        body,
        authorization: request.headers.authorization,
      });
      send(response, 200, await respond(body));
    } catch {
      send(response, 500, { error: { code: "LOCAL_FIXTURE_PROVIDER_FAILED" } });
    }
  });
  servers.push(provider);
  const providerUrl = await listen(provider);
  const root = process.env.EXECUTION_CENTER_FIXTURE_ROOT;
  let backend: Server;
  if (root) {
    host.implementation = "real-sqlite-unix-center";
    const load = (name: string) =>
      import(pathToFileURL(join(root, "src", name)).href);
    const [
      ledger,
      native,
      execution,
      http,
      persistence,
      store,
      bridge,
      actorModule,
    ] = await Promise.all(
      [
        "execution-repository.js",
        "native-api-transport.js",
        "execution-service.js",
        "execution-http.js",
        "persistence.js",
        "store.js",
        "shared-browser-web-executor.js",
        "browser-command-server.js",
      ].map(load),
    );
    const socketPath = join(directory, "actor.sock");
    const actor = await actorModule.startBrowserCommandServer(
      socketPath,
      async (
        request: {
          action: string;
          platform: string;
          items: Array<{ itemId: string; prompt: string }>;
        },
        context: { emit(type: string, id: string, value: unknown): void },
      ) => {
        if (request.action === "inspect")
          return {
            sharedPools: {
              platforms: Object.fromEntries(
                platforms.map((platform) => [
                  platform,
                  {
                    configured: 4,
                    slots: Array.from({ length: 4 }, (_, index) => ({
                      index,
                      state: "READY",
                      writerStopped: true,
                    })),
                  },
                ]),
              ),
            },
          };
        host.webCalls.push({
          platform: request.platform,
          items: request.items,
        });
        if (host.blockedPlatforms.has(request.platform))
          await siblingGate.promise;
        context.emit("itemResult", request.items[0]!.itemId, {
          ok: true,
          result: p4FixtureRichAnswer(request.platform),
        });
        if (host.holdSiblings) await siblingGate.promise;
        for (const item of request.items.slice(1))
          context.emit("itemResult", item.itemId, {
            ok: true,
            result: p4FixtureRichAnswer(request.platform),
          });
        if (host.holdCleanup) await cleanupGate.promise;
        for (const item of request.items)
          context.emit("resourceReleased", item.itemId, {
            writerStopped: true,
            reusable: true,
            state: "READY",
          });
        return { writerStopped: true };
      },
      { exclusiveKey: (request: { platform: string }) => request.platform },
    );
    const repository = new ledger.SQLiteExecutionRepository(
      join(directory, "execution.sqlite"),
    );
    const identityRepository = new persistence.SQLiteStateRepository(
      join(directory, "execution.sqlite"),
    );
    let identityClosed = false;
    const owner = new store.ControlPlaneStore({
      onChange() {
        if (!identityClosed) identityRepository.save(owner.exportState());
      },
    });
    owner.registerNode({
      nodeId: "p4-fixture-node",
      platforms,
      profileScope: "shared",
    });
    for (const platform of platforms)
      owner.upsertAccount({
        platform,
        accountId: "p4-" + platform,
        loginStatus: "READY",
        preferredNodeId: "p4-fixture-node",
      });
    const webExecutor = new bridge.SharedBrowserWebExecutor({
      identityOwner: owner,
      bindings: platforms.map((platform) => ({
        callerId: "geo-fixture",
        platform,
        accountAlias: "primary",
        accountId: "p4-" + platform,
        nodeId: "p4-fixture-node",
        socketPath,
      })),
    });
    const apiTransport = new native.NativeApiTransport({
      endpoints: {
        fixture: {
          version: "1",
          allowedCallers: ["geo-fixture"],
          auth: {
            header: "authorization",
            scheme: "Bearer",
            secretRef: "fixture-secret",
          },
          operations: { chat: { url: providerUrl + "/chat", method: "POST" } },
        },
      },
      resolveSecret: async () => "synthetic-provider-key",
      allowInsecureLoopback: true,
    });
    const service = new execution.ExecutionService({
      repository,
      apiTransport,
      webExecutor,
      maxConcurrency: 4,
      maxWebConcurrency: 20,
    });
    service.start();
    backend = http.createExecutionServer({
      service,
      authenticate: (request: IncomingMessage) =>
        request.headers.authorization === "Bearer synthetic-caller-key"
          ? "geo-fixture"
          : null,
      heartbeatMs: 10_000,
    });
    stop = async () => {
      await service.stop({ timeoutMs: 1_000 });
      await actor.close();
      identityClosed = true;
      identityRepository.close();
      repository.close();
    };
  } else {
    backend = protocolFixture(
      host,
      providerUrl,
      siblingGate.promise,
      cleanupGate.promise,
    );
  }
  servers.push(backend);
  host.baseUrl = await listen(backend);
  return host;
}

function protocolFixture(
  host: P4CenterHost,
  providerUrl: string,
  siblings: Promise<void>,
  cleanup: Promise<void>,
): Server {
  const tasks = new Map<string, ExecutionCenterTaskSnapshot>();
  const keys = new Map<string, { fingerprint: string; taskId: string }>();
  const events: ExecutionCenterEvent[] = [];
  const subscribers = new Set<() => void>();
  const emit = (
    task: ExecutionCenterTaskSnapshot,
    itemId: string,
    type: string,
  ) => {
    const cursor = events.length + 1;
    events.push({
      cursor,
      seq: cursor,
      taskId: task.taskId,
      callerRequestRef: task.callerRequestRef,
      itemId,
      channel: task.channel,
      type,
      at: Date.now(),
      physicalAttemptId: String(
        task.items.find((item) => item.itemId === itemId)!.physicalAttemptId,
      ),
    });
    for (const notify of subscribers) notify();
  };
  const execute = async (
    task: ExecutionCenterTaskSnapshot,
    request: Record<string, unknown>,
  ) => {
    if (task.channel === "api") {
      const api = request.api as Record<string, unknown>;
      const response = await fetch(providerUrl + "/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer synthetic-provider-key",
        },
        body: JSON.stringify(api.body),
      });
      task.items[0]!.result = {
        kind: "api",
        transportStatus: "RESPONSE_RECEIVED",
        httpStatus: response.status,
        bodyEncoding: "utf8",
        rawBody: await response.text(),
        safeHeaders: { "content-type": "application/json" },
      };
      task.items[0]!.state = "RESULT_AVAILABLE";
      task.status = "COMPLETED";
      emit(task, task.items[0]!.itemId, "RESULT_AVAILABLE");
      return;
    }
    const items = request.items as Array<{
      itemId: string;
      userPrompt: string;
    }>;
    const platform = String(request.platform);
    host.webCalls.push({
      platform,
      items: items.map((item) => ({
        itemId: item.itemId,
        prompt: item.userPrompt,
      })),
    });
    const complete = (itemId: string) => {
      const item = task.items.find((item) => item.itemId === itemId)!;
      const rich = p4FixtureRichAnswer(platform);
      item.result = {
        ...rich,
        kind: "web",
        completion: { status: "COMPLETE" },
      };
      item.state = "RESULT_AVAILABLE";
      item.resourceState = "RESETTING";
      if (
        task.items.every((candidate) => candidate.state === "RESULT_AVAILABLE")
      )
        task.status = "COMPLETED";
      emit(task, itemId, "RESULT_AVAILABLE");
    };
    if (host.blockedPlatforms.has(platform)) await siblings;
    complete(items[0]!.itemId);
    if (host.holdSiblings) await siblings;
    for (const item of items.slice(1)) complete(item.itemId);
    if (host.holdCleanup) await cleanup;
    for (const item of task.items) item.resourceState = "RELEASED";
  };
  return createServer(async (request, response) => {
    if (request.headers.authorization !== "Bearer synthetic-caller-key")
      return send(response, 401, { error: { code: "UNAUTHORIZED" } });
    const url = new URL(request.url!, "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/api/v2/events") {
      let cursor = Number(
        request.headers["last-event-id"] || url.searchParams.get("after") || 0,
      );
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.flushHeaders();
      response.write("event: ready\ndata: {}\n\n");
      const notify = () => {
        for (const event of events.filter((event) => event.cursor > cursor)) {
          response.write(
            `id: ${event.cursor}\nevent: execution\ndata: ${JSON.stringify(event)}\n\n`,
          );
          cursor = event.cursor;
        }
      };
      subscribers.add(notify);
      response.on("close", () => subscribers.delete(notify));
      notify();
      return;
    }
    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/v2/executions/")
    ) {
      const task = tasks.get(url.pathname.split("/").at(-1)!);
      return send(
        response,
        task ? 200 : 404,
        task ? { task } : { error: { code: "NOT_FOUND" } },
      );
    }
    if (request.method !== "POST" || url.pathname !== "/api/v2/executions")
      return send(response, 404, {});
    const body = await readBody(request);
    const key = String(request.headers["idempotency-key"]);
    const fingerprint = JSON.stringify(body);
    const prior = keys.get(key);
    if (prior)
      return send(
        response,
        prior.fingerprint === fingerprint ? 200 : 409,
        prior.fingerprint === fingerprint
          ? { task: tasks.get(prior.taskId) }
          : { error: { code: "IDEMPOTENCY_CONFLICT" } },
      );
    const task: ExecutionCenterTaskSnapshot = {
      contractVersion: "execution.v1",
      taskId: "execution-" + randomUUID(),
      callerRequestRef: String(body.callerRequestRef),
      channel: body.channel === "web" ? "web" : "api",
      deadlineAt: Number(body.deadlineAt),
      status: "RUNNING",
      items: (body.items as Array<{ itemId: string }>).map((item) => ({
        itemId: item.itemId,
        state: "RUNNING",
        physicalAttemptId: "physical-" + randomUUID(),
        resourceState: "RESERVED",
      })),
    };
    keys.set(key, { fingerprint, taskId: task.taskId });
    tasks.set(task.taskId, task);
    send(response, 202, { task });
    void execute(task, body).catch(() => {
      for (const item of task.items) {
        item.state = "FAILED";
        item.error = { code: "FIXTURE_EXECUTION_FAILED" };
        emit(task, item.itemId, "FAILED");
      }
    });
  });
}

async function readBody(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(
    JSON.stringify(
      body && typeof body === "object" && "task" in body
        ? { contractVersion: "execution.v1", ...body }
        : body,
    ),
  );
}
async function listen(server: Server): Promise<string> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("LOCAL_FIXTURE_LISTEN_FAILED");
  return `http://127.0.0.1:${address.port}`;
}
