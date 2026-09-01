import { chmod, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AiAttemptAdapter } from "../domain/ai-attempt.adapter.js";
import type { AiAdapterResult } from "../domain/ai-attempt.types.js";
import {
  assertS6ControlledManifestConfirmation,
  publicS6ControlledManifest,
  type S6ControlledBatch,
  type S6ControlledCase,
} from "./s6-controlled-manifest.js";

export type S6ControlledCallSummary = {
  ordinal: number;
  fixtureId: string;
  purpose: string;
  routePolicyId: string;
  providerKey: string;
  requestedModel: string;
  status: "ACCEPTED" | "PROVIDER_FAILED" | "SEMANTIC_REJECTED" | "EXCEPTION";
  durationMs?: number;
  failureClass?: string;
  retryable?: boolean;
  returnedModel?: string;
  requestId?: string;
  finishReason?: string;
  searchObservation?: string;
  sourceCount?: number;
  reasoningEvidenceKind?: string;
  usage?: Record<string, unknown>;
};

export type S6ControlledExecutionSummary = {
  batchId: string;
  startedAt: string;
  finishedAt: string;
  plannedBatchExternalRequests: number;
  startAtOrdinal: number;
  maxExternalRequests: number;
  executedExternalRequests: number;
  stoppedEarly: boolean;
  evidenceDirectory: string;
  calls: S6ControlledCallSummary[];
};

export async function executeS6ControlledBatch(input: {
  batch: S6ControlledBatch;
  adapter: AiAttemptAdapter;
  confirmation: string | undefined;
  evidenceRoot: string;
  startAtOrdinal?: number;
  now?: () => Date;
}): Promise<S6ControlledExecutionSummary> {
  const manifest = publicS6ControlledManifest(input.batch);
  assertS6ControlledManifestConfirmation(manifest, input.confirmation);
  const startAtOrdinal = input.startAtOrdinal ?? 1;
  if (
    !Number.isInteger(startAtOrdinal) ||
    startAtOrdinal < 1 ||
    startAtOrdinal > input.batch.cases.length
  ) {
    throw new Error("S6 controlled start ordinal is outside the batch");
  }
  const selectedCases = input.batch.cases.slice(startAtOrdinal - 1);
  const now = input.now ?? (() => new Date());
  const startedAt = now();
  const evidenceDirectory = await prepareEvidenceDirectory(
    input.evidenceRoot,
    input.batch.id,
    startedAt,
  );
  await writePrivateJson(`${evidenceDirectory}/manifest.json`, manifest);

  const calls: S6ControlledCallSummary[] = [];
  let executedExternalRequests = 0;
  let stoppedEarly = false;

  for (const [index, controlledCase] of selectedCases.entries()) {
    const ordinal = startAtOrdinal + index;
    let result: AiAdapterResult | undefined;
    let privateError: { name: string; message: string } | undefined;
    let validation:
      | { status: "ACCEPTED" }
      | {
          status: "SEMANTIC_REJECTED";
          error: { name: string; message: string };
        }
      | undefined;
    let resolved: ReturnType<AiAttemptAdapter["resolve"]> | undefined;
    let callStartedAt: number | undefined;
    let durationMs: number | undefined;
    try {
      resolved = input.adapter.resolve(controlledCase.request);
      executedExternalRequests += 1;
      callStartedAt = Date.now();
      result = await input.adapter.execute({
        ...controlledCase.request,
        ...resolved,
      });
      durationMs = Date.now() - callStartedAt;
      if (result.kind === "SUCCEEDED") {
        try {
          controlledCase.validateOutput(result.output, result.evidence);
          validation = { status: "ACCEPTED" };
        } catch (error) {
          validation = {
            status: "SEMANTIC_REJECTED",
            error: privateErrorValue(error),
          };
        }
      }
    } catch (error) {
      if (callStartedAt !== undefined) durationMs = Date.now() - callStartedAt;
      privateError = privateErrorValue(error);
    }

    await writePrivateJson(
      `${evidenceDirectory}/${String(ordinal).padStart(2, "0")}-${safeFileName(
        controlledCase.fixtureId,
      )}.json`,
      {
        ordinal,
        fixtureId: controlledCase.fixtureId,
        request: controlledCase.request,
        resolved,
        result,
        durationMs,
        validation,
        error: privateError,
      },
    );

    const summary = publicCallSummary({
      ordinal,
      controlledCase,
      resolved,
      result,
      durationMs,
      validation,
      privateError,
    });
    calls.push(summary);
    if (summary.status !== "ACCEPTED") {
      stoppedEarly = index + 1 < selectedCases.length;
      break;
    }
  }

  const summary: S6ControlledExecutionSummary = {
    batchId: input.batch.id,
    startedAt: startedAt.toISOString(),
    finishedAt: now().toISOString(),
    plannedBatchExternalRequests: manifest.maxExternalRequests,
    startAtOrdinal,
    maxExternalRequests: selectedCases.length,
    executedExternalRequests,
    stoppedEarly,
    evidenceDirectory,
    calls,
  };
  await writePrivateJson(`${evidenceDirectory}/summary.json`, summary);
  return summary;
}

function publicCallSummary(input: {
  ordinal: number;
  controlledCase: S6ControlledCase;
  resolved: ReturnType<AiAttemptAdapter["resolve"]> | undefined;
  result: AiAdapterResult | undefined;
  durationMs: number | undefined;
  validation:
    | { status: "ACCEPTED" }
    | { status: "SEMANTIC_REJECTED"; error: { name: string; message: string } }
    | undefined;
  privateError: { name: string; message: string } | undefined;
}): S6ControlledCallSummary {
  const base = {
    ordinal: input.ordinal,
    fixtureId: input.controlledCase.fixtureId,
    purpose: input.controlledCase.request.purpose,
    routePolicyId: input.controlledCase.request.routePolicyId,
    providerKey: input.resolved?.providerKey ?? "UNRESOLVED",
    requestedModel: input.controlledCase.request.requestedModel,
    ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
  };
  if (input.privateError || !input.result) {
    return { ...base, status: "EXCEPTION" };
  }
  if (input.result.kind === "FAILED") {
    return {
      ...base,
      status: "PROVIDER_FAILED",
      failureClass: input.result.failureClass,
      retryable: input.result.retryable,
      ...(input.result.usage ? { usage: input.result.usage } : {}),
    };
  }
  const evidence = input.result.evidence;
  const sourceMetadata =
    input.result.evidence?.sourceMetadata ??
    (input.controlledCase.request.purpose === "EVALUATION_ACQUISITION"
      ? input.result.output.sourceMetadata
      : undefined);
  return {
    ...base,
    status:
      input.validation?.status === "ACCEPTED"
        ? "ACCEPTED"
        : "SEMANTIC_REJECTED",
    ...(evidence?.returnedModel
      ? { returnedModel: evidence.returnedModel }
      : {}),
    ...(evidence?.requestId ? { requestId: evidence.requestId } : {}),
    ...(evidence?.finishReason ? { finishReason: evidence.finishReason } : {}),
    ...(evidence?.searchObservation
      ? { searchObservation: evidence.searchObservation }
      : {}),
    ...(Array.isArray(sourceMetadata)
      ? { sourceCount: sourceMetadata.length }
      : {}),
    ...(evidence?.reasoningEvidenceKind
      ? { reasoningEvidenceKind: evidence.reasoningEvidenceKind }
      : {}),
    ...(input.result.usage ? { usage: input.result.usage } : {}),
  };
}

async function prepareEvidenceDirectory(
  root: string,
  batchId: string,
  startedAt: Date,
): Promise<string> {
  const normalizedTime = startedAt.toISOString().replaceAll(/[:.]/g, "-");
  const directory = resolve(root, `${normalizedTime}-${safeFileName(batchId)}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  return directory;
}

async function writePrivateJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
}

function privateErrorValue(error: unknown): { name: string; message: string } {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownError", message: String(error) };
}

function safeFileName(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9_-]/g, "-");
}
