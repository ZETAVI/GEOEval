import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiExecutionService } from "../src/ai-execution/application/ai-execution.service.js";
import type { ExecutionCenterReceiptRepository } from "../src/ai-execution/domain/execution-center-receipt.repository.js";
import type { ExecutionCenterWebGateway } from "../src/ai-execution/infrastructure/execution-center-browser-sampling.gateway.js";
import { ExecutionCenterClientError } from "../src/ai-execution/infrastructure/execution-center.client.js";
import { ExecutionCenterSamplingCoordinator } from "../src/geo-intelligence/application/execution-center-sampling.coordinator.js";
import type { EvaluationProcessRepository } from "../src/geo-intelligence/domain/evaluation-process.repository.js";
import type {
  AcceptedEvidence,
  ExecutionSamplingBatchContext,
  ExecutionSamplingSnapshot,
  EvaluationSampleWorkContext,
} from "../src/geo-intelligence/domain/evaluation-process.types.js";

const CONTROLLED_NOW = 1_790_000_000_000;
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(CONTROLLED_NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function fixture() {
  const runId = randomUUID(),
    cycleId = randomUUID(),
    batchId = randomUUID(),
    correlationId = randomUUID();
  const now = Date.now();
  const contexts = Array.from(
    { length: 4 },
    (_, index): EvaluationSampleWorkContext => ({
      runId,
      cycleId,
      sampleId: randomUUID(),
      status: "PENDING",
      companyName: "花悦庭",
      query: " 原始问题 " + (index + 1) + "\n",
      questionKind: "INDUSTRY_RECOMMENDATION",
      questionOrdinal: index + 1,
      platformKey: "deepseek",
      platformLabel: "DeepSeek",
      routePolicyId: "evaluation.deepseek",
      requestedModel: "deepseek-v4-flash",
      objectivityInstruction: "原生客观要求，不增补问题",
      correlationId,
      evidence: null,
      samplingWindow: {
        startedAt: new Date(now - 1000),
        fallbackDueAt: new Date(now + 79000),
        deadlineAt: new Date(now + 129000),
        closedAt: null,
      },
      brandSnapshot: {
        companyName: "花悦庭",
        industry: {
          primary: { label: "餐饮" },
          secondary: { label: "烤鸭" },
          recommendationSubject: "北京烤鸭餐厅",
        },
        characteristics: ["环境舒适", "北京烤鸭"],
        region: {
          province: { label: "广东省" },
          city: { label: "广州市" },
          terminal: { label: "天河区" },
        },
      } as EvaluationSampleWorkContext["brandSnapshot"],
    }),
  );
  const batch: ExecutionSamplingBatchContext = {
    batchId,
    runId,
    cycleId,
    platformKey: "deepseek",
    accountAlias: "fixture-account",
    idempotencyKey: "geo-web/" + batchId,
    externalTaskId: null,
    status: "PENDING",
    createdAt: new Date(now - 37),
    submittedAt: null,
    correlationId,
    centerRef: "fixture-center",
    callerRequestRef: "geo:web:" + batchId,
    requestFingerprint: "a".repeat(64),
    deadlineAt: contexts[0]!.samplingWindow!.deadlineAt,
    samples: contexts.map((context) => ({
      sampleId: context.sampleId,
      questionId: randomUUID(),
      query: context.query,
      questionOrdinal: context.questionOrdinal,
      status: "PENDING",
    })),
    request: {
      contractVersion: "execution.v1",
      callerRequestRef: "geo:web:" + batchId,
      channel: "web",
      platform: "deepseek",
      accountAlias: "fixture-account",
      deadlineAt: contexts[0]!.samplingWindow!.deadlineAt.getTime(),
      items: contexts.map((context) => ({
        itemId: context.sampleId,
        userPrompt: context.query,
      })),
    },
    items: contexts.map((context) => ({
      id: randomUUID(),
      batchId,
      runId,
      cycleId,
      sampleId: context.sampleId,
      attemptId: randomUUID(),
      itemId: context.sampleId,
      state: "WAITING",
      snapshot: null,
      processedAt: null,
    })),
  };
  let snapshot: ExecutionSamplingSnapshot = {
    ...batch.request,
    taskId: "execution-fixture",
    items: contexts.map((context) => ({
      itemId: context.sampleId,
      state: "RUNNING",
    })),
  };
  const accepted: Array<{
    sampleId: string;
    attemptId: string;
    evidence: AcceptedEvidence;
  }> = [];
  const parserRequests = new Set<string>();
  const repository = {
    getSampleContext: vi.fn(async (sampleId: string) => {
      const context = contexts.find((row) => row.sampleId === sampleId);
      return context ? { ...context } : undefined;
    }),
    getOrCreateExecutionSamplingBatch: vi.fn(async () => batch),
    listExecutionSamplingBatches: vi.fn(async () => [batch]),
    recordExecutionSamplingSnapshot: vi.fn(
      async (input: {
        batchId: string;
        snapshot: ExecutionSamplingSnapshot;
      }) => {
        expect(input.batchId).toBe(batchId);
        expect(input.snapshot.callerRequestRef).toBe(batch.callerRequestRef);
        batch.externalTaskId = input.snapshot.taskId;
        batch.status = "SUBMITTED";
        for (const value of input.snapshot.items) {
          const item = batch.items.find((row) => row.itemId === value.itemId)!;
          if (
            item.state !== "READY" &&
            [
              "RESULT_AVAILABLE",
              "FAILED",
              "OUTCOME_UNKNOWN",
              "CANCELLED",
            ].includes(value.state)
          ) {
            item.state = "READY";
            item.snapshot = structuredClone(value);
          }
        }
        return batch;
      },
    ),
    markExecutionSamplingItemProcessed: vi.fn(async (id: string) => {
      batch.items.find((item) => item.id === id)!.processedAt = new Date();
    }),
    acceptEvidence: vi.fn(
      async (input: {
        context: EvaluationSampleWorkContext;
        attemptId: string;
        evidence: AcceptedEvidence;
      }) => {
        const current = contexts.find(
          (row) => row.sampleId === input.context.sampleId,
        )!;
        if (current.status !== "PENDING") return "ALREADY_ACCEPTED";
        current.status = "EVIDENCE_ACCEPTED";
        accepted.push({
          sampleId: current.sampleId,
          attemptId: input.attemptId,
          evidence: input.evidence,
        });
        parserRequests.add(current.sampleId);
        return "ACCEPTED";
      },
    ),
    scheduleSamplingFallback: vi.fn(async () => 1),
    closeSamplingAtDeadline: vi.fn(async () => 1),
    scheduleRetry: vi.fn(),
    exhaustStage: vi.fn(),
  };
  const apiOutput = {
    kind: "ACQUISITION",
    answerContent: "API原始回答",
    answerFormat: "MARKDOWN",
    sourceMetadata: [
      { url: "https://native.fixture.invalid/source", title: "原生信源" },
    ],
    searchObservation: "TRIGGERED",
    returnedModel: "deepseek-v4-flash",
  };
  const ai = {
    execute: vi.fn(async () => ({
      kind: "SUCCEEDED",
      attemptId: "api-attempt",
      output: apiOutput,
    })),
    recordExternal: vi.fn(
      async (
        _request: unknown,
        result: {
          kind: string;
          output?: Record<string, unknown>;
          failureClass?: string;
        },
      ) =>
        result.kind === "SUCCEEDED"
          ? {
              kind: "SUCCEEDED",
              attemptId: "web-attempt",
              output: result.output!,
            }
          : {
              kind: "FAILED",
              attemptId: "web-attempt",
              failureClass: result.failureClass,
              retryable: false,
            },
    ),
  };
  const web = {
    submitBatch: vi.fn(async () => snapshot),
    readBatch: vi.fn(async () => snapshot),
  };
  const notifications = {
    findByRequest: vi.fn(async () => null),
    readNotification: vi.fn(),
  };
  const coordinator = new ExecutionCenterSamplingCoordinator(
    repository as unknown as EvaluationProcessRepository,
    ai as unknown as AiExecutionService,
    web as unknown as ExecutionCenterWebGateway,
    notifications as unknown as ExecutionCenterReceiptRepository,
    {
      centerRef: batch.centerRef,
      accountAlias: batch.accountAlias,
      acquisitionEnabled: true,
    },
  );
  const work = (index = 0, executionChannel: "API" | "WEB" = "WEB") => ({
    runId,
    cycleId,
    sampleId: contexts[index]!.sampleId,
    attemptNumber: 1,
    executionChannel,
  });
  const ready = (index = 0, modify: Record<string, unknown> = {}) => {
    snapshot.items[index] = {
      itemId: contexts[index]!.sampleId,
      state: "RESULT_AVAILABLE",
      result: {
        kind: "web",
        answer: "完整原始回答 " + (index + 1),
        assistantRole: true,
        nonEchoVerified: true,
        completion: { status: "COMPLETE" },
        readingText: "表格：烤鸭价格228元。",
        content: {
          version: 2,
          blocks: [
            {
              type: "table",
              rows: [
                ["餐厅", "烤鸭"],
                ["花悦庭", "228元"],
              ],
            },
          ],
          sources: [
            {
              id: "s1",
              url: "https://source.fixture.invalid",
              title: "页面信源",
            },
          ],
        },
        images: [
          {
            id: "img1",
            src: "https://source.fixture.invalid/image",
            alt: "烤鸭",
          },
        ],
        ...modify,
      },
    };
    return snapshot;
  };
  return {
    coordinator,
    repository,
    ai,
    web,
    notifications,
    contexts,
    batch,
    accepted,
    parserRequests,
    apiOutput,
    work,
    ready,
    snapshot: () => snapshot,
  };
}
describe("P4 independent per-item sampling coordinator", () => {
  it.each(["already-accepted", "report-advanced"] as const)(
    "finishes late Web technical facts after API won and context is %s without another Parser",
    async (state) => {
      const h = fixture();
      await h.coordinator.acquire(h.work());
      await h.coordinator.acquire(h.work(0, "API"));
      expect(h.parserRequests.size).toBe(1);
      h.ready(0);
      if (state === "report-advanced")
        h.repository.getSampleContext.mockResolvedValue(undefined as never);
      await h.coordinator.reconcileWeb();
      expect(h.ai.recordExternal).toHaveBeenCalledWith(
        expect.objectContaining({
          executionChannel: "WEB",
          sampleId: h.contexts[0]!.sampleId,
        }),
        expect.objectContaining({
          kind: "SUCCEEDED",
          output: expect.objectContaining({ content: expect.any(Object) }),
        }),
        37,
      );
      expect(h.accepted).toHaveLength(1);
      expect(h.accepted[0]!.attemptId).toBe("api-attempt");
      expect(h.parserRequests.size).toBe(1);
      expect(h.repository.scheduleSamplingFallback).not.toHaveBeenCalled();
      expect(h.batch.items[0]!.processedAt).not.toBeNull();
      expect(h.web.submitBatch).toHaveBeenCalledTimes(1);
      expect(h.web.readBatch).toHaveBeenCalledTimes(1);
    },
  );
  it("keeps a DIRECT defer without a receipt deferred instead of losing the original work", async () => {
    const h = fixture();
    const defer = { kind: "DEFERRED", resumeAt: new Date(Date.now() + 1000) };
    h.ai.execute.mockResolvedValue(defer as never);
    expect(await h.coordinator.acquire(h.work(0, "API"))).toEqual(defer);
    expect(h.notifications.findByRequest).toHaveBeenCalledWith({
      cycleId: h.batch.cycleId,
      sampleId: h.contexts[0]!.sampleId,
      purpose: "EVALUATION_ACQUISITION",
      attemptNumber: 1,
      executionChannel: "API",
    });
    expect(h.repository.acceptEvidence).not.toHaveBeenCalled();
  });
  it("completes a lost-ACK API defer only after a durable receipt proves recovery ownership", async () => {
    const h = fixture();
    h.notifications.findByRequest.mockResolvedValue({
      id: "durable-receipt",
    } as never);
    h.ai.execute.mockResolvedValue({
      kind: "DEFERRED",
      resumeAt: new Date(Date.now() + 1000),
    } as never);
    expect(await h.coordinator.acquire(h.work(0, "API"))).toEqual({
      kind: "COMPLETED",
    });
    expect(h.notifications.findByRequest).toHaveBeenCalledTimes(2);
  });
  it("reuses the exact persisted web request and key on backstop recovery after lost ACK", async () => {
    const h = fixture();
    h.ready(0);
    h.web.submitBatch.mockRejectedValueOnce(
      new ExecutionCenterClientError("NETWORK_ERROR", undefined, true),
    );
    await h.coordinator.acquire(h.work());
    expect(h.batch.externalTaskId).toBeNull();
    expect(h.repository.scheduleSamplingFallback).not.toHaveBeenCalled();
    const original = structuredClone(h.web.submitBatch.mock.calls[0]![0]);
    await h.coordinator.reconcileWeb();
    expect(h.web.submitBatch).toHaveBeenCalledTimes(2);
    expect(h.web.submitBatch.mock.calls[1]![0]).toEqual(original);
    expect(h.web.readBatch).not.toHaveBeenCalled();
    expect(h.accepted.map((row) => row.sampleId)).toEqual([
      h.contexts[0]!.sampleId,
    ]);
  });
  it("accepts the first rich result immediately without waiting for three RUNNING items or reset", async () => {
    const h = fixture();
    h.ready(0);
    await h.coordinator.acquire(h.work());
    expect(h.accepted).toHaveLength(1);
    expect(h.accepted[0]!.evidence).toMatchObject({
      answerContent: "完整原始回答 1",
      readingText: "表格：烤鸭价格228元。",
      content: {
        version: 2,
        sources: [{ url: "https://source.fixture.invalid" }],
      },
      images: [{ src: "https://source.fixture.invalid/image" }],
      sourceMetadata: [{ url: "https://source.fixture.invalid" }],
    });
    expect(
      h.batch.items
        .slice(1)
        .every((item) => item.state === "WAITING" && item.processedAt === null),
    ).toBe(true);
    expect(h.parserRequests.size).toBe(1);
    expect(h.web.submitBatch.mock.calls[0]![0]).toEqual({
      idempotencyKey: h.batch.idempotencyKey,
      request: h.batch.request,
    });
    expect(h.batch.request.items.map((item) => item.userPrompt)).toEqual(
      h.contexts.map((context) => context.query),
    );
  });
  it("does not exhaust or retry the sample after API failure, so its Web answer can still win", async () => {
    const h = fixture();
    h.ai.execute.mockResolvedValue({
      kind: "FAILED",
      attemptId: "api-failed",
      failureClass: "AUTHENTICATION_FAILED",
      retryable: false,
    } as never);
    await h.coordinator.acquire(h.work(0, "API"));
    expect(h.contexts[0]!.status).toBe("PENDING");
    expect(h.repository.exhaustStage).not.toHaveBeenCalled();
    expect(h.repository.scheduleRetry).not.toHaveBeenCalled();
    h.ready(0);
    await h.coordinator.acquire(h.work());
    expect(h.accepted[0]!.attemptId).toBe("web-attempt");
    expect(h.parserRequests.size).toBe(1);
  });
  it.each(["echo", "partial", "no-assistant"] as const)(
    "rejects %s capture and triggers fallback only for its own question",
    async (kind) => {
      const h = fixture();
      h.ready(
        0,
        kind === "echo"
          ? { answer: h.contexts[0]!.query }
          : kind === "partial"
            ? { completion: { status: "UNCONFIRMED" } }
            : { assistantRole: false },
      );
      await h.coordinator.acquire(h.work());
      expect(h.accepted).toHaveLength(0);
      expect(h.ai.recordExternal).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleId: h.contexts[0]!.sampleId,
          executionChannel: "WEB",
        }),
        expect.objectContaining({ kind: "FAILED", retryable: false }),
        37,
      );
      expect(h.repository.scheduleSamplingFallback).toHaveBeenCalledTimes(1);
      expect(h.repository.scheduleSamplingFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleId: h.contexts[0]!.sampleId,
          reason: "WEB_UNAVAILABLE",
        }),
      );
      expect(
        h.batch.items.slice(1).every((item) => item.processedAt === null),
      ).toBe(true);
    },
  );
  it("preserves native success input and output when using the same acceptance port", async () => {
    const h = fixture();
    await h.coordinator.acquire(h.work(0, "API"));
    expect(h.ai.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        executionChannel: "API",
        deadlineAt: h.batch.deadlineAt.getTime(),
        input: expect.objectContaining({
          query: h.contexts[0]!.query,
          systemInstruction: h.contexts[0]!.objectivityInstruction,
          province: "广东省",
          city: "广州市",
        }),
      }),
    );
    const { kind: _kind, ...evidence } = h.apiOutput;
    expect(h.accepted[0]!.evidence).toEqual(evidence);
  });
  it("delegates concurrent Web/API winner selection to one unique acceptance port without a second Parser", async () => {
    const h = fixture();
    h.ready(0);
    await Promise.all([
      h.coordinator.acquire(h.work(0, "API")),
      h.coordinator.acquire(h.work()),
    ]);
    expect(h.accepted).toHaveLength(1);
    expect(h.parserRequests.size).toBe(1);
    expect(h.contexts[0]!.status).toBe("EVIDENCE_ACCEPTED");
  });
  it.each(["expired", "closed"] as const)(
    "does not send either channel after the sampling window is %s",
    async (state) => {
      const h = fixture();
      const window = h.contexts[0]!.samplingWindow!;
      if (state === "expired") window.deadlineAt = new Date(Date.now() - 1);
      else window.closedAt = new Date();
      await h.coordinator.acquire(h.work());
      await h.coordinator.acquire(h.work(0, "API"));
      expect(h.web.submitBatch).not.toHaveBeenCalled();
      expect(h.ai.execute).not.toHaveBeenCalled();
      expect(h.repository.closeSamplingAtDeadline).toHaveBeenCalledTimes(2);
    },
  );
  it("processes only the notified item even if the same snapshot already contains another ready answer", async () => {
    const h = fixture();
    h.ready(0);
    const snapshot = h.ready(1);
    h.notifications.readNotification.mockResolvedValue({
      event: {
        callerRequestRef: h.batch.callerRequestRef,
        itemId: h.contexts[1]!.sampleId,
      },
      snapshot,
    });
    await h.coordinator.processNotification({
      centerRef: h.batch.centerRef,
      cursor: 1,
    });
    expect(h.accepted.map((row) => row.sampleId)).toEqual([
      h.contexts[1]!.sampleId,
    ]);
    expect(h.contexts[0]!.status).toBe("PENDING");
    expect(h.batch.items[0]!.processedAt).toBeNull();
    expect(h.parserRequests.size).toBe(1);
  });
});
