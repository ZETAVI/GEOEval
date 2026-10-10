import { setTimeout as delay } from "node:timers/promises";
import { afterEach, describe, expect, it } from "vitest";
import type {
  ExecutionCenterEvent,
  ExecutionCenterStoredRequest,
  ExecutionCenterWebStoredRequest,
} from "../src/ai-execution/domain/execution-center-receipt.repository.js";
import { ExecutionCenterClient } from "../src/ai-execution/infrastructure/execution-center.client.js";
import { ExecutionCenterBrowserSamplingGateway } from "../src/ai-execution/infrastructure/execution-center-browser-sampling.gateway.js";
import {
  p4FixtureRichAnswer,
  startP4CenterHost,
  type P4CenterHost,
} from "./fixtures/p4-center-host.js";

// This opt-in suite imports the actual producer production entry. A protocol
// fixture is not equivalent evidence; CI without that checkout explicitly skips.
const actualProducerRoot = process.env.EXECUTION_CENTER_FIXTURE_ROOT;
const hosts: P4CenterHost[] = [];
const streams: Array<{
  controller: AbortController;
  completion: Promise<void>;
}> = [];
afterEach(async () => {
  for (const stream of streams.splice(0)) {
    stream.controller.abort();
    await stream.completion;
  }
  for (const host of hosts.splice(0)) await host.close();
});

function client(host: P4CenterHost, token = "synthetic-caller-key") {
  return new ExecutionCenterClient({
    centerRef: "p4-production-fixture",
    baseUrl: host.baseUrl,
    callerToken: token,
  });
}
function webRequest(): ExecutionCenterWebStoredRequest {
  return {
    contractVersion: "execution.v1",
    callerRequestRef: "geo:web:production-fixture",
    channel: "web",
    platform: "qwen",
    accountAlias: "primary",
    deadlineAt: Date.now() + 20_000,
    items: Array.from({ length: 4 }, (_, index) => ({
      itemId: "qwen-item-" + index,
      userPrompt: " 原题 " + index + " 🦆\n不增加背景。 ",
    })),
  };
}
async function until<T>(read: () => T | Promise<T>): Promise<NonNullable<T>> {
  for (let index = 0; index < 200; index++) {
    const result = await read();
    if (result) return result as NonNullable<T>;
    await delay(10);
  }
  throw new Error("ACTUAL_PRODUCTION_BOUNDARY_TIMEOUT");
}
async function hostFixture(
  options: Parameters<typeof startP4CenterHost>[1] = {},
) {
  const host = await startP4CenterHost(async () => ({ fixture: true }), {
    ...options,
    composition: "production-host",
  });
  hosts.push(host);
  expect(host.implementation).toBe("production-host");
  expect(host.production!.identityOwnerShared).toBe(true);
  return host;
}

describe.skipIf(!actualProducerRoot)(
  "GEO Client -> actual production Host (synthetic Actor/Provider, no TLS proof)",
  () => {
    it("authenticates POST/GET/SSE before writes and keeps another caller outside the task", async () => {
      const host = await hostFixture();
      const invalid = client(host, "synthetic-invalid-token");
      const request = webRequest();
      await expect(
        invalid.submitWeb("unauthorized", request),
      ).rejects.toMatchObject({
        code: "HTTP_REJECTED",
        httpStatus: 401,
        outcomeUnknown: false,
      });
      await expect(
        invalid.readWeb("execution-not-found"),
      ).rejects.toMatchObject({
        code: "HTTP_REJECTED",
        httpStatus: 401,
      });
      await expect(
        invalid.events(0, async () => {}, new AbortController().signal),
      ).rejects.toMatchObject({
        code: "HTTP_REJECTED",
        httpStatus: 401,
      });
      expect(host.production!.executionCount()).toBe(0);
      const task = await client(host).submitWeb("authorized", request);
      const other = client(host, "synthetic-other-key");
      await expect(other.readWeb(task.taskId)).rejects.toMatchObject({
        code: "HTTP_REJECTED",
        httpStatus: 404,
      });
      await expect(
        other.submitWeb("other-caller", request),
      ).rejects.toMatchObject({
        code: "HTTP_REJECTED",
        httpStatus: 403,
        outcomeUnknown: false,
      });
      expect(host.production!.executionCount()).toBe(1);
    });

    it("notifies and exposes the first rich item before three siblings or cleanup without changing questions", async () => {
      const host = await hostFixture();
      const transport = client(host);
      const gateway = new ExecutionCenterBrowserSamplingGateway(transport);
      const request = webRequest();
      const events: ExecutionCenterEvent[] = [];
      const controller = new AbortController();
      streams.push({
        controller,
        completion: transport.events(
          0,
          async (event) => {
            events.push(event);
          },
          controller.signal,
        ),
      });
      const submitted = await gateway.submitBatch({
        idempotencyKey: "first-rich",
        request,
      });
      await until(() =>
        events.find(
          (event) =>
            event.type === "RESULT_AVAILABLE" && event.itemId === "qwen-item-0",
        ),
      );
      const snapshot = await gateway.readBatch(submitted.taskId);
      expect(snapshot.items.map((item) => item.state)).toEqual([
        "RESULT_AVAILABLE",
        "RUNNING",
        "RUNNING",
        "RUNNING",
      ]);
      expect(snapshot.items[0]!.resourceState).toBe("RESETTING");
      expect(snapshot.items[0]!.result).toMatchObject(
        p4FixtureRichAnswer("qwen"),
      );
      expect(host.webCalls).toHaveLength(1);
      expect(host.webCalls[0]!.items.map((item) => item.prompt)).toEqual(
        request.items.map((item) => item.userPrompt),
      );
      expect(host.providerCalls).toHaveLength(0);
      expect(
        events.every(
          (event, index) =>
            index === 0 || event.cursor > events[index - 1]!.cursor,
        ),
      ).toBe(true);
      expect(JSON.stringify(events)).not.toContain("本地夹具");
      expect(JSON.stringify(events)).not.toContain("source.fixture");
      expect(JSON.stringify(events)).not.toContain("synthetic-");
    });

    it("replays the same task and preserves schema1 history while the one writer blocks maintenance until actual release", async () => {
      const host = await hostFixture();
      const legacy = host.production!;
      const oldTask = legacy.legacyTask();
      expect(legacy.schemaVersion()).toBe(1);
      expect(oldTask.result.answer).toBe("历史回答保留");
      expect(legacy.legacyAccount()).toMatchObject({
        label: "旧 schema1 账号",
        loginStatus: "READY",
        snapshotVersion: "legacy-preserved",
      });
      const transport = client(host);
      const request = webRequest();
      const task = await transport.submitWeb("stable-key", request);
      await until(
        async () =>
          (await transport.readWeb(task.taskId)).items[0]!.state ===
          "RESULT_AVAILABLE",
      );
      expect((await transport.submitWeb("stable-key", request)).taskId).toBe(
        task.taskId,
      );
      const different = structuredClone(request);
      different.items[0]!.userPrompt = "另一个问题";
      await expect(
        transport.submitWeb("stable-key", different),
      ).rejects.toMatchObject({
        code: "HTTP_REJECTED",
        httpStatus: 409,
        outcomeUnknown: false,
      });
      expect(host.webCalls).toHaveLength(1);
      expect(legacy.executionCount()).toBe(1);
      expect(legacy.replayLegacyTask().id).toBe(oldTask.id);
      expect(legacy.legacyTask().result.answer).toBe(oldTask.result.answer);
      expect(legacy.activeWriter()).toBe(true);
      expect(() => legacy.beginMaintenance()).toThrow(/active task lease/);
      host.releaseSiblings();
      await until(async () =>
        (await transport.readWeb(task.taskId)).items.every(
          (item) => item.state === "RESULT_AVAILABLE",
        ),
      );
      expect(legacy.activeWriter()).toBe(true);
      expect(() => legacy.beginMaintenance()).toThrow(/active task lease/);
      host.releaseCleanup();
      await until(() => !legacy.activeWriter());
      expect(() => legacy.beginMaintenance()).not.toThrow();
      expect(legacy.schemaVersion()).toBe(1);
    });

    it("keeps native 429 and Web failure codes while API's separate budget leaves all four Web pages free to finish", async () => {
      const rawBody =
        ' \n{"error":{"code":"rate_limit","message":"本地响应🦆"},"model":"fixture-native","usage":{"input_tokens":3,"output_tokens":4}}\n ';
      const host = await hostFixture({
        nativeResponse: {
          status: 429,
          rawBody,
          headers: { "retry-after": "2", "x-request-id": "fixture-native-id" },
        },
        webFailureItemIndex: 3,
      });
      host.blockedPlatforms.add("qwen");
      const transport = client(host);
      const web = await transport.submitWeb("web-held", webRequest());
      await until(() => host.webCalls.length === 1);
      const body = {
        model: "fixture-native",
        messages: [{ role: "user", content: " 原题 API 🦆\n " }],
        enable_search: false,
        thinking: { type: "disabled" },
      };
      const apiRequest: ExecutionCenterStoredRequest = {
        contractVersion: "execution.v1",
        callerRequestRef: "geo:api:production-fixture",
        channel: "api",
        deadlineAt: Date.now() + 20_000,
        items: [{ itemId: "native-api" }],
        api: {
          endpointRef: "fixture",
          endpointVersion: "1",
          operation: "chat",
          bodyEncoding: "json",
          body,
          headers: { "Content-Type": "application/json" },
        },
      };
      const api = await transport.submit("native-429", apiRequest);
      const apiResult = await until(async () => {
        const result = (await transport.read(api.taskId)).items[0]!;
        return result.state === "RESULT_AVAILABLE" && result.result;
      });
      expect(apiResult).toMatchObject({
        kind: "api",
        transportStatus: "RESPONSE_RECEIVED",
        httpStatus: 429,
        rawBody,
        safeHeaders: {
          "retry-after": "2",
          "x-request-id": "fixture-native-id",
        },
        usageObservation: {
          status: "reported",
          inputTokens: 3,
          outputTokens: 4,
        },
      });
      expect(host.providerCalls).toEqual([
        { body, authorization: "Bearer synthetic-provider-key" },
      ]);
      expect(
        (await transport.readWeb(web.taskId)).items.every(
          (item) => item.state === "RUNNING",
        ),
      ).toBe(true);
      host.releaseSiblings();
      const completed = await until(async () => {
        const task = await transport.readWeb(web.taskId);
        return task.status === "COMPLETED" && task;
      });
      expect(
        completed.items
          .slice(0, 3)
          .every((item) => item.state === "RESULT_AVAILABLE"),
      ).toBe(true);
      expect(completed.items[3]).toMatchObject({
        state: "OUTCOME_UNKNOWN",
        error: { code: "DOM_DRIFT" },
      });
      expect(host.providerCalls).toHaveLength(1);
      expect(host.webCalls).toHaveLength(1);
    });
  },
);
