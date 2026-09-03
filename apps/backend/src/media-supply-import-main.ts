import { isAbsolute, resolve } from "node:path";

import { PrismaService } from "./infrastructure/prisma.service.js";
import {
  applyFirstBatchImport,
  assertFirstBatchReceiptTarget,
  FirstBatchOperationError,
  planFirstBatchImport,
  writeFirstBatchReceipt,
} from "./media-supply/import/first-batch-import.js";
import {
  FirstBatchInputError,
  parseFirstBatchWorkbook,
} from "./media-supply/import/first-batch-workbook.js";

async function main(): Promise<void> {
  const [mode, ...options] = process.argv.slice(2);
  if (mode !== "plan" && mode !== "apply") {
    throw new FirstBatchOperationError("MODE_INVALID");
  }
  validateOptions(mode, options);
  const databaseUrl = requiredEnvironment("DATABASE_URL");
  const inputPath = absoluteOption(options, "--input=");
  const assetRoot = absoluteOption(options, "--asset-root=");
  const actorAccountId = requiredOption(options, "--actor-account-id=");
  const batch = await parseFirstBatchWorkbook(inputPath);
  const prisma = new PrismaService(databaseUrl);
  await prisma.$connect();
  try {
    if (mode === "plan") {
      const plan = await planFirstBatchImport({
        actorAccountId,
        assetRoot,
        batch,
        databaseUrl,
        prisma,
      });
      writeResult(plan);
      if (plan.status !== "READY") process.exitCode = 1;
      return;
    }
    const confirmation = requiredOption(options, "--confirm=");
    const receiptPath = absoluteOption(options, "--receipt=");
    assertFirstBatchReceiptTarget({ assetRoot, inputPath, receiptPath });
    const receipt = await applyFirstBatchImport({
      actorAccountId,
      assetRoot,
      batch,
      confirmation,
      databaseUrl,
      prisma,
    });
    try {
      await writeFirstBatchReceipt(receiptPath, receipt);
      writeResult(receipt);
    } catch (error) {
      if (!(error instanceof FirstBatchOperationError)) throw error;
      writeResult({
        ...receipt,
        status: "APPLIED_RECEIPT_PENDING",
        error: { code: error.code },
      });
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new FirstBatchOperationError("DATABASE_URL_REQUIRED");
  return value;
}

function absoluteOption(options: string[], prefix: string): string {
  const value = requiredOption(options, prefix);
  if (!isAbsolute(value)) {
    throw new FirstBatchOperationError("PATH_MUST_BE_ABSOLUTE");
  }
  return resolve(value);
}

function validateOptions(mode: "apply" | "plan", options: string[]): void {
  const allowed =
    mode === "plan"
      ? ["--input=", "--asset-root=", "--actor-account-id="]
      : [
          "--input=",
          "--asset-root=",
          "--actor-account-id=",
          "--confirm=",
          "--receipt=",
        ];
  if (
    options.some(
      (option) => !allowed.some((prefix) => option.startsWith(prefix)),
    )
  ) {
    throw new FirstBatchOperationError("OPTION_INVALID");
  }
}

function requiredOption(options: string[], prefix: string): string {
  const matches = options.filter((option) => option.startsWith(prefix));
  if (matches.length !== 1)
    throw new FirstBatchOperationError("OPTION_INVALID");
  const value = matches[0]!.slice(prefix.length).trim();
  if (!value) throw new FirstBatchOperationError("OPTION_INVALID");
  return value;
}

function writeResult(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  if (error instanceof FirstBatchInputError) {
    writeResult({
      status: "INVALID",
      error: { code: error.code, sourceRows: error.sourceRows },
    });
  } else if (error instanceof FirstBatchOperationError) {
    writeResult({
      status: "FAILED",
      error: { code: error.code },
      ...(error.plan ? { plan: error.plan } : {}),
    });
  } else {
    writeResult({
      status: "FAILED",
      error: { code: "IMPORT_OPERATION_FAILED" },
    });
  }
  process.exitCode = 1;
});
