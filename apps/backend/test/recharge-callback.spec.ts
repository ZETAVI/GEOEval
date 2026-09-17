import "reflect-metadata";

import { request as httpRequest } from "node:http";
import { ModulesContainer } from "@nestjs/core";
import { Client } from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import {
  WechatRechargeNotificationVerifier,
  type ProviderNotificationVerifier,
} from "../src/recharge/application/provider-payment.js";
import { WechatPayNotificationVerifier } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import {
  createRechargeCallbackApp,
  type RechargeCallbackConfiguration,
} from "../src/recharge/recharge-callback.module.js";
import { wechatFixture } from "./wechat-pay.fixture.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { rechargeTestTruncate } from "./recharge-test-data.js";

const route = "/recharges/providers/wechat/notify";
const integration = loadIntegrationApiConfig(),
  integrationDatabase = new URL(integration.databaseUrl),
  durableTestEnabled =
    integrationDatabase.hostname === "127.0.0.1" &&
    integrationDatabase.port === "55432" &&
    (integrationDatabase.pathname === "/geoeval_issue77_callback" ||
      (process.env.CI === "true" &&
        integrationDatabase.pathname === "/geoeval"));

describe("dedicated recharge callback host", () => {
  const previousSkip = process.env.GEOEVAL_SKIP_DATABASE_CONNECT;
  const apps: Awaited<ReturnType<typeof createRechargeCallbackApp>>[] = [];

  afterEach(async () => {
    for (const app of apps.splice(0)) await app.close();
    if (previousSkip === undefined)
      delete process.env.GEOEVAL_SKIP_DATABASE_CONNECT;
    else process.env.GEOEVAL_SKIP_DATABASE_CONNECT = previousSkip;
  });

  async function start(verifiers: readonly ProviderNotificationVerifier[]) {
    process.env.GEOEVAL_SKIP_DATABASE_CONNECT = "1";
    const configuration: RechargeCallbackConfiguration = {
      databaseUrl: "postgresql://callback.invalid/geoeval",
      port: 3300,
      verifiers,
    };
    const app = await createRechargeCallbackApp(configuration, {
      handleSignals: false,
      logger: false,
    });
    await app.listen(0, "127.0.0.1");
    apps.push(app);
    return app;
  }

  function send(
    origin: string,
    input: ReturnType<ReturnType<typeof wechatFixture>["notification"]>,
    path = route,
  ) {
    const headers: Record<string, string | string[]> = {};
    for (const [name, value] of Object.entries(input.headers))
      if (value) headers[name] = [...value];
    return new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = httpRequest(
        new URL(path, origin),
        { method: "POST", headers },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () =>
            resolve({
              status: response.statusCode!,
              body: Buffer.concat(chunks).toString(),
            }),
          );
        },
      );
      req.on("error", reject);
      req.end(input.rawBody);
    });
  }

  it("mounts only callback persistence and keeps full application routes absent", async () => {
    const fixture = wechatFixture(),
      config = fixture.config(),
      verifier = new WechatRechargeNotificationVerifier(
        new WechatPayNotificationVerifier({
          verificationKeys: config.verificationKeys,
          apiV3Key: config.apiV3Key,
        }),
      ),
      app = await start([verifier]),
      origin = await app.getUrl(),
      modules = [...app.get(ModulesContainer).values()],
      names = modules.map((module) => module.metatype.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "RechargeCallbackModule",
        "RechargeNotificationModule",
        "PersistenceModule",
      ]),
    );
    expect(names.join(" ")).not.toMatch(
      /ApiModule|Identity|Commerce|Media|BackgroundWork|Telemetry|Redis|RechargeWorker/,
    );
    expect(
      modules
        .flatMap((module) => [...module.controllers.values()])
        .map((wrapper) => wrapper.metatype?.name),
    ).toEqual(["WechatNotificationController"]);
    expect(app.get(PrismaService)).toBeDefined();

    const unsigned = fixture.notification();
    unsigned.headers["wechatpay-signature"] = ["invalid"];
    expect(await send(origin, unsigned)).toMatchObject({ status: 401 });
    // A valid signed payload reaches the durable inbox seam; the disconnected
    // test database causes an explicit retry instead of a false ACK.
    expect(await send(origin, fixture.notification())).toMatchObject({
      status: 503,
    });
    expect(
      await send(origin, fixture.notification(), "/recharges/options"),
    ).toMatchObject({ status: 404 });
    expect(
      await send(origin, fixture.notification(), "/openapi"),
    ).toMatchObject({ status: 404 });
  });

  it("rejects an empty verifier set before opening a listener", async () => {
    await expect(start([])).rejects.toThrow(
      "RECHARGE_NOTIFICATION_VERIFIERS_REQUIRED",
    );
  });

  it.skipIf(!durableTestEnabled)(
    "returns 204 only after the callback host durably accepts the signed receipt",
    async () => {
      delete process.env.GEOEVAL_SKIP_DATABASE_CONNECT;
      const fixture = wechatFixture(),
        config = fixture.config(),
        verifier = new WechatRechargeNotificationVerifier(
          new WechatPayNotificationVerifier({
            verificationKeys: config.verificationKeys,
            apiV3Key: config.apiV3Key,
          }),
        ),
        control = new Client({ connectionString: integration.databaseUrl });
      await control.connect();
      try {
        await control.query(rechargeTestTruncate);
        const app = await createRechargeCallbackApp(
          {
            databaseUrl: integration.databaseUrl,
            port: 3300,
            verifiers: [verifier],
          },
          { handleSignals: false, logger: false },
        );
        await app.listen(0, "127.0.0.1");
        apps.push(app);
        expect(await send(await app.getUrl(), fixture.notification())).toEqual({
          status: 204,
          body: "",
        });
        expect(
          await control.query(
            "SELECT (SELECT count(*) FROM recharge_payment_observations) AS observations, (SELECT count(*) FROM recharge_notification_receipts) AS receipts",
          ),
        ).toMatchObject({ rows: [{ observations: "1", receipts: "1" }] });
      } finally {
        await control.end();
      }
    },
  );
});
