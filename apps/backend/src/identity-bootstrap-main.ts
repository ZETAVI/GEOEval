import { loadIdentityBootstrapConfig } from "./config/runtime-config.js";
import { BootstrapService } from "./identity/application/bootstrap.service.js";
import { IdentityBootstrapError } from "./identity/domain/identity.errors.js";
import { PostgresIdentityRepository } from "./identity/infrastructure/postgres-identity.repository.js";
import { parseBootstrapOptions } from "./identity/presentation/bootstrap-options.js";
import { PrismaService } from "./infrastructure/prisma.service.js";

async function main(): Promise<void> {
  const { mobile, keyId } = parseBootstrapOptions(process.argv.slice(2));
  const config = loadIdentityBootstrapConfig();
  const providedSecret = await readProtectedStandardInput();
  const prisma = new PrismaService(config.databaseUrl);
  await prisma.$connect();
  try {
    const result = await new BootstrapService(
      new PostgresIdentityRepository(prisma),
    ).bootstrap({
      mobile,
      keyId,
      providedSecret,
      expectedSecretDigest: config.expectedSecretDigest,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

async function readProtectedStandardInput(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new IdentityBootstrapError(
      "BOOTSTRAP_SECRET_INVALID",
      "Bootstrap secret must be supplied through protected standard input",
    );
  }
  let secret = "";
  for await (const chunk of process.stdin) {
    secret += String(chunk);
    if (secret.length > 4096) {
      throw new IdentityBootstrapError(
        "BOOTSTRAP_SECRET_INVALID",
        "Bootstrap secret input is invalid",
      );
    }
  }
  return secret.replace(/\r?\n$/, "");
}

void main().catch((error: unknown) => {
  const code =
    error instanceof IdentityBootstrapError
      ? error.code
      : "BOOTSTRAP_OPERATION_FAILED";
  process.stdout.write(
    `${JSON.stringify({ status: "FAILED", error: { code } })}\n`,
  );
  process.exitCode = 1;
});
