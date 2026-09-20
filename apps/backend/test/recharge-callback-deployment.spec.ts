import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const deployment = resolve(root, "deploy/recharge-callback");
const read = (path: string) => readFileSync(resolve(deployment, path), "utf8");

describe("recharge callback production deployment boundary", () => {
  it("runs only the callback host with copied credentials and a dedicated identity", () => {
    const service = read("systemd/geoeval-recharge-callback.service");

    expect(service).toContain("User=geoeval-callback");
    expect(service).toContain("Group=geo-runtime");
    expect(service).toContain("Slice=geo.slice");
    expect(service).toContain("MemoryHigh=128M");
    expect(service).toContain("MemoryMax=192M");
    expect(service).toContain("dist/recharge-callback-main.js");
    expect(service).toContain(
      "LoadCredential=wechat_public_key.pem:/opt/geoeval/shared/secrets/wechat/wechatpay_public_key.pem",
    );
    expect(service).toContain(
      "LoadCredential=api_v3.key:/opt/geoeval/shared/secrets/wechat/api_v3.key",
    );
    expect(service).toContain(
      "RECHARGE_WECHAT_PUBLIC_KEY_FILE=%d/wechat_public_key.pem",
    );
    expect(service).toContain("RECHARGE_WECHAT_API_V3_KEY_FILE=%d/api_v3.key");
    expect(service).not.toMatch(/merchant[_-](private|cert)/i);
    expect(service).not.toMatch(/api-main|worker-main|redis/i);
  });

  it("keeps PostgreSQL and callback work inside the existing GEO budget", () => {
    const postgres = read(
      "systemd/postgresql@16-main.service.d/20-geo-slice.conf",
    );
    const target = read(
      "systemd/geo-runtime.target.d/20-geoeval-recharge-callback.conf",
    );

    expect(postgres).toContain("PartOf=geo-runtime.target");
    expect(postgres).toContain("Slice=geo.slice");
    expect(postgres).toContain("MemoryHigh=256M");
    expect(postgres).toContain("MemoryMax=320M");
    expect(target).toContain("Requires=postgresql@16-main.service");
    expect(target).toContain("geoeval-recharge-callback.service");
  });

  it("grants the callback role only the two durable inbox tables", () => {
    const grants = read("postgresql/grant-callback.sql");

    expect(grants).toContain("recharge_payment_observations");
    expect(grants).toContain("recharge_notification_receipts");
    expect(grants).not.toMatch(/GRANT\s+ALL/i);
    expect(grants).not.toMatch(/recharge_orders|point_changes|accounts/i);
    expect(grants).not.toMatch(/\bDELETE\b/);
  });

  it("publishes only the exact WeChat callback path", () => {
    const nginx = read("nginx/app.geohdp.com.conf");

    expect(nginx).toContain("location = /recharges/providers/wechat/notify");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3300;");
    expect(nginx).toMatch(/location \/ \{\s+return 503;/);
    expect(nginx).not.toMatch(/proxy_pass\s+http:\/\/127\.0\.0\.1:3300\/;/);
  });

  it("keeps secret values out of the environment file", () => {
    const environment = read("recharge-callback.env.example");

    expect(environment).toContain("RECHARGE_WECHAT_ACTIVATION=verify");
    expect(environment).toContain(
      "PUB_KEY_ID_0111177257782026091700211615001802",
    );
    expect(environment).not.toMatch(/API_V3_KEY=/);
    expect(environment).not.toMatch(/PRIVATE_KEY/);
  });
});
