import { generateKeyPairSync } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  loadAlipayRechargeApiConfiguration,
  loadAlipayRechargeWorkerConfiguration,
} from "../src/recharge/alipay-recharge.runtime-config.js";

describe("Alipay recharge host configuration", () => {
  let directory: string;
  let base: NodeJS.ProcessEnv;
  const disposals: Array<() => Promise<void>> = [];

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "geoeval-alipay-runtime-"));
    const merchant = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const provider = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const privateKey = join(directory, "app-private.pem");
    const publicKey = join(directory, "alipay-public.pem");
    writeFileSync(
      privateKey,
      merchant.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      { mode: 0o600 },
    );
    writeFileSync(
      publicKey,
      provider.publicKey.export({ type: "spki", format: "pem" }).toString(),
      { mode: 0o600 },
    );
    base = {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example/recharge",
      RECHARGE_ALIPAY_ACTIVATION: "verify",
      RECHARGE_ALIPAY_ENVIRONMENT: "production",
      RECHARGE_ALIPAY_APP_ID: "2026000000000099",
      RECHARGE_ALIPAY_MERCHANT_ID: "2088000000000099",
      RECHARGE_ALIPAY_PRIVATE_KEY_FILE: privateKey,
      RECHARGE_ALIPAY_PUBLIC_KEY_FILE: publicKey,
      RECHARGE_ALIPAY_NOTIFY_URL:
        "https://app.example.test/recharges/providers/alipay/notify",
      RECHARGE_ALIPAY_RETURN_URL: "https://app.example.test/recharges",
      RECHARGE_MIN_AMOUNT_YUAN: "1",
      RECHARGE_MAX_AMOUNT_YUAN: "100",
      RECHARGE_SHORTCUT_AMOUNTS: "1,10,50",
    };
  });

  afterEach(async () => {
    await Promise.all(disposals.splice(0).map((dispose) => dispose()));
    rmSync(directory, { recursive: true, force: true });
  });

  function api(changes: NodeJS.ProcessEnv = {}) {
    const value = loadAlipayRechargeApiConfiguration({ ...base, ...changes });
    if (value?.channel.gateway.dispose)
      disposals.push(() => value.channel.gateway.dispose!());
    return value;
  }

  it("stays completely unconfigured unless activation is explicit", () => {
    expect(
      loadAlipayRechargeApiConfiguration({
        RECHARGE_ALIPAY_ACTIVATION: "disabled",
      }),
    ).toBeNull();
  });

  it("loads production credentials for verification without opening creation", () => {
    expect(api()).toMatchObject({
      controlled: true,
      recharge: {
        method: "ALIPAY_PC",
        minAmountYuan: 1,
        maxAmountYuan: 100,
      },
      preparation: {
        createEnabled: false,
        actionKind: "CASHIER_PAGE",
      },
      channel: { provider: "ALIPAY", method: "ALIPAY_PC" },
      shortcutAmounts: [1, 10, 50],
    });
  });

  it("separates sandbox and live cashier activation", () => {
    expect(() =>
      api({
        RECHARGE_ALIPAY_ACTIVATION: "sandbox",
        RECHARGE_ALIPAY_ENVIRONMENT: "production",
      }),
    ).toThrow("RECHARGE_SANDBOX_GATEWAY_REQUIRED");
    expect(() =>
      api({
        RECHARGE_ALIPAY_ACTIVATION: "live",
        RECHARGE_ALIPAY_ENVIRONMENT: "sandbox",
      }),
    ).toThrow("RECHARGE_LIVE_GATEWAY_REQUIRED");
    expect(
      api({
        RECHARGE_ALIPAY_ACTIVATION: "live",
        RECHARGE_ALIPAY_ENVIRONMENT: "production",
      }),
    ).toMatchObject({
      controlled: false,
      preparation: { createEnabled: true },
    });
  });

  it("keeps production recovery available while new cashier creation is stopped", () => {
    expect(api({ NODE_ENV: "production" })).toMatchObject({
      controlled: false,
      preparation: { createEnabled: false },
    });
    expect(() =>
      api({
        NODE_ENV: "production",
        RECHARGE_ALIPAY_ACTIVATION: "sandbox",
        RECHARGE_ALIPAY_ENVIRONMENT: "sandbox",
      }),
    ).toThrow("RECHARGE_SANDBOX_FORBIDDEN_IN_PRODUCTION");
  });

  it("rejects permissive key files, URL parameters and inconsistent amounts", () => {
    chmodSync(base.RECHARGE_ALIPAY_PRIVATE_KEY_FILE!, 0o644);
    expect(() => api()).toThrow("RECHARGE_KEY_FILE_NOT_PRIVATE");
    chmodSync(base.RECHARGE_ALIPAY_PRIVATE_KEY_FILE!, 0o600);
    expect(() =>
      api({
        RECHARGE_ALIPAY_NOTIFY_URL: "https://app.example.test/notify?x=1",
      }),
    ).toThrow("RECHARGE_ALIPAY_NOTIFY_URL_MUST_BE_HTTPS");
    expect(() => api({ RECHARGE_SHORTCUT_AMOUNTS: "1,200" })).toThrow(
      "RECHARGE_SHORTCUT_AMOUNTS_OUT_OF_RANGE",
    );
    expect(() =>
      api({ RECHARGE_ALIPAY_PRIVATE_KEY_FILE: join(directory, "missing.pem") }),
    ).toThrow("RECHARGE_KEY_FILE_UNREADABLE");
  });

  it("builds the dedicated worker from the same merchant and recovery policy", () => {
    const value = loadAlipayRechargeWorkerConfiguration(base);
    if (value?.native.channel.gateway.dispose)
      disposals.push(() => value.native.channel.gateway.dispose!());
    expect(value).toMatchObject({
      databaseUrl: "postgresql://example/recharge",
      controlled: true,
      native: {
        recharge: { method: "ALIPAY_PC" },
        recovery: { initiationEnabled: false },
      },
      scheduling: {
        orderIntervalMs: 2000,
        settlementIntervalMs: 1000,
        notificationIntervalMs: 1000,
      },
      notifications: { retryDelayMs: 5000 },
    });
    expect(() =>
      loadAlipayRechargeWorkerConfiguration({
        ...base,
        DATABASE_URL: undefined,
      }),
    ).toThrow("DATABASE_URL_REQUIRED");
  });
});
