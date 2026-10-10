import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it, vi } from "vitest";
import type { EvaluationProcessRepository } from "../src/geo-intelligence/domain/evaluation-process.repository.js";
import type { ExecutionCenterSamplingCoordinator } from "../src/geo-intelligence/application/execution-center-sampling.coordinator.js";
import { ExecutionCenterSamplingRuntime } from "../src/geo-intelligence/infrastructure/execution-center-sampling.runtime.js";

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function until(predicate: () => boolean) {
  const deadline = Date.now() + 1500;
  while (!predicate()) {
    if (Date.now() >= deadline)
      throw new Error("sampling runtime fixture timed out");
    await delay(2);
  }
}
function runtime(budget: () => Promise<number>, web: () => Promise<number>) {
  const repository = {
    reconcileSamplingWindows: vi.fn(async (_limit: number) => budget()),
  };
  const coordinator = {
    reconcileWeb: vi.fn(async (_limit: number, _signal?: AbortSignal) => web()),
  };
  return {
    repository,
    coordinator,
    service: new ExecutionCenterSamplingRuntime(
      repository as unknown as EvaluationProcessRepository,
      coordinator as unknown as ExecutionCenterSamplingCoordinator,
      { budgetIntervalMs: 5, webIntervalMs: 5 },
    ),
  };
}

describe("P4 independent sampling budget and web recovery runtime", () => {
  it("starts both paths immediately and keeps budget delivery moving during a slow web reconciliation", async () => {
    const held = gate();
    let webActive = 0;
    let maximumWebActive = 0;
    const h = runtime(
      async () => 1,
      async () => {
        webActive++;
        maximumWebActive = Math.max(maximumWebActive, webActive);
        await held.promise;
        webActive--;
        return 0;
      },
    );
    h.service.onModuleInit();
    try {
      await until(
        () => h.repository.reconcileSamplingWindows.mock.calls.length >= 4,
      );
      expect(h.coordinator.reconcileWeb).toHaveBeenCalledTimes(1);
      expect(
        h.repository.reconcileSamplingWindows.mock.calls.every(
          ([limit]) => limit === 100,
        ),
      ).toBe(true);
      expect(h.coordinator.reconcileWeb).toHaveBeenCalledWith(
        100,
        expect.any(AbortSignal),
      );
      expect(maximumWebActive).toBe(1);
    } finally {
      held.release();
      await h.service.onModuleDestroy();
    }
  });

  it("does not overlap budget ticks or block independent web recovery while one budget transaction is slow", async () => {
    const held = gate();
    let budgetActive = 0;
    let maximumBudgetActive = 0;
    const h = runtime(
      async () => {
        budgetActive++;
        maximumBudgetActive = Math.max(maximumBudgetActive, budgetActive);
        await held.promise;
        budgetActive--;
        return 0;
      },
      async () => 1,
    );
    h.service.onModuleInit();
    try {
      await until(() => h.coordinator.reconcileWeb.mock.calls.length >= 4);
      expect(h.repository.reconcileSamplingWindows).toHaveBeenCalledTimes(1);
      expect(maximumBudgetActive).toBe(1);
    } finally {
      held.release();
      await h.service.onModuleDestroy();
    }
  });

  it("releases each singleflight flag after rejection and retries only on a later tick", async () => {
    let budgetCalls = 0;
    let webCalls = 0;
    let budgetActive = 0;
    let webActive = 0;
    let maximumBudgetActive = 0;
    let maximumWebActive = 0;
    const h = runtime(
      async () => {
        budgetCalls++;
        budgetActive++;
        maximumBudgetActive = Math.max(maximumBudgetActive, budgetActive);
        try {
          await delay(8);
          if (budgetCalls === 1)
            throw new Error("scoped budget transaction failure");
          return 1;
        } finally {
          budgetActive--;
        }
      },
      async () => {
        webCalls++;
        webActive++;
        maximumWebActive = Math.max(maximumWebActive, webActive);
        try {
          await delay(8);
          if (webCalls === 1) throw new Error("scoped web read failure");
          return 1;
        } finally {
          webActive--;
        }
      },
    );
    h.service.onModuleInit();
    try {
      await until(() => budgetCalls >= 3 && webCalls >= 3);
      expect(maximumBudgetActive).toBe(1);
      expect(maximumWebActive).toBe(1);
    } finally {
      await h.service.onModuleDestroy();
    }
  });

  it("clears both tick sources at shutdown and awaits already started work without dispatching more", async () => {
    const held = gate();
    const h = runtime(
      async () => 1,
      async () => {
        await held.promise;
        return 1;
      },
    );
    h.service.onModuleInit();
    await until(() => h.coordinator.reconcileWeb.mock.calls.length === 1);
    const stopSignal = h.coordinator.reconcileWeb.mock.calls[0]![1]!;
    expect(stopSignal.aborted).toBe(false);
    let stopped = false;
    const stopping = h.service.onModuleDestroy().then(() => {
      stopped = true;
    });
    expect(stopSignal.aborted).toBe(true);
    try {
      await delay(15);
      expect(stopped).toBe(false);
      const budgetCalls =
        h.repository.reconcileSamplingWindows.mock.calls.length;
      expect(h.coordinator.reconcileWeb).toHaveBeenCalledTimes(1);
      await delay(15);
      expect(h.repository.reconcileSamplingWindows.mock.calls.length).toBe(
        budgetCalls,
      );
      held.release();
      await stopping;
      await delay(15);
      expect(h.repository.reconcileSamplingWindows.mock.calls.length).toBe(
        budgetCalls,
      );
      expect(h.coordinator.reconcileWeb).toHaveBeenCalledTimes(1);
    } finally {
      held.release();
      await stopping;
    }
  });

  it("can restart after graceful shutdown without retaining old timers or overlapping a path", async () => {
    let active = 0;
    let maximumActive = 0;
    const h = runtime(
      async () => {
        active++;
        maximumActive = Math.max(maximumActive, active);
        try {
          await delay(8);
          return 1;
        } finally {
          active--;
        }
      },
      async () => 1,
    );
    h.service.onModuleInit();
    await until(
      () => h.repository.reconcileSamplingWindows.mock.calls.length >= 2,
    );
    await h.service.onModuleDestroy();
    expect(active).toBe(0);
    const beforeRestart =
      h.repository.reconcileSamplingWindows.mock.calls.length;
    h.service.onModuleInit();
    h.service.onModuleInit(); // Duplicate lifecycle delivery must not install another tick source.
    try {
      await until(
        () =>
          h.repository.reconcileSamplingWindows.mock.calls.length >=
          beforeRestart + 2,
      );
      expect(maximumActive).toBe(1);
    } finally {
      await h.service.onModuleDestroy();
    }
    const stoppedCalls =
      h.repository.reconcileSamplingWindows.mock.calls.length;
    await delay(15);
    expect(h.repository.reconcileSamplingWindows.mock.calls.length).toBe(
      stoppedCalls,
    );
  });

  it("bounds shutdown even when an already started web backstop cannot finish", async () => {
    vi.useFakeTimers();
    const held = gate();
    const h = runtime(
      async () => 1,
      async () => {
        await held.promise;
        return 1;
      },
    );
    try {
      h.service.onModuleInit();
      let stopped = false;
      const stopping = h.service.onModuleDestroy().then(() => {
        stopped = true;
      });
      await vi.advanceTimersByTimeAsync(1999);
      expect(stopped).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      await stopping;
      expect(stopped).toBe(true);
      expect(h.coordinator.reconcileWeb.mock.calls[0]![1]!.aborted).toBe(true);
      expect(h.coordinator.reconcileWeb).toHaveBeenCalledTimes(1);
    } finally {
      held.release();
      await Promise.resolve();
      vi.useRealTimers();
    }
  });
});
