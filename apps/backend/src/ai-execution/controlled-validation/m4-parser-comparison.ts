import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type { AiAttemptAdapter } from "../domain/ai-attempt.adapter.js";
import { sampleParserModelOutputSchema } from "../../geo-intelligence/domain/sample-parser-model.contract.js";
import { REAL_AI_ROUTES } from "../infrastructure/providers/real-route.catalog.js";
import { executeS6ControlledBatch } from "./s6-controlled-executor.js";
import {
  buildS6ControlledBatch,
  publicS6ControlledManifest,
  s6ControlledManifestConfirmation,
  type S6ControlledBatch,
} from "./s6-controlled-manifest.js";

// Experimental only: no application coordinator or startup imports this module.
const candidate = JSON.parse(
  readFileSync(
    new URL(
      "../../../geo-intelligence/experiments/m4-parser-instruction.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  id: string;
  version: string;
  common: string;
  brandDirected: string;
  openDiscovery: string;
};

export function buildM4ParserComparison(): S6ControlledBatch {
  const fixtures = buildS6ControlledBatch("semantic-probe").cases.filter(
    (item) =>
      item.request.routePolicyId === "evaluation.interpretation.qwen-primary@2",
  );
  if (fixtures.map((item) => item.fixtureId).join(",") !== "P01,P03,P05,P07") {
    throw new Error("M4 Parser fixture set drifted");
  }
  return {
    id: "semantic-probe",
    description:
      "M4 Parser Prompt-only paired comparison; fictional fixtures; no acquisition or fallback",
    automaticTransportRetries: 0,
    stopConditions: [
      "First transport, identity, structure or semantic failure stops the batch; no resume without review",
    ],
    cases: fixtures.flatMap((item, index) => {
      const request = item.request;
      if (request.purpose !== "EVALUATION_INTERPRETATION") {
        throw new Error("M4 comparison requires structured Parser input");
      }
      const source = request.input;
      // Counterbalance order across fixtures; this is exploratory, not statistical evidence.
      const arms = index % 2 === 0 ? ["P0", "P1"] : ["P1", "P0"];
      return arms.map((arm) => ({
        ...item,
        fixtureId: `${item.fixtureId}-${arm}`,
        instructionProfile:
          arm === "P0"
            ? item.instructionProfile
            : `${candidate.id}@${candidate.version}`,
        request: {
          ...request,
          input: {
            ...source,
            systemInstruction:
              arm === "P0"
                ? source.systemInstruction
                : [
                    candidate.common,
                    source.userContext.questionKind === "BRAND_DIRECTED"
                      ? candidate.brandDirected
                      : candidate.openDiscovery,
                  ].join("\n\n"),
          },
        },
        validateOutput(output: Record<string, unknown>) {
          // Do not let canonical projection recovery conceal a malformed raw response.
          sampleParserModelOutputSchema.parse(output);
          item.validateOutput(output);
        },
      }));
    }),
  };
}

export function m4ParserComparisonPlan(batch = buildM4ParserComparison()) {
  assertScope(batch);
  const manifest = publicS6ControlledManifest(batch);
  const requestDigest = digest(
    batch.cases.map((item) => ({
      fixtureId: item.fixtureId,
      instructionProfile: item.instructionProfile,
      request: item.request,
      route: REAL_AI_ROUTES.find(
        (route) => route.routePolicyId === item.request.routePolicyId,
      ),
    })),
  );
  const plan = {
    experiment: "m4-parser-prompt-comparison@1",
    requestDigest,
    manifest,
    fixtureNature:
      "existing fictional fixtures; not representative real sampling",
    qualityGate:
      "raw Schema + current fixture/projector checks + separate human semantic review",
    maxExternalRequests: 8,
    telemetry: "disabled",
  };
  return { ...plan, confirmation: digest(plan) };
}

export async function executeM4ParserComparison(input: {
  adapter: AiAttemptAdapter;
  confirmation: string;
  evidenceRoot: string;
}) {
  const batch = buildM4ParserComparison();
  const plan = m4ParserComparisonPlan(batch);
  if (input.confirmation !== plan.confirmation) {
    throw new Error("M4 exact request confirmation does not match");
  }
  // Reuse existing one-attempt execution, stop-on-failure and private evidence storage.
  return executeS6ControlledBatch({
    batch,
    adapter: input.adapter,
    confirmation: s6ControlledManifestConfirmation(plan.manifest),
    evidenceRoot: input.evidenceRoot,
  });
}

function assertScope(batch: S6ControlledBatch) {
  if (
    batch.cases.length !== 8 ||
    batch.automaticTransportRetries !== 0 ||
    batch.cases.some(
      (item) =>
        item.request.purpose !== "EVALUATION_INTERPRETATION" ||
        item.request.routePolicyId !==
          "evaluation.interpretation.qwen-primary@2" ||
        item.request.requestedModel !== "qwen3.8-flash",
    )
  )
    throw new Error("M4 Parser comparison scope drifted");
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
