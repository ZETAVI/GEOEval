import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const deployment = resolve(root, "deploy/recharge-callback");
const read = (path: string) => readFileSync(resolve(deployment, path), "utf8");

function runtimeImports(path: string): string[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const imports: string[] = [];
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      const runtimeImport =
        clause === undefined ||
        (!clause.isTypeOnly &&
          (clause.name !== undefined ||
            clause.namedBindings === undefined ||
            ts.isNamespaceImport(clause.namedBindings) ||
            clause.namedBindings.elements.some((value) => !value.isTypeOnly)));
      if (runtimeImport && ts.isStringLiteral(statement.moduleSpecifier))
        imports.push(statement.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      imports.push(statement.moduleSpecifier.text);
    }
  }
  return imports;
}

function callbackModuleGraph() {
  const entry = resolve(root, "apps/backend/src/recharge-callback-main.ts");
  const files = new Set<string>();
  const packages = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const path = pending.pop()!;
    if (files.has(path)) continue;
    files.add(path);
    for (const specifier of runtimeImports(path)) {
      if (!specifier.startsWith(".")) {
        packages.add(specifier);
        continue;
      }
      const candidate = resolve(
        dirname(path),
        specifier.replace(/\.js$/, ".ts"),
      );
      if (!existsSync(candidate))
        throw new Error(`UNRESOLVED_CALLBACK_IMPORT:${path}:${specifier}`);
      pending.push(candidate);
    }
  }
  return { files: [...files], packages: [...packages] };
}

describe("recharge callback production deployment boundary", () => {
  it("keeps the passive callback runtime free of the Alipay payment SDK and full adapter", () => {
    const graph = callbackModuleGraph();

    expect(graph.packages).not.toContain("alipay-sdk");
    expect(graph.packages).not.toContain("urllib");
    expect(graph.files).not.toContain(
      resolve(
        root,
        "apps/backend/src/recharge/infrastructure/alipay/alipay-payment.adapter.ts",
      ),
    );
    expect(graph.files).not.toContain(
      resolve(
        root,
        "apps/backend/src/recharge/alipay-recharge.runtime-config.ts",
      ),
    );
  });

  it("runs only the callback host with copied credentials and a dedicated identity", () => {
    const service = read("systemd/geoeval-recharge-callback.service");

    expect(service).toContain("User=geoeval-callback");
    expect(service).toContain("Group=geo-runtime");
    expect(service).toContain("Slice=geo.slice");
    expect(service).toContain(
      "Environment=NODE_OPTIONS=--max-old-space-size=64",
    );
    expect(service).toContain("MemoryHigh=176M");
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
    expect(service).toContain(
      "LoadCredential=alipay_public_key.pem:/opt/geoeval/shared/secrets/alipay/2021007100630148/alipay_public_key.pem",
    );
    expect(service).toContain(
      "RECHARGE_ALIPAY_PUBLIC_KEY_FILE=%d/alipay_public_key.pem",
    );
    expect(service).not.toMatch(/merchant[_-](private|cert)/i);
    expect(service).not.toMatch(/alipay.*private/i);
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
    expect(target).toContain("Wants=postgresql@16-main.service");
    expect(target).not.toContain("Requires=");
    expect(target).toContain("geoeval-recharge-callback.service");
  });

  it("stores absolute timestamps in UTC while presentation uses China Standard Time", () => {
    const postgres = read("postgresql/20-geoeval.conf");

    expect(postgres).toContain("timezone = 'UTC'");
  });

  it("grants the callback role only the two durable inbox tables", () => {
    const grants = read("postgresql/grant-callback.sql");

    expect(grants).toContain("recharge_payment_observations");
    expect(grants).toContain("recharge_notification_receipts");
    expect(grants).not.toMatch(/GRANT\s+ALL/i);
    expect(grants).not.toMatch(/recharge_orders|point_changes|accounts/i);
    expect(grants).not.toMatch(/\bDELETE\b/);
  });

  it("publishes only the exact provider callback paths", () => {
    const nginx = read("nginx/app.geohdp.com.conf");

    expect(nginx).toContain("location = /recharges/providers/wechat/notify");
    expect(nginx).toContain("location = /recharges/providers/alipay/notify");
    expect(nginx).toMatch(
      /location = \/recharges\/providers\/alipay\/notify \{\s+client_max_body_size 64k;/,
    );
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3300;");
    expect(nginx).toMatch(/location \/ \{\s+return 503;/);
    expect(nginx).not.toMatch(/proxy_pass\s+http:\/\/127\.0\.0\.1:3300\/;/);
  });

  it("keeps secret values out of the environment file", () => {
    const environment = read("recharge-callback.env.example");

    expect(environment).toContain("RECHARGE_WECHAT_ACTIVATION=verify");
    expect(environment).toContain("RECHARGE_ALIPAY_ACTIVATION=verify");
    expect(environment).toContain("RECHARGE_ALIPAY_APP_ID=2021007100630148");
    expect(environment).toContain(
      "RECHARGE_ALIPAY_MERCHANT_ID=2088631900727575",
    );
    expect(environment).toContain(
      "DATABASE_URL=postgresql://geoeval-callback@localhost/geoeval?host=%2Fvar%2Frun%2Fpostgresql",
    );
    expect(environment).toContain(
      "PUB_KEY_ID_0111177257782026091700211615001802",
    );
    expect(environment).not.toMatch(/API_V3_KEY=/);
    expect(environment).not.toMatch(/PRIVATE_KEY/);
    expect(environment).not.toMatch(/ALIPAY_PUBLIC_KEY_FILE/);
  });
});
