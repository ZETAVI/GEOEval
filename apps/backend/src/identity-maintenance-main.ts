import { loadIdentityMaintenanceConfig } from "./config/runtime-config.js";
import { IdentityMaintenanceService } from "./identity/application/identity-maintenance.service.js";
import { PostgresIdentityRepository } from "./identity/infrastructure/postgres-identity.repository.js";
import { PrismaService } from "./infrastructure/prisma.service.js";

async function main(): Promise<void> {
  if (process.argv.slice(2).join(" ") !== "cleanup") {
    throw new Error("IDENTITY_MAINTENANCE_COMMAND_INVALID");
  }
  const config = loadIdentityMaintenanceConfig();
  const prisma = new PrismaService(config.databaseUrl);
  await prisma.$connect();
  try {
    const result = await new IdentityMaintenanceService(
      new PostgresIdentityRepository(prisma),
      config.authCleanupPolicy,
    ).cleanup();
    process.stdout.write(
      `${JSON.stringify({ status: "COMPLETED", ...result })}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  process.stdout.write(
    `${JSON.stringify({ status: "FAILED", error: { code: "IDENTITY_MAINTENANCE_FAILED" } })}\n`,
  );
  process.exitCode = 1;
});
