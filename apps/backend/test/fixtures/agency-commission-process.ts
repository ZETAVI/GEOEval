import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PersistenceModule } from "../../src/infrastructure/persistence.module.js";
import { AgencyCommissionModule } from "../../src/application/agency-commission.module.js";
import { CommissionLedgerAccess } from "../../src/agency/infrastructure/commission-ledger-access.js";
const url = new URL(process.env.DATABASE_URL!);
if (
  process.env.AGENCY_COMMISSION_PROCESS_TEST !== "1" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  !(
    url.pathname === "/geoeval_issue100" ||
    (process.env.CI === "true" && url.pathname === "/geoeval")
  )
)
  throw new Error("OWNED_COMMISSION_TEST_TARGET_REQUIRED");
@Module({
  imports: [
    PersistenceModule.register(url.toString()),
    AgencyCommissionModule.register(true),
  ],
})
class Host {}
const app = await NestFactory.createApplicationContext(Host, { logger: false });
if (process.env.AGENCY_COMMISSION_TEST_HOLD === "1") {
  const port = app.get(CommissionLedgerAccess);
  const record = port.record.bind(port);
  port.record = async (...args) => {
    const receipt = await record(...args);
    process.send?.({ event: "uncommitted" });
    await new Promise(() => {});
    return receipt;
  };
}
process.send?.({ event: "ready" });
process.on("SIGTERM", () => {
  void app.close().then(() => process.exit(0));
});
