import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { AiAttemptAdapter } from "../src/ai-execution/domain/ai-attempt.adapter.js";
import type {
  AiAdapterResult,
  AiAttemptRequest,
  ResolvedAiAttemptRequest,
  ResolvedAiRoute,
} from "../src/ai-execution/domain/ai-attempt.types.js";
import { executeS6ControlledBatch } from "../src/ai-execution/controlled-validation/s6-controlled-executor.js";
import {
  assertS6ControlledManifestConfirmation,
  buildS6ControlledBatch,
  publicS6ControlledManifest,
  s6ControlledManifestConfirmation,
} from "../src/ai-execution/controlled-validation/s6-controlled-manifest.js";
import { REAL_AI_ROUTES } from "../src/ai-execution/infrastructure/providers/real-route.catalog.js";

describe("S6 controlled provider validation", () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });

  it("publishes exact bounded manifests without protected inputs", () => {
    const sampling = publicS6ControlledManifest(
      buildS6ControlledBatch("sampling-smoke"),
    );
    const semantic = publicS6ControlledManifest(
      buildS6ControlledBatch("semantic-probe"),
    );
    const synthesisQuality = publicS6ControlledManifest(
      buildS6ControlledBatch("synthesis-quality-probe"),
    );

    expect(sampling.maxExternalRequests).toBe(5);
    expect(sampling.calls).toHaveLength(5);
    expect(new Set(sampling.calls.map((call) => call.providerKey))).toEqual(
      new Set([
        "tencent-tokenhub",
        "volcengine-ark",
        "alibaba-model-studio",
        "baidu-qianfan",
      ]),
    );
    expect(semantic.maxExternalRequests).toBe(9);
    expect(semantic.calls.map((call) => call.fixtureId)).toEqual([
      "P01",
      "P03",
      "P05",
      "P07",
      "P03",
      "P07",
      "Y02",
      "Y03",
      "Y02",
    ]);
    expect(semantic.calls.filter((call) => call.ordinal > 6)).toHaveLength(3);
    expect(
      semantic.calls
        .filter((call) => call.providerKey === "alibaba-model-studio")
        .every((call) => call.structuredReasoningEffort === "medium"),
    ).toBe(true);
    expect(
      semantic.calls
        .filter((call) => call.providerKey === "tencent-tokenhub")
        .every((call) => call.structuredReasoningEffort === null),
    ).toBe(true);
    expect(synthesisQuality.maxExternalRequests).toBe(4);
    expect(
      synthesisQuality.calls.map((call) => [
        call.fixtureId,
        call.providerKey,
        call.maxExternalRequests,
      ]),
    ).toEqual([
      ["Y02", "alibaba-model-studio", 1],
      ["Y03", "alibaba-model-studio", 1],
      ["Y02", "alibaba-model-studio", 1],
      ["Y03", "alibaba-model-studio", 1],
    ]);
    expect(
      synthesisQuality.calls.every(
        (call) =>
          call.instructionProfile ===
            "evaluation.overall-synthesis.common@4.0.0" &&
          call.outputContractVersion === "evaluation.overall-synthesis-model@4",
      ),
    ).toBe(true);
    const publicText = JSON.stringify([sampling, semantic, synthesisQuality]);
    for (const protectedValue of [
      "systemInstruction",
      "userContext",
      "originalAnswer",
      "companyName",
      "星河咖啡实验店",
    ]) {
      expect(publicText).not.toContain(protectedValue);
    }
  });

  it("binds execution to the current public manifest", () => {
    const manifest = publicS6ControlledManifest(
      buildS6ControlledBatch("sampling-smoke"),
    );
    const confirmation = s6ControlledManifestConfirmation(manifest);
    expect(() =>
      assertS6ControlledManifestConfirmation(manifest, confirmation),
    ).not.toThrow();
    expect(() =>
      assertS6ControlledManifestConfirmation(manifest, "stale-confirmation"),
    ).toThrow("confirmation does not match");
  });

  it("executes each planned route once and keeps protected evidence private", async () => {
    const root = await mkdtemp(join(tmpdir(), "geoeval-s6-controlled-"));
    temporaryDirectories.push(root);
    const batch = buildS6ControlledBatch("sampling-smoke");
    const manifest = publicS6ControlledManifest(batch);
    const adapter = new RecordingAdapter();

    const summary = await executeS6ControlledBatch({
      batch,
      adapter,
      confirmation: s6ControlledManifestConfirmation(manifest),
      evidenceRoot: root,
      now: () => new Date("2026-08-28T12:00:00.000Z"),
    });

    expect(adapter.executions).toBe(5);
    expect(summary).toMatchObject({
      plannedBatchExternalRequests: 5,
      startAtOrdinal: 1,
      maxExternalRequests: 5,
      executedExternalRequests: 5,
      stoppedEarly: false,
    });
    expect(summary.calls.every((call) => call.status === "ACCEPTED")).toBe(
      true,
    );
    expect(JSON.stringify(summary)).not.toContain("fixture answer");

    expect((await stat(summary.evidenceDirectory)).mode & 0o777).toBe(0o700);
    const files = await readdir(summary.evidenceDirectory);
    expect(files).toHaveLength(7);
    for (const file of files) {
      expect(
        (await stat(join(summary.evidenceDirectory, file))).mode & 0o777,
      ).toBe(0o600);
    }
    const firstPrivateEvidence = await readFile(
      join(summary.evidenceDirectory, "01-R-SMOKE-DEEPSEEK.json"),
      "utf8",
    );
    expect(firstPrivateEvidence).toContain("fixture answer");
    expect(firstPrivateEvidence).toContain("systemInstruction");
  });

  it("resumes at a later ordinal without repeating accepted calls", async () => {
    const root = await mkdtemp(join(tmpdir(), "geoeval-s6-controlled-"));
    temporaryDirectories.push(root);
    const batch = buildS6ControlledBatch("sampling-smoke");
    const manifest = publicS6ControlledManifest(batch);
    const adapter = new RecordingAdapter();

    const summary = await executeS6ControlledBatch({
      batch,
      adapter,
      confirmation: s6ControlledManifestConfirmation(manifest),
      evidenceRoot: root,
      startAtOrdinal: 3,
      now: () => new Date("2026-08-28T12:00:00.000Z"),
    });

    expect(adapter.executions).toBe(3);
    expect(summary).toMatchObject({
      plannedBatchExternalRequests: 5,
      startAtOrdinal: 3,
      maxExternalRequests: 3,
      executedExternalRequests: 3,
      stoppedEarly: false,
    });
    expect(summary.calls.map((call) => call.ordinal)).toEqual([3, 4, 5]);
  });
});

class RecordingAdapter implements AiAttemptAdapter {
  executions = 0;

  resolve(request: AiAttemptRequest): ResolvedAiRoute {
    const route = REAL_AI_ROUTES.find(
      (candidate) => candidate.routePolicyId === request.routePolicyId,
    );
    if (!route) throw new Error("missing fixture route");
    return {
      providerKey: route.providerKey,
      serviceClass: route.serviceClass,
      protocol: route.protocol,
      requestedModel: route.requestedModel,
    };
  }

  async execute(request: ResolvedAiAttemptRequest): Promise<AiAdapterResult> {
    this.executions += 1;
    return {
      kind: "SUCCEEDED",
      output: {
        kind: "ACQUISITION",
        answerContent: "fixture answer",
        answerFormat: "MARKDOWN",
        sourceMetadata: [{ url: "https://example.invalid/source" }],
        searchObservation: "TRIGGERED",
        returnedModel: request.requestedModel,
      },
      usage: { input_tokens: 10, output_tokens: 5 },
      evidence: {
        providerKey: request.providerKey,
        serviceClass: request.serviceClass,
        protocol: request.protocol,
        returnedModel: request.requestedModel,
        searchObservation: "TRIGGERED",
        reasoningEvidenceKind: "NONE",
      },
    };
  }
}
