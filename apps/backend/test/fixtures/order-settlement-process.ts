import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PersistenceModule } from "../../src/infrastructure/persistence.module.js";
import { OrderSettlementModule } from "../../src/application/order-settlement.module.js";
import { OrderSettlementAccess } from "../../src/publishing-commerce/infrastructure/order-settlement-access.js";
const url = new URL(process.env.DATABASE_URL!);
if (
  process.env.ORDER_SETTLEMENT_PROCESS_TEST !== "1" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  !(
    url.pathname === "/geoeval_issue100" ||
    (process.env.CI === "true" && url.pathname === "/geoeval")
  )
)
  throw new Error("OWNED_SETTLEMENT_TEST_TARGET_REQUIRED");
@Module({
  imports: [
    PersistenceModule.register(url.toString()),
    OrderSettlementModule.register(true),
  ],
})
class Host {}
const app = await NestFactory.createApplicationContext(Host, { logger: false });
if (process.env.ORDER_SETTLEMENT_TEST_HOLD === "1") {
  const port = app.get(OrderSettlementAccess);
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
