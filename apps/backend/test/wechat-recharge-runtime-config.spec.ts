import { generateKeyPairSync } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RECHARGE_CUSTOMER_OPTIONS } from "../src/recharge/application/customer-recharge.js";
import { RechargeApiModule } from "../src/recharge/recharge-api.module.js";
import {
  loadRechargeApiConfiguration,
  loadRechargeCallbackConfiguration,
  loadRechargeWorkerConfiguration,
} from "../src/recharge/recharge.runtime-config.js";
import { RechargeNotificationModule } from "../src/recharge/recharge-notification.module.js";
import {
  loadWechatRechargeApiConfiguration,
  loadWechatRechargeWorkerConfiguration,
} from "../src/recharge/wechat-recharge.runtime-config.js";
import { AlipayNotificationController } from "../src/recharge/presentation/alipay-notification.controller.js";
import { WechatNotificationController } from "../src/recharge/presentation/wechat-notification.controller.js";

describe("WeChat and multi-provider recharge host configuration", () => {
  const previousCredentialDirectory = process.env.CREDENTIALS_DIRECTORY;
  let directory: string;
  let base: NodeJS.ProcessEnv;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "geoeval-wechat-runtime-"));
    const merchant = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const wechat = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const alipayMerchant = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const alipay = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const files = {
      merchantPrivate: join(directory, "wechat-merchant-private.pem"),
      wechatPublic: join(directory, "wechat-public.pem"),
      apiV3: join(directory, "wechat-api-v3.key"),
      alipayPrivate: join(directory, "alipay-app-private.pem"),
      alipayPublic: join(directory, "alipay-public.pem"),
    };
    writeFileSync(
      files.merchantPrivate,
      merchant.privateKey.export({ type: "pkcs8", format: "pem" }),
      { mode: 0o600 },
    );
    writeFileSync(
      files.wechatPublic,
      wechat.publicKey.export({ type: "spki", format: "pem" }),
      { mode: 0o600 },
    );
    writeFileSync(files.apiV3, "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", {
      mode: 0o600,
    });
    writeFileSync(
      files.alipayPrivate,
      alipayMerchant.privateKey.export({ type: "pkcs8", format: "pem" }),
      { mode: 0o600 },
    );
    writeFileSync(
      files.alipayPublic,
      alipay.publicKey.export({ type: "spki", format: "pem" }),
      { mode: 0o600 },
    );
    base = {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example/recharge",
      RECHARGE_WECHAT_ACTIVATION: "verify",
      RECHARGE_WECHAT_MERCHANT_ID: "1900007291",
      RECHARGE_WECHAT_APP_ID: "wx0402876c556f2029",
      RECHARGE_WECHAT_MERCHANT_CERT_SERIAL: "ABCD1234",
      RECHARGE_WECHAT_PRIVATE_KEY_FILE: files.merchantPrivate,
      RECHARGE_WECHAT_PUBLIC_KEY_ID: "PUB_KEY_ID_1000000001",
      RECHARGE_WECHAT_PUBLIC_KEY_FILE: files.wechatPublic,
      RECHARGE_WECHAT_API_V3_KEY_FILE: files.apiV3,
      RECHARGE_WECHAT_NOTIFY_URL:
        "https://app.example.test/recharges/providers/wechat/notify",
      RECHARGE_WECHAT_IP_FAMILY: "ipv4",
      RECHARGE_MIN_AMOUNT_YUAN: "1",
      RECHARGE_MAX_AMOUNT_YUAN: "100",
      RECHARGE_SHORTCUT_AMOUNTS: "1,10,50",
      RECHARGE_ALIPAY_ACTIVATION: "disabled",
      RECHARGE_ALIPAY_ENVIRONMENT: "production",
      RECHARGE_ALIPAY_APP_ID: "2026000000000099",
      RECHARGE_ALIPAY_MERCHANT_ID: "2088000000000099",
      RECHARGE_ALIPAY_PRIVATE_KEY_FILE: files.alipayPrivate,
      RECHARGE_ALIPAY_PUBLIC_KEY_FILE: files.alipayPublic,
      RECHARGE_ALIPAY_NOTIFY_URL:
        "https://app.example.test/recharges/providers/alipay/notify",
      RECHARGE_ALIPAY_RETURN_URL: "https://app.example.test/recharges",
    };
  });

  afterEach(() => {
    if (previousCredentialDirectory === undefined)
      delete process.env.CREDENTIALS_DIRECTORY;
    else process.env.CREDENTIALS_DIRECTORY = previousCredentialDirectory;
    rmSync(directory, { recursive: true, force: true });
  });

  it("stays unconfigured unless explicitly activated", () => {
    expect(
      loadWechatRechargeApiConfiguration({
        RECHARGE_WECHAT_ACTIVATION: "disabled",
      }),
    ).toBeNull();
  });

  it("loads protected production credentials without opening creation in verify mode", () => {
    expect(loadWechatRechargeApiConfiguration(base)).toMatchObject({
      controlled: true,
      recharge: { method: "WECHAT_NATIVE" },
      preparation: { createEnabled: false, actionKind: "QR_CODE" },
      channel: { provider: "WECHAT", method: "WECHAT_NATIVE" },
      recovery: { initiationEnabled: false },
    });
    expect(loadWechatRechargeWorkerConfiguration(base)).toMatchObject({
      native: { recharge: { method: "WECHAT_NATIVE" } },
      scheduling: { orderIntervalMs: 2000, settlementIntervalMs: 1000 },
    });
  });

  it("loads a passive callback verifier without merchant signing credentials", () => {
    const callback = loadRechargeCallbackConfiguration({
      DATABASE_URL: base.DATABASE_URL,
      RECHARGE_CALLBACK_PORT: "3300",
      RECHARGE_WECHAT_ACTIVATION: "verify",
      RECHARGE_WECHAT_PUBLIC_KEY_ID: base.RECHARGE_WECHAT_PUBLIC_KEY_ID,
      RECHARGE_WECHAT_PUBLIC_KEY_FILE: base.RECHARGE_WECHAT_PUBLIC_KEY_FILE,
      RECHARGE_WECHAT_API_V3_KEY_FILE: base.RECHARGE_WECHAT_API_V3_KEY_FILE,
    });
    expect(callback).toMatchObject({
      databaseUrl: "postgresql://example/recharge",
      port: 3300,
    });
    expect(callback?.verifiers).toHaveLength(1);
    expect(callback?.verifiers[0]?.provider).toBe("WECHAT");
  });

  it("accepts systemd credential copies without accepting ordinary group-readable keys", () => {
    chmodSync(base.RECHARGE_WECHAT_PUBLIC_KEY_FILE!, 0o440);
    chmodSync(base.RECHARGE_WECHAT_API_V3_KEY_FILE!, 0o440);
    process.env.CREDENTIALS_DIRECTORY = directory;
    expect(loadRechargeCallbackConfiguration(base)?.verifiers).toHaveLength(1);

    process.env.CREDENTIALS_DIRECTORY = join(directory, "another-unit");
    expect(() => loadRechargeCallbackConfiguration(base)).toThrow(
      "RECHARGE_WECHAT_KEY_MATERIAL_INVALID",
    );
  });

  it("opens Native creation only in live mode", () => {
    expect(
      loadWechatRechargeApiConfiguration({
        ...base,
        RECHARGE_WECHAT_ACTIVATION: "live",
      }),
    ).toMatchObject({
      controlled: false,
      preparation: { createEnabled: true },
      recovery: { initiationEnabled: true },
    });
  });

  it("rejects weak file permissions, invalid APIv3 material and callback parameters", () => {
    chmodSync(base.RECHARGE_WECHAT_PRIVATE_KEY_FILE!, 0o644);
    expect(() => loadWechatRechargeApiConfiguration(base)).toThrow(
      "RECHARGE_KEY_FILE_NOT_PRIVATE",
    );
    chmodSync(base.RECHARGE_WECHAT_PRIVATE_KEY_FILE!, 0o600);
    writeFileSync(base.RECHARGE_WECHAT_API_V3_KEY_FILE!, "too-short", {
      mode: 0o600,
    });
    expect(() => loadWechatRechargeApiConfiguration(base)).toThrow(
      "RECHARGE_WECHAT_API_V3_KEY_INVALID",
    );
    writeFileSync(
      base.RECHARGE_WECHAT_API_V3_KEY_FILE!,
      "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6",
      { mode: 0o600 },
    );
    expect(() =>
      loadWechatRechargeApiConfiguration({
        ...base,
        RECHARGE_WECHAT_NOTIFY_URL:
          "https://app.example.test/recharges/providers/wechat/notify?x=1",
      }),
    ).toThrow("RECHARGE_WECHAT_NOTIFY_URL_MUST_BE_HTTPS");
    expect(() =>
      loadWechatRechargeApiConfiguration({
        ...base,
        RECHARGE_WECHAT_IP_FAMILY: "invalid",
      }),
    ).toThrow();
  });

  it("composes both providers without exposing a disabled method for new orders", () => {
    const environment = {
      ...base,
      RECHARGE_WECHAT_ACTIVATION: "verify",
      RECHARGE_ALIPAY_ACTIVATION: "live",
    };
    const api = loadRechargeApiConfiguration(environment);
    expect(api && "channels" in api ? api.channels : []).toHaveLength(2);
    const definition = RechargeApiModule.register(api);
    const options = (
      definition.providers as Array<{
        provide?: symbol;
        useValue?: { methods?: string[]; available?: boolean };
      }>
    ).find(
      (provider) => provider.provide === RECHARGE_CUSTOMER_OPTIONS,
    )?.useValue;
    expect(options).toMatchObject({ available: true, methods: ["ALIPAY_PC"] });

    const notifications = definition.imports?.[0] as ReturnType<
      typeof RechargeNotificationModule.register
    >;
    expect(notifications.controllers).toEqual([
      WechatNotificationController,
      AlipayNotificationController,
    ]);

    const worker = loadRechargeWorkerConfiguration(environment);
    expect(worker && "channels" in worker ? worker.channels : []).toHaveLength(
      2,
    );
  });
});
