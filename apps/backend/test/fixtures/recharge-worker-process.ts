import "reflect-metadata";
import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, basename, resolve } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { createRechargeWorkerApp } from "../../src/recharge/recharge-worker.module.js";
import { WechatPayGateway } from "../../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import { rechargeApiFixture } from "../recharge-api.fixture.js";

const databaseUrl = process.env.DATABASE_URL ?? "",
  file = resolve(process.env.RECHARGE_TEST_FILE ?? "");
const database = new URL(databaseUrl);
if (
  process.env.NODE_ENV !== "test" ||
  process.env.RECHARGE_PROCESS_TEST !== "1" ||
  database.hostname !== "127.0.0.1" ||
  database.port !== "55432" ||
  !(
    database.pathname === "/geoeval_issue77_worker_n3" ||
    (process.env.CI === "true" && database.pathname === "/geoeval")
  ) ||
  basename(file) !== "provider.json" ||
  !basename(dirname(file)).startsWith("geoeval-recharge-worker-") ||
  !file.startsWith(resolve(tmpdir()) + "/")
)
  throw new Error("ISOLATED_RECHARGE_PROCESS_TARGET_REQUIRED");

type Provider = {
  initiationEnabled: boolean;
  release: boolean;
  orders: Record<string, { amount: number; state: string; paidAt?: string }>;
};
const read = async (): Promise<Provider> =>
  JSON.parse(await readFile(file, "utf8"));
const write = async (data: Provider) => {
  await writeFile(file + ".child", JSON.stringify(data));
  await rename(file + ".child", file);
};
const f = rechargeApiFixture(),
  mode = process.env.RECHARGE_TEST_MODE;
const gateway = new WechatPayGateway(f.protocol.config(), async (request) => {
  if (request.path.endsWith("/native")) {
    const body = JSON.parse(request.body.toString()),
      state = await read();
    state.orders[body.out_trade_no] ??= {
      amount: body.amount.total,
      state: "NOTPAY",
    };
    await write(state);
    process.send?.({
      event: "provider_received",
      operation: "INITIATE",
      merchantOrderNo: body.out_trade_no,
    });
    if (mode === "hold-initiate") await new Promise(() => {});
    return f.protocol.response({
      code_url: `weixin://wxpay/bizpayurl/up?pr=CONTROLLED_WORKER_${body.out_trade_no}`,
    });
  }
  const no = decodeURIComponent(
    request.path.split("out-trade-no/")[1]!.split(/[?/]/)[0]!,
  );
  let state = await read();
  const order = state.orders[no];
  if (!order) return f.protocol.response({ code: "ORDER_NOT_EXIST" }, 404);
  if (request.path.endsWith("/close")) {
    order.state = "CLOSED";
    await write(state);
    process.send?.({
      event: "provider_received",
      operation: "CLOSE",
      merchantOrderNo: no,
    });
    return f.protocol.response({}, 204);
  }
  process.send?.({
    event: "provider_received",
    operation: "QUERY",
    merchantOrderNo: no,
  });
  if (mode === "hold-query") while (!(await read()).release) await sleep(20);
  state = await read();
  const current = state.orders[no]!;
  return f.protocol.response(
    f.protocol.trade({
      out_trade_no: no,
      transaction_id: no,
      trade_state: current.state,
      success_time: current.paidAt ?? new Date().toISOString(),
      amount: {
        total: current.amount,
        currency: "CNY",
        payer_total: current.amount,
        payer_currency: "CNY",
      },
    }),
  );
});
const initial = await read();
await createRechargeWorkerApp({
  databaseUrl,
  runtimeEnvironment: "test",
  controlled: true,
  native: {
    ...f.configuration,
    channel: { ...f.configuration.channel, gateway },
    preparation: { ...f.configuration.preparation, createEnabled: false },
    recovery: {
      ...f.configuration.recovery,
      initiationEnabled: initial.initiationEnabled,
      leaseMs: 1500,
      queryIntervalMs: 1000,
      retryDelayMs: 1000,
    },
  },
  scheduling: {
    orderIntervalMs: 100,
    settlementIntervalMs: 100,
    failureIntervalMs: 200,
    drainWarningMs: 200,
  },
});
process.send?.({ event: "ready" });
