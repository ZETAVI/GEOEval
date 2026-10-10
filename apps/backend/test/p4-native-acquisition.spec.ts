import { describe, expect, it, vi } from "vitest";
import type {
  AcquisitionAttemptInput,
  AiAdapterResult,
  ResolvedSampleAiAttemptRequest,
  SampleAiAttemptRequest,
  StoredAiAttempt,
} from "../src/ai-execution/domain/ai-attempt.types.js";
import type { AiAttemptRepository } from "../src/ai-execution/domain/ai-attempt.repository.js";
import type {
  ExecutionCenterReceipt,
  ExecutionCenterReceiptRepository,
  ExecutionCenterSnapshot,
} from "../src/ai-execution/domain/execution-center-receipt.repository.js";
import { buildAttemptEnvelope } from "../src/ai-execution/domain/ai-attempt.envelope.js";
import { DelegatedParserExecutionService } from "../src/ai-execution/application/delegated-parser-execution.service.js";
import { ExecutionCenterClient } from "../src/ai-execution/infrastructure/execution-center.client.js";
import {
  parserExecutionCenterConfig,
  type ParserExecutionCenterConfig,
} from "../src/ai-execution/infrastructure/execution-center.config.js";
import { RealAiNativeAttemptCodec } from "../src/ai-execution/infrastructure/providers/real-ai-native-attempt.codec.js";
import { REAL_AI_ROUTES } from "../src/ai-execution/infrastructure/providers/real-route.catalog.js";
import { ProviderHttpTransport } from "../src/ai-execution/infrastructure/providers/provider-http.transport.js";
import { ArkProviderAdapter } from "../src/ai-execution/infrastructure/providers/ark-provider.adapter.js";
import { QianfanProviderAdapter } from "../src/ai-execution/infrastructure/providers/qianfan-provider.adapter.js";
import { ModelStudioProviderAdapter } from "../src/ai-execution/infrastructure/providers/model-studio-provider.adapter.js";
import { TokenHubProviderAdapter } from "../src/ai-execution/infrastructure/providers/tokenhub-provider.adapter.js";
import type { ProviderRouteDefinition } from "../src/ai-execution/infrastructure/providers/provider-route.js";
const codec = new RealAiNativeAttemptCodec();
const routes = REAL_AI_ROUTES.filter(
  (route) => route.purpose === "EVALUATION_ACQUISITION",
);
function acquisition(
  route = routes[0]!,
): ResolvedSampleAiAttemptRequest & { input: AcquisitionAttemptInput } {
  return {
    runId: "run",
    cycleId: "cycle",
    sampleId: "sample",
    purpose: "EVALUATION_ACQUISITION",
    executionChannel: "API",
    attemptNumber: 1,
    routePolicyId: route.routePolicyId,
    requestedModel: route.requestedModel,
    providerKey: route.providerKey,
    serviceClass: route.serviceClass,
    protocol: route.protocol,
    correlationId: "correlation",
    input: {
      taskKind: "EVALUATION_ACQUISITION",
      systemInstruction: "原系统指令不改写",
      companyName: "花悦庭",
      query: " 广州天河猎德社区的花悦庭怎么样？\n ",
      questionOrdinal: 1,
      platformLabel: "fixture",
      province: "广东省",
      city: "广州市",
    },
  };
}
function native(route: ProviderRouteDefinition) {
  const citations = [
    {
      type: "url_citation",
      url: "https://fixture.invalid/source",
      title: "实际原生信源",
    },
  ];
  return {
    id: "native-result",
    model: route.requestedModel,
    usage: { prompt_tokens: 10, completion_tokens: 25 },
    ...(route.protocol === "responses"
      ? {
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "原生采样回答，未润色。",
                  annotations: citations,
                },
              ],
            },
          ],
        }
      : {
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: "原生采样回答，未润色。",
                annotations: citations,
              },
            },
          ],
        }),
  };
}
describe("P4 native acquisition semantics", () => {
  it.each(routes)(
    "shares the exact direct request and native normalization for $routePolicyId",
    async (route) => {
      const request = acquisition(route);
      const prepared = codec.prepare(request);
      const transport = new ProviderHttpTransport(1000);
      const response = native(route);
      const send = vi.spyOn(transport, "send").mockResolvedValue({
        status: 200,
        ok: true,
        headers: { "x-request-id": "raw-id" },
        body: response,
      });
      const connection = {
        baseUrl: "https://no-real-network.fixture.invalid",
        apiKey: "synthetic-only",
      };
      const adapter =
        route.providerKey === "volcengine-ark"
          ? new ArkProviderAdapter(connection, transport)
          : route.providerKey === "baidu-qianfan"
            ? new QianfanProviderAdapter(connection, transport)
            : route.providerKey === "alibaba-model-studio"
              ? new ModelStudioProviderAdapter(connection, transport)
              : new TokenHubProviderAdapter(connection, transport);
      const direct = await adapter.execute(request, route);
      expect(send).toHaveBeenCalledExactlyOnceWith({
        url: connection.baseUrl + prepared.path,
        method: "POST",
        apiKey: connection.apiKey,
        body: prepared.body,
      });
      const delegated = codec.consume(request, prepared, {
        httpStatus: 200,
        safeHeaders: { "x-request-id": "raw-id" },
        bodyEncoding: "utf8",
        rawBody: JSON.stringify(response),
      });
      expect(delegated).toEqual({
        ...direct,
        evidence: {
          ...direct.evidence,
          sanitizedRequest: {
            method: "POST",
            path: prepared.path,
            body: prepared.body,
          },
        },
      });
      expect(delegated).toMatchObject({
        kind: "SUCCEEDED",
        output: {
          kind: "ACQUISITION",
          answerContent: "原生采样回答，未润色。",
          sourceMetadata: [{ url: "https://fixture.invalid/source" }],
        },
        usage: { prompt_tokens: 10, completion_tokens: 25 },
      });
      const query =
        route.protocol === "responses"
          ? prepared.body.input
          : (prepared.body.messages as Array<{ content: string }>)[1]!.content;
      expect(query).toBe(request.input.query);
      expect(JSON.stringify(prepared)).not.toContain("synthetic-only");
    },
  );
  it.each(routes)(
    "keeps 429 classification, sources and usage for $routePolicyId",
    (route) => {
      const request = acquisition(route);
      const body = native(route);
      expect(
        codec.consume(request, codec.prepare(request), {
          httpStatus: 429,
          safeHeaders: {},
          bodyEncoding: "utf8",
          rawBody: JSON.stringify(body),
        }),
      ).toMatchObject({
        kind: "FAILED",
        failureClass: "RATE_LIMIT_OR_QUOTA",
        retryable: true,
        usage: body.usage,
        evidence: { rawResponse: body },
      });
    },
  );
  it("rejects recorded browser input rather than preparing a native re-send", () => {
    const request = {
      ...acquisition(),
      input: {
        taskKind: "BROWSER_EVALUATION_ACQUISITION",
        platformKey: "deepseek",
        questionId: "question",
        externalTaskId: "task",
        resultIndex: 0,
      },
    } as ResolvedSampleAiAttemptRequest;
    expect(() => codec.prepare(request)).toThrow("native Acquisition only");
  });
});

function harness(
  options: {
    acquisitionEnabled?: boolean;
    parserEnabled?: boolean;
    timeoutMs?: number;
    ready?: boolean;
    reject?: number;
    lostAck?: boolean;
  } = {},
) {
  let now = 1_000_000;
  let attempt: StoredAiAttempt | undefined;
  let receipt: ExecutionCenterReceipt | null = null;
  let originalRequest: SampleAiAttemptRequest | undefined;
  let calls = 0;
  let finishWrites = 0;
  const sent: Array<{ key: string; body: Record<string, unknown> }> = [];
  const config: ParserExecutionCenterConfig = {
    enabled: options.parserEnabled ?? true,
    acquisitionEnabled: options.acquisitionEnabled ?? true,
    centerRef: "fixture",
    baseUrl: "http://127.0.0.1:4612",
    callerToken: "synthetic",
    httpTimeoutMs: 1000,
    endpoints: Object.fromEntries(
      REAL_AI_ROUTES.map((route) => [
        route.providerKey + ":" + route.protocol,
        { endpointRef: "fixture", endpointVersion: "1", operation: "chat" },
      ]),
    ),
  };
  const attempts = {
    find: vi.fn(async () => attempt ?? null),
    begin: vi.fn(async (_request, _timeout, transport) => {
      originalRequest = structuredClone(_request);
      attempt = {
        id: "attempt-1",
        status: "STARTED",
        executionTransport: transport,
        responseEnvelope: null,
        failureClass: null,
        retryable: null,
        startedAt: new Date(now),
        ...(_request.deadlineAt !== undefined
          ? { executionDeadlineAt: new Date(_request.deadlineAt) }
          : {}),
      };
      return { kind: "ACQUIRED" as const, attempt };
    }),
    finish: vi.fn(async (_id: string, result: AiAdapterResult) => {
      if (attempt!.status !== "STARTED") return attempt!;
      finishWrites++;
      attempt = {
        ...attempt!,
        status: result.kind === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
        responseEnvelope: buildAttemptEnvelope(result),
        failureClass: result.kind === "FAILED" ? result.failureClass : null,
        retryable: result.kind === "FAILED" ? result.retryable : null,
      };
      return attempt;
    }),
    recordExternal: vi.fn(),
    rejectSemantics: vi.fn(),
  } satisfies AiAttemptRepository;
  const receipts = {
    reserve: vi.fn(async (input) => {
      receipt = {
        ...input,
        id: "receipt-1",
        taskId: null,
        itemId: null,
        state: "RESERVING",
        snapshot: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        readyAt: null,
        originalAttempt: {
          request: originalRequest!,
          providerKey: (originalRequest as ResolvedSampleAiAttemptRequest)
            .providerKey,
          startedAt: attempt!.startedAt,
        },
        business: {
          runId: "run",
          cycleId: "cycle",
          sampleId: "sample",
          purpose: originalRequest!.purpose,
          attemptNumber: 1,
          correlationId: "correlation",
        },
      };
      return receipt;
    }),
    findByAttempt: vi.fn(async () => receipt),
    findByRequest: vi.fn(async () => receipt),
    recordSnapshot: vi.fn(
      async (_id: string, snapshot: ExecutionCenterSnapshot) => {
        receipt = {
          ...receipt!,
          taskId: snapshot.taskId,
          itemId: snapshot.items[0]!.itemId,
          snapshot,
          state:
            snapshot.items[0]!.state === "RESULT_AVAILABLE"
              ? "READY"
              : "WAITING",
        };
        return receipt;
      },
    ),
    recordAccepted: vi.fn(),
    readCursor: vi.fn(),
    readNotification: vi.fn(),
    consumeEvent: vi.fn(),
    listReconciliationCandidates: vi.fn(
      async (input: { limit: number; afterId?: string }) =>
        receipt &&
        attempt?.status === "STARTED" &&
        (!input.afterId || receipt.id > input.afterId) &&
        (receipt.state !== "READY" ||
          receipt.business.purpose === "EVALUATION_ACQUISITION")
          ? [receipt]
          : [],
    ),
  } satisfies ExecutionCenterReceiptRepository;
  const fetcher: typeof fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    sent.push({
      key: new Headers(init?.headers).get("Idempotency-Key")!,
      body,
    });
    if (options.lostAck && calls === 1)
      throw new Error("simulated response loss");
    if (options.reject)
      return new Response("secret rejection", { status: options.reject });
    const api = body.api as { body: { model: string } };
    const result = options.ready
      ? {
          kind: "api",
          transportStatus: "RESPONSE_RECEIVED",
          httpStatus: 200,
          safeHeaders: {},
          bodyEncoding: "utf8",
          rawBody: JSON.stringify(
            native(
              routes.find((route) => route.requestedModel === api.body.model)!,
            ),
          ),
        }
      : undefined;
    return Response.json(
      {
        contractVersion: "execution.v1",
        task: {
          ...body,
          taskId: "execution-fixture",
          items: [
            {
              itemId: "sample",
              state: options.ready ? "RESULT_AVAILABLE" : "RUNNING",
              ...(options.ready ? { result } : {}),
            },
          ],
        },
      },
      { status: 202 },
    );
  };
  const client = new ExecutionCenterClient(config, fetcher);
  const adapter = {
    resolve: (request: SampleAiAttemptRequest) => {
      const route = REAL_AI_ROUTES.find(
        (row) => row.routePolicyId === request.routePolicyId,
      )!;
      return {
        providerKey: route.providerKey,
        protocol: route.protocol,
        requestedModel: route.requestedModel,
        serviceClass: route.serviceClass,
      };
    },
    execute: vi.fn(),
  };
  const driver = (connected = true) =>
    new DelegatedParserExecutionService(
      attempts,
      receipts,
      adapter,
      codec,
      connected ? client : null,
      connected ? config : undefined,
      options.timeoutMs ?? 180_000,
      () => now,
    );
  return {
    driver,
    attempts,
    receipts,
    sent,
    config,
    receipt: () => receipt,
    attempt: () => attempt,
    finishWrites: () => finishWrites,
    completeNative: async (httpStatus = 200) => {
      const snapshot: ExecutionCenterSnapshot = {
        ...receipt!.request,
        taskId: "execution-fixture",
        items: [
          {
            itemId: "sample",
            state: "RESULT_AVAILABLE",
            result: {
              kind: "api",
              transportStatus: "RESPONSE_RECEIVED",
              httpStatus,
              safeHeaders: {},
              bodyEncoding: "utf8",
              rawBody: JSON.stringify(
                native(
                  routes.find(
                    (route) =>
                      route.routePolicyId === originalRequest!.routePolicyId,
                  ) ?? routes[0]!,
                ),
              ),
            },
          },
        ],
      };
      return receipts.recordSnapshot(receipt!.id, snapshot);
    },
    advance: (value: number) => {
      now += value;
    },
    now: () => now,
  };
}
describe("P4 delegated acquisition durable deadline", () => {
  it("finishes a late losing API result using original input after business advanced and transport is disabled", async () => {
    const h = harness();
    const original = acquisition();
    const originalQuery = original.input.query;
    await h.driver().execute(original);
    const receipt = await h.completeNative();
    original.input.query = "不可使用业务侧后续修改的输入";
    h.advance(600_000); // Report and sampling can already be closed; technical facts still finish.
    expect(
      await h.driver(false).consumeReadyAcquisition(receipt),
    ).toMatchObject({
      kind: "SUCCEEDED",
      output: { answerContent: "原生采样回答，未润色。" },
    });
    expect(h.attempt()?.status).toBe("SUCCEEDED");
    expect(h.receipt()?.originalAttempt?.request.input).toMatchObject({
      query: originalQuery,
    });
    expect(h.attempts.finish.mock.calls[0]![1]).toMatchObject({
      usage: { prompt_tokens: 10, completion_tokens: 25 },
    });
    expect(h.sent).toHaveLength(1);
  });
  it("technically closes received API failure usage without changing business acceptance or posting again", async () => {
    const h = harness();
    await h.driver().execute(acquisition());
    const receipt = await h.completeNative(429);
    expect(
      await h.driver(false).consumeReadyAcquisition(receipt),
    ).toMatchObject({ kind: "FAILED", failureClass: "RATE_LIMIT_OR_QUOTA" });
    expect(h.attempts.finish.mock.calls[0]![1]).toMatchObject({
      usage: { prompt_tokens: 10, completion_tokens: 25 },
      evidence: { rawResponse: expect.any(Object) },
    });
    expect(h.sent).toHaveLength(1);
  });
  it("recovers READY Acquisition after a local consume crash without GET or POST and then stops scanning it", async () => {
    const h = harness();
    await h.driver().execute(acquisition());
    await h.completeNative();
    h.attempts.finish.mockRejectedValueOnce(
      new Error("local finish transaction failed"),
    );
    expect(await h.driver(false).reconcile()).toBe(0);
    expect(h.attempt()?.status).toBe("STARTED");
    expect(await h.driver(false).reconcile()).toBe(1);
    expect(h.attempt()?.status).toBe("SUCCEEDED");
    expect(await h.driver(false).reconcile()).toBe(0);
    expect(h.attempts.finish).toHaveBeenCalledTimes(2);
    expect(h.finishWrites()).toBe(1);
    expect(h.sent).toHaveLength(1);
  });
  it("allows concurrent technical and ordinary consumption to converge on the existing finish CAS", async () => {
    const h = harness();
    await h.driver().execute(acquisition());
    const receipt = await h.completeNative();
    const outcomes = await Promise.all([
      h.driver().consumeReadyAcquisition(receipt),
      h.driver().consumeReadyAcquisition(receipt),
      h.driver().execute(acquisition()),
    ]);
    expect(outcomes.every((outcome) => outcome?.kind === "SUCCEEDED")).toBe(
      true,
    );
    expect(h.finishWrites()).toBe(1);
    expect(h.sent).toHaveLength(1);
  });
  it("does not consume a Parser receipt as technical Acquisition or alter its existing recovery semantics", async () => {
    const h = harness();
    const route = REAL_AI_ROUTES.find(
      (row) => row.purpose === "EVALUATION_INTERPRETATION",
    )!;
    const request: SampleAiAttemptRequest = {
      ...acquisition(),
      purpose: "EVALUATION_INTERPRETATION",
      routePolicyId: route.routePolicyId,
      requestedModel: route.requestedModel,
      input: {
        taskKind: "STRUCTURED_OUTPUT",
        systemInstruction: "Parser",
        userContext: {},
        outputContract: { version: "fixture", jsonSchema: {} },
      },
    };
    await h.driver().execute(request);
    const receipt = await h.completeNative();
    expect(await h.driver().consumeReadyAcquisition(receipt)).toBeUndefined();
    expect(await h.driver(false).reconcile()).toBe(0);
    expect(h.attempts.finish).not.toHaveBeenCalled();
    expect(h.sent).toHaveLength(1);
  });
  it("rejects durable request drift during technical consumption rather than making a replacement call", async () => {
    const h = harness();
    await h.driver().execute(acquisition());
    const receipt = await h.completeNative();
    (receipt.request.api as { body: Record<string, unknown> }).body.model =
      "not-the-original-model";
    expect(
      await h.driver(false).consumeReadyAcquisition(receipt),
    ).toMatchObject({ kind: "FAILED", failureClass: "REMOTE_REQUEST_DRIFT" });
    expect(h.sent).toHaveLength(1);
  });
  it("keeps new Acquisition direct unless its explicit independent gate is enabled", async () => {
    const h = harness({ acquisitionEnabled: false });
    expect(await h.driver().execute(acquisition())).toBeUndefined();
    expect(h.attempts.begin).not.toHaveBeenCalled();
  });
  it("delegates Acquisition independently from the Parser gate and clips its absolute 130-second deadline", async () => {
    const h = harness({ parserEnabled: false });
    const request = { ...acquisition(), deadlineAt: h.now() + 50_000 };
    expect(await h.driver().execute(request)).toMatchObject({
      kind: "REMOTE_PENDING",
    });
    expect(h.sent[0]!.body.deadlineAt).toBe(request.deadlineAt);
    expect(h.receipt()?.deadlineAt.getTime()).toBe(request.deadlineAt);
    expect(h.sent[0]!.body.callerRequestRef).toBe("geo:acquisition:attempt-1");
  });
  it("bounds Acquisition by its own smaller Provider budget", async () => {
    const h = harness({ timeoutMs: 20_000 });
    await h
      .driver()
      .execute({ ...acquisition(), deadlineAt: h.now() + 50_000 });
    expect(h.sent[0]!.body.deadlineAt).toBe(h.now() + 20_000);
  });
  it("never posts an already expired Acquisition", async () => {
    const h = harness();
    expect(
      await h.driver().execute({ ...acquisition(), deadlineAt: h.now() }),
    ).toMatchObject({
      kind: "FAILED",
      failureClass: "REMOTE_DEADLINE_EXCEEDED",
      retryable: false,
    });
    expect(h.sent).toHaveLength(0);
  });
  it("does not impose the acquisition deadline on Parser", async () => {
    const h = harness();
    const route = REAL_AI_ROUTES.find(
      (row) => row.purpose === "EVALUATION_INTERPRETATION",
    )!;
    const request: SampleAiAttemptRequest = {
      ...acquisition(),
      purpose: "EVALUATION_INTERPRETATION",
      routePolicyId: route.routePolicyId,
      requestedModel: route.requestedModel,
      deadlineAt: h.now() - 1,
      input: {
        taskKind: "STRUCTURED_OUTPUT",
        systemInstruction: "Parser",
        userContext: {},
        outputContract: { version: "fixture", jsonSchema: {} },
      },
    };
    expect(await h.driver().execute(request)).toMatchObject({
      kind: "REMOTE_PENDING",
    });
    expect(h.sent[0]!.body.deadlineAt).toBe(h.now() + 180_000);
  });
  it("reuses the identical key and durable deadline after ACK loss and driver restart", async () => {
    const h = harness({ lostAck: true });
    const request = { ...acquisition(), deadlineAt: h.now() + 50_000 };
    expect(await h.driver().execute(request)).toMatchObject({
      kind: "DEFERRED",
    });
    h.advance(1000);
    expect(await h.driver().execute(request)).toMatchObject({
      kind: "REMOTE_PENDING",
    });
    expect(h.sent).toHaveLength(2);
    expect(h.sent[1]).toEqual(h.sent[0]);
    expect(h.attempts.begin).toHaveBeenCalledTimes(1);
    expect(h.receipts.reserve).toHaveBeenCalledTimes(1);
  });
  it("returns a definitive rejection immediately without a retry or body exposure", async () => {
    const h = harness({ reject: 403 });
    expect(await h.driver().execute(acquisition())).toMatchObject({
      kind: "FAILED",
      failureClass: "EXECUTION_CENTER_REJECTED",
      retryable: false,
    });
    expect(h.sent).toHaveLength(1);
  });
  it("recovers a crash between Attempt and receipt with its original persisted absolute cutoff", async () => {
    const h = harness();
    const original = { ...acquisition(), deadlineAt: h.now() + 50_000 };
    h.receipts.reserve.mockRejectedValueOnce(
      new Error("fault between Attempt and receipt"),
    );
    await expect(h.driver().execute(original)).rejects.toThrow("fault");
    h.advance(1000);
    await h.driver().execute({ ...original, deadlineAt: h.now() + 130_000 });
    expect(h.sent[0]!.body.deadlineAt).toBe(original.deadlineAt);
    expect(h.attempts.begin).toHaveBeenCalledTimes(1);
  });
  it.each(routes)(
    "consumes a native $routePolicyId answer through the existing envelope",
    async (route) => {
      const h = harness({ ready: true });
      expect(await h.driver().execute(acquisition(route))).toMatchObject({
        kind: "SUCCEEDED",
        output: {
          kind: "ACQUISITION",
          answerContent: "原生采样回答，未润色。",
        },
        providerEvidence: { returnedModel: route.requestedModel },
      });
      expect(h.attempts.finish).toHaveBeenCalledTimes(1);
    },
  );
  it("defaults Acquisition config off and rejects non-boolean opt-in before network access", () => {
    const env = {
      AI_EXECUTION_CENTER_URL: "http://127.0.0.1:4612",
      AI_EXECUTION_CENTER_CALLER_TOKEN: "synthetic",
      AI_EXECUTION_CENTER_ENDPOINTS: JSON.stringify({
        route: {
          endpointRef: "fixture",
          endpointVersion: "1",
          operation: "chat",
        },
      }),
    };
    expect(parserExecutionCenterConfig(env, "real")?.acquisitionEnabled).toBe(
      false,
    );
    expect(
      parserExecutionCenterConfig(
        { ...env, AI_EXECUTION_CENTER_ACQUISITION_ENABLED: "true" },
        "real",
      )?.acquisitionEnabled,
    ).toBe(true);
    expect(() =>
      parserExecutionCenterConfig(
        { ...env, AI_EXECUTION_CENTER_ACQUISITION_ENABLED: "true" },
        "deterministic",
      ),
    ).toThrow("real route semantics");
    expect(() =>
      parserExecutionCenterConfig(
        { ...env, AI_EXECUTION_CENTER_ACQUISITION_ENABLED: "yes" },
        "real",
      ),
    ).toThrow("ACQUISITION_ENABLED");
  });
});
