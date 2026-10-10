import { Injectable } from "@nestjs/common";
import { z } from "zod";

import {
  normalizeBrowserSamplingFailureCode,
  type BrowserSamplingBatchState,
  type BrowserSamplingGateway,
  type BrowserSamplingItem,
  BrowserSamplingTransportError,
} from "../domain/browser-sampling.gateway.js";
import type { BrowserSamplingConfig } from "./browser-sampling.config.js";

const taskEnvelopeSchema = z
  .object({ task: z.object({ id: z.string().min(1) }).passthrough() })
  .passthrough();

const statusSchema = z.object({ status: z.string().min(1) }).passthrough();

const itemSchema = z
  .object({
    index: z.number().int().min(0),
    status: z.string().optional(),
    completionStatus: z.string().optional(),
    answer: z.string().nullable().optional(),
    collectionSlaMet: z.boolean().nullable().optional(),
    capturedAtMs: z.number().nullable().optional(),
    timings: z.record(z.string(), z.unknown()).nullable().optional(),
    resetReady: z.boolean().optional(),
    failureCode: z.string().nullable().optional(),
    failureMessage: z.string().nullable().optional(),
  })
  .passthrough();

const resultSchema = z
  .object({
    status: z.enum(["SUCCEEDED", "FAILED", "CANCELLED"]),
    result: z
      .object({
        items: z.array(itemSchema).optional(),
        collectionElapsedMs: z.number().nullable().optional(),
      })
      .nullable()
      .optional(),
    failureCode: z.string().nullable().optional(),
    failureMessage: z.string().nullable().optional(),
  })
  .passthrough();

@Injectable()
export class HttpBrowserSamplingGateway implements BrowserSamplingGateway {
  constructor(
    private readonly config: Extract<
      BrowserSamplingConfig,
      { mode: "browser-control-plane" }
    >,
  ) {}

  async submitBatch(input: {
    platform: string;
    accountId: string;
    prompts: string[];
    idempotencyKey: string;
    collectionDeadlineMs: number;
  }): Promise<{ externalTaskId: string }> {
    const response = taskEnvelopeSchema.parse(
      await this.request("/api/v1/tasks", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify({
          platform: input.platform,
          accountId: input.accountId,
          prompts: input.prompts,
          collectionDeadlineMs: input.collectionDeadlineMs,
          executionMode: "real",
        }),
      }),
    );
    return { externalTaskId: response.task.id };
  }

  async readBatch(externalTaskId: string): Promise<BrowserSamplingBatchState> {
    const task = statusSchema.parse(
      await this.request(
        `/api/v1/tasks/${encodeURIComponent(externalTaskId)}/status`,
      ),
    );
    if (!isTerminal(task.status)) {
      return { kind: "RUNNING", status: task.status };
    }
    const terminal = resultSchema.parse(
      await this.request(
        `/api/v1/tasks/${encodeURIComponent(externalTaskId)}/result`,
      ),
    );
    return {
      kind: "TERMINAL",
      status: terminal.status,
      items: (terminal.result?.items ?? []).map(normalizeItem),
      collectionElapsedMs: terminal.result?.collectionElapsedMs ?? null,
      failureCode: terminal.failureCode
        ? normalizeBrowserSamplingFailureCode(terminal.failureCode)
        : null,
      failureMessage: terminal.failureMessage ?? null,
    };
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const headers = new Headers(init.headers);
    if (this.config.bearerToken) {
      headers.set("authorization", `Bearer ${this.config.bearerToken}`);
    }
    let response: Response;
    try {
      response = await fetch(new URL(path, this.config.baseUrl), {
        ...init,
        headers,
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      });
    } catch {
      throw new BrowserSamplingTransportError("Control plane unavailable");
    }
    if (!response.ok) {
      throw new BrowserSamplingTransportError(
        `Control plane returned HTTP ${response.status}`,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new BrowserSamplingTransportError(
        "Control plane returned unreadable JSON",
      );
    }
  }
}

function isTerminal(
  status: string,
): status is "SUCCEEDED" | "FAILED" | "CANCELLED" {
  return ["SUCCEEDED", "FAILED", "CANCELLED"].includes(status);
}

function normalizeItem(input: z.infer<typeof itemSchema>): BrowserSamplingItem {
  const answer = input.answer?.trim() ?? "";
  const completionStatus =
    input.completionStatus === "CAPTURED_LATE"
      ? "CAPTURED_LATE"
      : input.completionStatus === "CAPTURED" || input.status === "SUCCEEDED"
        ? "CAPTURED"
        : "FAILED";
  const common = {
    index: input.index,
    capturedAtMs: input.capturedAtMs ?? null,
    timings: input.timings ?? null,
    resetReady: input.resetReady === true,
  };
  if (completionStatus !== "FAILED" && answer) {
    return {
      ...common,
      completionStatus,
      answer,
      collectionSlaMet: input.collectionSlaMet === true,
      assistantRoleVerified: true,
      nonEchoVerified: true,
    };
  }
  return {
    ...common,
    completionStatus: "FAILED",
    failureCode: normalizeBrowserSamplingFailureCode(input.failureCode),
    failureMessage: input.failureMessage ?? null,
    collectionSlaMet: false,
  };
}
