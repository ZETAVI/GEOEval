import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  loadApiConfig,
  loadWorkerConfig,
} from "../src/config/runtime-config.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const deployment = resolve(root, "deploy/application");
const read = (path: string) => readFileSync(resolve(deployment, path), "utf8");

function environment(path: string): NodeJS.ProcessEnv {
  return Object.fromEntries(
    read(path)
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

describe("full application production deployment boundary", () => {
  it("keeps callback, Next bridge, prefixed API and Web routes disjoint", () => {
    const nginx = read("nginx/app.geohdp.com.conf");

    expect(nginx).toContain("location = /recharges/providers/wechat/notify");
    expect(nginx).toContain("location = /recharges/providers/alipay/notify");
    expect(nginx).toContain("location = /api/entry/challenge");
    expect(nginx).toContain("location ^~ /api/");
    expect(nginx).toContain("rewrite ^/api/(.*)$ /$1 break;");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3300;");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3301;");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3200;");
    expect(nginx).toContain("proxy_buffering off;");
    expect(nginx.indexOf("/recharges/providers/alipay/notify")).toBeLessThan(
      nginx.lastIndexOf("location / {"),
    );
    expect(nginx.indexOf("location = /api/entry/challenge")).toBeLessThan(
      nginx.indexOf("location ^~ /api/"),
    );
  });

  it("runs each entry point in a bounded hardened service", () => {
    const units = {
      api: read("systemd/geoeval-api.service"),
      web: read("systemd/geoeval-web.service"),
      worker: read("systemd/geoeval-worker.service"),
      recharge: read("systemd/geoeval-recharge-worker.service"),
    };

    expect(units.api).toContain("dist/api-main.js");
    expect(units.web).toContain("standalone/apps/web/server.js");
    expect(units.worker).toContain("dist/worker-main.js");
    expect(units.recharge).toContain("dist/recharge-worker-main.js");
    for (const unit of Object.values(units)) {
      expect(unit).toContain("ProtectSystem=strict");
      expect(unit).toContain("ProtectProc=invisible");
      expect(unit).toContain("NoNewPrivileges=true");
      expect(unit).toContain("ReadOnlyPaths=/opt/geoeval");
      expect(unit).toContain("Slice=geo.slice");
      expect(unit).toMatch(/MemoryMax=\d+M/);
      expect(unit).toMatch(/NODE_OPTIONS=--max-old-space-size=\d+/);
    }
    expect(units.web).toContain("User=geoeval-web");
    expect(units.web).not.toMatch(/DATABASE_URL|PRIVATE_KEY|API_KEY/);
    expect(units.api).toContain("User=geoeval-app");
    expect(units.worker).toContain("User=geoeval-app");
    expect(units.recharge).toContain("User=geoeval-app");
  });

  it("copies the Alipay private key only into payment-authorized processes", () => {
    const api = read("systemd/geoeval-api.service");
    const recharge = read("systemd/geoeval-recharge-worker.service");
    const web = read("systemd/geoeval-web.service");
    const worker = read("systemd/geoeval-worker.service");
    const callback = read(
      "../recharge-callback/systemd/geoeval-recharge-callback.service",
    );

    expect(api).toContain("LoadCredential=alipay_private_key.pem:");
    expect(recharge).toContain("LoadCredential=alipay_private_key.pem:");
    expect(web).not.toMatch(/alipay/i);
    expect(worker).not.toMatch(/alipay/i);
    expect(callback).not.toMatch(/alipay.*private/i);
  });

  it("raises the shared GEO budget while retaining per-process ceilings", () => {
    const slice = read("systemd/geo.slice.d/30-geoeval-application.conf");
    const target = read(
      "systemd/geo-runtime.target.d/30-geoeval-application.conf",
    );

    expect(slice).toContain("MemoryHigh=768M");
    expect(slice).toContain("MemoryMax=1G");
    expect(target).toContain("geoeval-api.service");
    expect(target).toContain("geoeval-web.service");
    expect(target).toContain("geoeval-worker.service");
    expect(target).toContain("geoeval-recharge-worker.service");
    expect(target).not.toContain("Requires=");
  });

  it("gives the application runtime DML without migration authority", () => {
    const grants = read("postgresql/grant-application.sql");

    expect(grants).toContain('CREATE ROLE "geoeval-app" LOGIN');
    expect(grants).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "geoeval-app"',
    );
    expect(grants).toContain(
      'REVOKE CREATE ON SCHEMA public FROM "geoeval-app"',
    );
    expect(grants).toContain("NOSUPERUSER NOCREATEDB NOCREATEROLE");
    expect(grants).not.toMatch(/GRANT\s+ALL/i);
  });

  it("keeps examples secret-free and explicit about production activation", () => {
    const api = read("application-api.env.example");
    const web = read("application-web.env.example");
    const worker = read("application-worker.env.example");
    const recharge = read("application-recharge-worker.env.example");
    const all = [api, web, worker, recharge].join("\n");

    expect(api).toContain("AUTH_CHALLENGE_MODE=aliyun");
    expect(api).toContain("AUTH_CHALLENGE_SENDING_ENABLED=0");
    expect(api).toContain("STORE_LOCATION_MODE=amap");
    expect(api).toContain("RECHARGE_ALIPAY_ACTIVATION=live");
    expect(api).toContain("RECHARGE_WECHAT_ACTIVATION=disabled");
    expect(worker).toContain("AI_EXECUTION_MODE=real");
    expect(worker).toContain("AI_TELEMETRY_CONTENT_MODE=metadata-only");
    expect(worker).toContain("replace-with-approved-workspace-host");
    expect(recharge).toContain("RECHARGE_ALIPAY_ACTIVATION=live");
    expect(web).toContain(
      "GEOEVAL_INTERNAL_API_BASE_URL=http://127.0.0.1:3301",
    );
    expect(all).not.toMatch(/=(?:sk-|pk-|ark-|bce-v3\/|[0-9a-f]{32})/i);
  });

  it("keeps API and Worker examples aligned with the executable config", () => {
    const api = loadApiConfig({
      ...environment("application-api.env.example"),
      ALIBABA_CLOUD_ACCESS_KEY_ID: "fixture-id",
      ALIBABA_CLOUD_ACCESS_KEY_SECRET: "fixture-secret",
      ALIYUN_CAPTCHA_SCENE_ID: "fixture-scene",
      ALIYUN_SMS_SIGN_NAME: "测试主体",
      ALIYUN_SMS_TEMPLATE_CODE: "SMS_123456",
      AUTH_HASH_PEPPER: "fixture-auth-pepper-at-least-32-bytes",
      STORE_LOCATION_RECEIPT_SIGNING_SECRET:
        "fixture-location-secret-at-least-32-bytes",
      AMAP_WEB_SERVICE_KEY: "fixture-amap-server-key",
    });
    const worker = loadWorkerConfig({
      ...environment("application-worker.env.example"),
      TOKENHUB_API_KEY: "fixture-tokenhub",
      ARK_API_KEY: "fixture-ark",
      DASHSCOPE_API_KEY: "fixture-model-studio",
      QIANFAN_API_KEY: "fixture-qianfan",
      LANGFUSE_PUBLIC_KEY: "fixture-langfuse-public",
      LANGFUSE_SECRET_KEY: "fixture-langfuse-secret",
      LANGFUSE_RELEASE: "fixture-release",
    });

    expect(api.runtimeEnvironment).toBe("production");
    expect(api.authChallengeMode).toBe("aliyun");
    expect(api.authChallengeSendingEnabled).toBe(false);
    expect(api.storeLocation.mode).toBe("amap");
    expect(worker.runtimeEnvironment).toBe("production");
    expect(worker.aiExecution.mode).toBe("real");
    expect(worker.aiExecution.telemetry).toMatchObject({
      mode: "langfuse",
      contentMode: "metadata-only",
      environment: "production",
    });
  });
});
