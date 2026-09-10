import "reflect-metadata";
import { PrismaService } from "../../src/infrastructure/prisma.service.js";
import { NotificationEventHandler } from "../../src/notification/application/notification-event.handler.js";
import { PostgresNotificationRepository } from "../../src/notification/infrastructure/postgres-notification.repository.js";
import { createRechargeNotificationRuntime } from "../../src/recharge/recharge-notification.runtime.js";

const databaseUrl = process.env.DATABASE_URL ?? "";
const database = new URL(databaseUrl);
if (
  process.env.NODE_ENV !== "test" ||
  process.env.RECHARGE_NOTICE_PROCESS_TEST !== "1" ||
  database.hostname !== "127.0.0.1" ||
  database.port !== "55432" ||
  !(
    database.pathname === "/geoeval_issue77_notifications_n4" ||
    (process.env.CI === "true" && database.pathname === "/geoeval")
  )
)
  throw new Error("ISOLATED_RECHARGE_NOTICE_PROCESS_TARGET_REQUIRED");

const prisma = new PrismaService(databaseUrl);
await prisma.$connect();
const notifications = new NotificationEventHandler(
  new PostgresNotificationRepository(prisma),
);
const publish = notifications.publishRecharge.bind(notifications);
notifications.publishRecharge = async (notice) => {
  await publish(notice);
  process.send?.({ event: "materialized", orderId: notice.orderId });
  if (process.env.RECHARGE_NOTICE_TEST_MODE === "hold-after-publish") {
    // Keep IPC referenced while the real runtime is between publication and ACK.
    process.on("message", () => {});
    await new Promise<void>(() => {});
  }
};
const runtime = createRechargeNotificationRuntime(prisma, notifications, 100);
process.send?.({ event: "ready" });
const result = await runtime.run(1);
await prisma.$disconnect();
process.send?.({ event: "completed", result });
process.disconnect?.();
