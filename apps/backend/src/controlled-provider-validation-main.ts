import { resolve } from "node:path";

import {
  buildS6ControlledBatch,
  publicS6ControlledManifest,
  s6ControlledManifestConfirmation,
  type S6ControlledBatchId,
} from "./ai-execution/controlled-validation/s6-controlled-manifest.js";
import { executeS6ControlledBatch } from "./ai-execution/controlled-validation/s6-controlled-executor.js";
import { RealAiAttemptAdapter } from "./ai-execution/infrastructure/providers/real-ai-attempt.adapter.js";
import { loadWorkerConfig } from "./config/runtime-config.js";

const BATCH_IDS: S6ControlledBatchId[] = ["sampling-smoke", "semantic-probe"];

async function main(): Promise<void> {
  const [command, batchArgument, ...options] = process.argv.slice(2);
  if (command === "plan") {
    const batchIds = batchArgument ? [parseBatchId(batchArgument)] : BATCH_IDS;
    const plans = batchIds.map((batchId) => {
      const manifest = publicS6ControlledManifest(
        buildS6ControlledBatch(batchId),
      );
      return {
        manifest,
        confirmation: s6ControlledManifestConfirmation(manifest),
      };
    });
    process.stdout.write(`${JSON.stringify(plans, null, 2)}\n`);
    return;
  }
  if (command !== "execute" || !batchArgument) {
    throw new Error(
      "Expected plan [batch] or execute <batch> --confirm=<value> [--start-at=<ordinal>]",
    );
  }
  const batchId = parseBatchId(batchArgument);
  const confirmation = optionValue(options, "--confirm=");
  const startAtOrdinal = positiveIntegerOption(options, "--start-at=");
  const config = loadWorkerConfig();
  if (config.aiExecution.mode !== "real") {
    throw new Error("Controlled provider execution requires real AI mode");
  }
  const summary = await executeS6ControlledBatch({
    batch: buildS6ControlledBatch(batchId),
    adapter: new RealAiAttemptAdapter(config.aiExecution),
    confirmation,
    ...(startAtOrdinal === undefined ? {} : { startAtOrdinal }),
    evidenceRoot: resolve(
      process.env.S6_EVIDENCE_DIR ?? ".provider-evidence/s6-controlled",
    ),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

function parseBatchId(value: string): S6ControlledBatchId {
  if (value === "sampling-smoke" || value === "semantic-probe") return value;
  throw new Error("Unknown S6 controlled batch");
}

function optionValue(options: string[], prefix: string): string | undefined {
  return options
    .find((option) => option.startsWith(prefix))
    ?.slice(prefix.length);
}

function positiveIntegerOption(
  options: string[],
  prefix: string,
): number | undefined {
  const value = optionValue(options, prefix);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${prefix} must be a positive integer`);
  }
  return parsed;
}

void main().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "UnknownError";
  process.stderr.write(`S6 controlled validation failed (${name}).\n`);
  process.exitCode = 1;
});
