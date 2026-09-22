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
    expect(nginx).toContain("location = /api/identity/challenges");
    expect(nginx).toContain("location = /api/identity/sessions");
    expect(nginx).toContain("location ^~ /api/");
    expect(nginx).toContain("rewrite ^/api/(.*)$ /$1 break;");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3300;");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3301;");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3200;");
    expect(nginx).toContain("proxy_buffering off;");
    expect(nginx).not.toContain("auth_basic");
    expect(nginx).toContain(
      "limit_req_zone $binary_remote_addr zone=geoeval_auth_issue:10m rate=6r/m;",
    );
    expect(nginx).toContain(
      "limit_req_zone $binary_remote_addr zone=geoeval_auth_complete:10m rate=30r/m;",
    );
    expect(nginx.match(/limit_req zone=geoeval_auth_issue/g)).toHaveLength(2);
    expect(nginx.match(/limit_req zone=geoeval_auth_complete/g)).toHaveLength(
      1,
    );
    expect(nginx.match(/proxy_set_header Authorization "";/g)).toHaveLength(7);
    expect(nginx).toContain(
      'add_header Strict-Transport-Security "max-age=31536000" always;',
    );
    expect(nginx).toContain('add_header X-Frame-Options "DENY" always;');
    expect(nginx.indexOf("/recharges/providers/alipay/notify")).toBeLessThan(
      nginx.lastIndexOf("location / {"),
    );
    expect(nginx.indexOf("location = /api/entry/challenge")).toBeLessThan(
      nginx.indexOf("location ^~ /api/"),
    );
    expect(nginx.indexOf("location = /api/identity/challenges")).toBeLessThan(
      nginx.indexOf("location ^~ /api/"),
    );
  });

  it("runs each entry point in a bounded hardened service", () => {
    const units = {
      api: read("systemd/geoeval-api.service"),
      web: read("systemd/geoeval-web.service"),
      worker: read("systemd/geoeval-worker.service"),
      recharge: read("systemd/geoeval-recharge-worker.service"),
      callback: read(
        "../recharge-callback/systemd/geoeval-recharge-callback.service",
      ),
    };

    expect(units.api).toContain("dist/api-main.js");
    expect(units.web).toContain("standalone/apps/web/server.js");
    expect(units.worker).toContain("dist/worker-main.js");
    expect(units.recharge).toContain("dist/recharge-worker-main.js");
    expect(units.callback).toContain("dist/recharge-callback-main.js");
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
    expect(units.recharge).toContain("NODE_OPTIONS=--max-old-space-size=64");
    expect(units.recharge).toContain("MemoryHigh=160M");
    expect(units.recharge).toContain("MemoryMax=192M");
    expect(units.callback).toContain("MemoryHigh=176M");
    expect(units.callback).toContain("MemoryMax=192M");
    expect(
      Object.values(units).reduce((total, unit) => {
        const value = unit.match(/MemoryMax=(\d+)M/)?.[1];
        expect(value).toBeDefined();
        return total + Number(value);
      }, 0),
    ).toBeLessThanOrEqual(1280);
  });

  it("copies payment private keys only into payment-authorized processes", () => {
    const api = read("systemd/geoeval-api.service");
    const recharge = read("systemd/geoeval-recharge-worker.service");
    const web = read("systemd/geoeval-web.service");
    const worker = read("systemd/geoeval-worker.service");
    const callback = read(
      "../recharge-callback/systemd/geoeval-recharge-callback.service",
    );

    expect(api).toContain("LoadCredential=alipay_private_key.pem:");
    expect(recharge).toContain("LoadCredential=alipay_private_key.pem:");
    expect(api).toContain("/app_private_key.pem");
    expect(recharge).toContain("/app_private_key.pem");
    expect(`${api}\n${recharge}`).not.toContain("app_private_key_pkcs8.pem");
    for (const unit of [api, recharge]) {
      expect(unit).toContain("LoadCredential=wechat_merchant_private_key.pem:");
      expect(unit).toContain("/wechat/merchant_private_key.pem");
      expect(unit).toContain("LoadCredential=wechat_public_key.pem:");
      expect(unit).toContain("LoadCredential=wechat_api_v3.key:");
      expect(unit).toContain(
        "RECHARGE_WECHAT_PRIVATE_KEY_FILE=%d/wechat_merchant_private_key.pem",
      );
      expect(unit).toContain(
        "RECHARGE_WECHAT_PUBLIC_KEY_FILE=%d/wechat_public_key.pem",
      );
      expect(unit).toContain(
        "RECHARGE_WECHAT_API_V3_KEY_FILE=%d/wechat_api_v3.key",
      );
    }
    expect(web).not.toMatch(/alipay/i);
    expect(worker).not.toMatch(/alipay/i);
    expect(web).not.toMatch(/wechat/i);
    expect(worker).not.toMatch(/wechat/i);
    expect(callback).not.toMatch(/alipay.*private/i);
    expect(callback).not.toMatch(/wechat.*merchant.*private/i);
  });

  it("raises the shared GEO budget while retaining per-process ceilings", () => {
    const slice = read("systemd/geo.slice.d/30-geoeval-application.conf");
    const target = read(
      "systemd/geo-runtime.target.d/30-geoeval-application.conf",
    );

    expect(slice).toContain("MemoryHigh=1G");
    expect(slice).toContain("MemoryMax=1280M");
    expect(target).toContain("geoeval-api.service");
    expect(target).toContain("geoeval-web.service");
    expect(target).toContain("geoeval-worker.service");
    expect(target).toContain("geoeval-recharge-worker.service");
    expect(target).not.toContain("Requires=");
  });

  it("adapts database dependencies without changing application units on Alibaba Cloud Linux", () => {
    const overrides = [
      read(
        "systemd/alibaba-cloud-linux/geoeval-api.service.d/10-platform.conf",
      ),
      read(
        "systemd/alibaba-cloud-linux/geoeval-recharge-callback.service.d/10-platform.conf",
      ),
      read(
        "systemd/alibaba-cloud-linux/geoeval-recharge-worker.service.d/10-platform.conf",
      ),
      read(
        "systemd/alibaba-cloud-linux/geoeval-worker.service.d/10-platform.conf",
      ),
    ].join("\n");

    expect(overrides).toContain("Requires=postgresql-16.service");
    expect(overrides).toContain("Requires=postgresql-16.service redis.service");
    expect(overrides).not.toContain("postgresql@16-main.service");
    expect(overrides).not.toContain("redis-server.service");
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
    const webBuild = read("application-web-build.env.example");
    const worker = read("application-worker.env.example");
    const recharge = read("application-recharge-worker.env.example");
    const all = [api, web, webBuild, worker, recharge].join("\n");

    expect(api).toContain("INTERNAL_DEMO_MODE=0");
    expect(api).toContain("AUTH_CHALLENGE_MODE=aliyun");
    expect(api).toContain("AUTH_CHALLENGE_SENDING_ENABLED=1");
    expect(api).toContain("AUTH_HUMAN_VERIFICATION_MODE=aliyun");
    expect(api).toContain("AUTH_CAPTCHA_UNAVAILABLE_MODE=limited");
    expect(api).toContain("AUTH_CAPTCHA_MAX_CONSECUTIVE_UNAVAILABLE=1");
    expect(api).toContain("ALIYUN_CAPTCHA_SCENE_ID=18hnihr4");
    expect(api).toContain("ALIYUN_SMS_SIGN_NAME=互动派科技");
    expect(api).toContain("ALIYUN_SMS_TEMPLATE_CODE=SMS_496905143");
    expect(api).toContain("AUTH_CHALLENGE_DAILY_MAX_REQUESTS=100");
    expect(api).toContain("AUTH_CHALLENGE_MONTHLY_MAX_REQUESTS=2500");
    expect(api).not.toContain("AUTH_DETERMINISTIC_CODE=");
    expect(api).toContain("GEO_OPTIMIZATION_WRITER_MODE=demo");
    expect(api).toContain("STORE_LOCATION_MODE=amap");
    expect(api).toContain("RECHARGE_ALIPAY_ACTIVATION=live");
    expect(api).toContain("RECHARGE_WECHAT_ACTIVATION=live");
    expect(api).toContain("RECHARGE_WECHAT_MERCHANT_ID=1117725778");
    expect(api).toContain("RECHARGE_WECHAT_APP_ID=wx0402876c556f2029");
    expect(worker).toContain("AI_EXECUTION_MODE=real");
    expect(worker).toContain("AI_TELEMETRY_CONTENT_MODE=metadata-only");
    expect(worker).toContain("replace-with-approved-workspace-host");
    expect(recharge).toContain("RECHARGE_ALIPAY_ACTIVATION=live");
    expect(recharge).toContain("RECHARGE_WECHAT_ACTIVATION=live");
    expect(web).toContain(
      "GEOEVAL_INTERNAL_API_BASE_URL=http://127.0.0.1:3301",
    );
    expect(webBuild).toContain(
      "NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE=aliyun",
    );
    expect(webBuild).toContain("NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX=1fz571");
    expect(webBuild).toContain("NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID=18hnihr4");
    expect(webBuild).not.toContain("NEXT_PUBLIC_INTERNAL_DEMO_MODE=enabled");
    const valuesThatAreNotPublicIdentifiers = all
      .split("\n")
      .filter(
        (line) => !line.startsWith("RECHARGE_WECHAT_MERCHANT_CERT_SERIAL="),
      )
      .join("\n");
    expect(valuesThatAreNotPublicIdentifiers).not.toMatch(
      /=(?:sk-|pk-|ark-|bce-v3\/|[0-9a-f]{32})/i,
    );
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
    expect(api.internalDemoMode).toBe(false);
    expect(api.authChallengeMode).toBe("aliyun");
    expect(api.authChallengeSendingEnabled).toBe(true);
    expect(api.authHumanVerificationMode).toBe("aliyun");
    expect(api.authChallengePolicy).toMatchObject({
      dailyMaximumRequests: 100,
      monthlyMaximumRequests: 2500,
    });
    expect(api.geoOptimizationWriterMode).toBe("demo");
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
