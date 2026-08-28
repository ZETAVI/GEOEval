import type { MessageEvent } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedRequest } from "../src/identity/presentation/session-http.js";
import { NotificationService } from "../src/notification/application/notification.service.js";
import { NotificationController } from "../src/notification/presentation/notification.controller.js";
import { ReadinessState } from "../src/readiness.js";

describe("notification SSE refresh boundary", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.GEOEVAL_SHUTDOWN_GRACE_MS;
  });

  it("emits only distinct durable revisions and completes on shutdown", async () => {
    vi.useFakeTimers();
    const revisions = [
      { latestNotificationId: "first", unreadCount: 1 },
      { latestNotificationId: "first", unreadCount: 1 },
      { latestNotificationId: "second", unreadCount: 2 },
    ];
    let revisionIndex = 0;
    const service = {
      revision: async () =>
        revisions[Math.min(revisionIndex++, revisions.length - 1)]!,
    } as NotificationService;
    const readiness = new ReadinessState();
    const controller = new NotificationController(service, readiness);
    const events: MessageEvent[] = [];
    let completed = false;

    controller
      .events({ geoevalAccount: { id: "account-id" } } as AuthenticatedRequest)
      .subscribe({
        next: (event) => events.push(event),
        complete: () => {
          completed = true;
        },
      });

    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual([
      {
        type: "refresh",
        data: { latestNotificationId: "first", unreadCount: 1 },
      },
    ]);
    expect(JSON.stringify(events)).not.toContain("title");
    expect(JSON.stringify(events)).not.toContain("summary");

    await vi.advanceTimersByTimeAsync(2_000);
    expect(events).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(events.at(-1)).toEqual({
      type: "refresh",
      data: { latestNotificationId: "second", unreadCount: 2 },
    });

    process.env.GEOEVAL_SHUTDOWN_GRACE_MS = "0";
    const shutdown = readiness.beforeApplicationShutdown();
    await vi.advanceTimersByTimeAsync(0);
    await shutdown;
    expect(completed).toBe(true);
  });
});
