import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it, vi } from "vitest";
import type {
  ExecutionCenterEvent,
  ExecutionCenterReceiptRepository,
  ExecutionCenterTaskSnapshot,
} from "../src/ai-execution/domain/execution-center-receipt.repository.js";
import type { DelegatedParserExecutionService } from "../src/ai-execution/application/delegated-parser-execution.service.js";
import type { ExecutionCenterClient } from "../src/ai-execution/infrastructure/execution-center.client.js";
import { ExecutionCenterEventRuntime } from "../src/ai-execution/infrastructure/execution-center-event.runtime.js";
function event(
  cursor: number,
  channel: "api" | "web",
  callerRequestRef: string,
): ExecutionCenterEvent {
  return {
    cursor,
    seq: cursor,
    channel,
    callerRequestRef,
    taskId: "task-" + cursor,
    itemId: "item-" + cursor,
    type: "RESULT_AVAILABLE",
    at: cursor,
  };
}
function body(value: ExecutionCenterEvent): ExecutionCenterTaskSnapshot {
  return {
    contractVersion: "execution.v1",
    taskId: value.taskId,
    callerRequestRef: value.callerRequestRef,
    channel: value.channel,
    deadlineAt: 130000,
    items: [
      {
        itemId: value.itemId,
        state: "RESULT_AVAILABLE",
        result: { kind: value.channel },
      },
    ],
  };
}
async function until(predicate: () => boolean) {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("runtime fixture timeout");
    await delay(5);
  }
}
function untilAborted(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}
function receipts() {
  let cursor = 0;
  const committed: ExecutionCenterEvent[] = [];
  return {
    committed,
    readCursor: vi.fn(async () => cursor),
    consumeEvent: vi.fn(
      async (input: {
        expectedCursor: number;
        event: ExecutionCenterEvent;
        snapshot?: ExecutionCenterTaskSnapshot;
      }) => {
        expect(input.expectedCursor).toBe(cursor);
        cursor = input.event.cursor;
        committed.push(input.event);
        return { cursor, receipt: null, queuedResume: true, duplicate: false };
      },
    ),
  };
}
describe("P4 single resident notification runtime", () => {
  it("keeps local READY recovery active without configured credentials and never opens SSE", async () => {
    const store = receipts();
    const parser = { reconcile: vi.fn(async () => 1) };
    const runtime = new ExecutionCenterEventRuntime(
      store as unknown as ExecutionCenterReceiptRepository,
      null,
      parser as unknown as DelegatedParserExecutionService,
      undefined,
    );
    runtime.onApplicationBootstrap();
    try {
      await until(() => parser.reconcile.mock.calls.length === 1);
      expect(store.readCursor).not.toHaveBeenCalled();
      expect(store.consumeEvent).not.toHaveBeenCalled();
    } finally {
      await runtime.onModuleDestroy();
    }
  });
  it("consumes a ready native Acquisition only after the single durable Inbox cursor commits", async () => {
    const store = receipts();
    const value = event(1, "api", "geo:acquisition:attempt");
    const readyReceipt = {
      id: "receipt",
      attemptId: "attempt",
      state: "READY",
      business: { purpose: "EVALUATION_ACQUISITION" },
    };
    const commit = store.consumeEvent.getMockImplementation()!;
    store.consumeEvent.mockImplementation(
      async (input) =>
        ({ ...(await commit(input)), receipt: readyReceipt }) as never,
    );
    const parser = {
      reconcile: vi.fn(async () => 0),
      consumeReadyAcquisition: vi.fn(async (receipt) => {
        expect(receipt).toBe(readyReceipt);
        expect(await store.readCursor()).toBe(1);
        return { kind: "SUCCEEDED" };
      }),
    };
    const client = {
      readTask: vi.fn(async () => body(value)),
      events: vi.fn(
        async (
          _after: number,
          consume: (event: ExecutionCenterEvent) => Promise<void>,
          signal: AbortSignal,
        ) => {
          await consume(value);
          await untilAborted(signal);
        },
      ),
    };
    const runtime = new ExecutionCenterEventRuntime(
      store as unknown as ExecutionCenterReceiptRepository,
      client as unknown as ExecutionCenterClient,
      parser as unknown as DelegatedParserExecutionService,
      "fixture",
    );
    runtime.onApplicationBootstrap();
    try {
      await until(() => parser.consumeReadyAcquisition.mock.calls.length === 1);
      expect(store.consumeEvent).toHaveBeenCalledTimes(1);
      expect(client.readTask).toHaveBeenCalledTimes(1);
    } finally {
      await runtime.onModuleDestroy();
    }
  });
  it("shares one ordered cursor across API/web and never blocks on an unregistered foreign web result", async () => {
    const store = receipts();
    const events = [
      event(1, "web", "foreign:task"),
      event(2, "api", "geo:parser:attempt"),
      event(3, "web", "geo:web:00000000-0000-4000-8000-000000000169"),
    ];
    const client = {
      readTask: vi.fn(async (taskId: string) =>
        body(events.find((row) => row.taskId === taskId)!),
      ),
      events: vi.fn(
        async (
          after: number,
          consume: (event: ExecutionCenterEvent) => Promise<void>,
          signal: AbortSignal,
        ) => {
          for (const value of events)
            if (value.cursor > after) await consume(value);
          await untilAborted(signal);
        },
      ),
    };
    const parser = { reconcile: vi.fn(async () => 0) };
    const runtime = new ExecutionCenterEventRuntime(
      store as unknown as ExecutionCenterReceiptRepository,
      client as unknown as ExecutionCenterClient,
      parser as unknown as DelegatedParserExecutionService,
      "fixture",
    );
    runtime.onApplicationBootstrap();
    try {
      await until(() => store.committed.length === 3);
      expect(client.events).toHaveBeenCalledTimes(1);
      expect(client.readTask.mock.calls.map(([task]) => task)).toEqual([
        "task-2",
        "task-3",
      ]);
      expect(store.consumeEvent.mock.calls[0]![0]).not.toHaveProperty(
        "snapshot",
      );
      expect(store.consumeEvent.mock.calls[2]![0].snapshot).toEqual(
        body(events[2]!),
      );
    } finally {
      await runtime.onModuleDestroy();
    }
  });
  it("replays the same terminal event and cursor after GET failure instead of losing completion", async () => {
    const store = receipts();
    const ready = event(
      7,
      "web",
      "geo:web:00000000-0000-4000-8000-000000000169",
    );
    const starts: number[] = [];
    const client = {
      readTask: vi
        .fn()
        .mockRejectedValueOnce(new Error("transient read network failure"))
        .mockResolvedValue(body(ready)),
      events: vi.fn(
        async (
          after: number,
          consume: (event: ExecutionCenterEvent) => Promise<void>,
          signal: AbortSignal,
        ) => {
          starts.push(after);
          await consume(ready);
          await untilAborted(signal);
        },
      ),
    };
    const runtime = new ExecutionCenterEventRuntime(
      store as unknown as ExecutionCenterReceiptRepository,
      client as unknown as ExecutionCenterClient,
      {
        reconcile: async () => 0,
      } as unknown as DelegatedParserExecutionService,
      "fixture",
    );
    runtime.onApplicationBootstrap();
    try {
      await until(() => store.committed.length === 1);
      expect(starts).toEqual([0, 0]);
      expect(client.readTask).toHaveBeenCalledTimes(2);
      expect(store.consumeEvent).toHaveBeenCalledTimes(1);
    } finally {
      await runtime.onModuleDestroy();
    }
  });
  it("delivers a fresh web item while the independent API receipt reconciliation is still waiting", async () => {
    const store = receipts();
    const ready = event(
      1,
      "web",
      "geo:web:00000000-0000-4000-8000-000000000169",
    );
    let release!: () => void;
    const pending = new Promise<number>((resolve) => {
      release = () => resolve(0);
    });
    const parser = { reconcile: vi.fn(async () => pending) };
    const client = {
      readTask: vi.fn(async () => body(ready)),
      events: vi.fn(
        async (
          _after: number,
          consume: (event: ExecutionCenterEvent) => Promise<void>,
          signal: AbortSignal,
        ) => {
          await consume(ready);
          await untilAborted(signal);
        },
      ),
    };
    const runtime = new ExecutionCenterEventRuntime(
      store as unknown as ExecutionCenterReceiptRepository,
      client as unknown as ExecutionCenterClient,
      parser as unknown as DelegatedParserExecutionService,
      "fixture",
    );
    runtime.onApplicationBootstrap();
    try {
      await until(() => store.committed.length === 1);
      expect(parser.reconcile).toHaveBeenCalledTimes(1);
    } finally {
      release();
      await runtime.onModuleDestroy();
    }
  });
});
