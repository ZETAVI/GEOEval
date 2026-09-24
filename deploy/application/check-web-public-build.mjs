import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const phase = process.argv[2];
if (phase !== "before" && phase !== "after") {
  throw new Error("Usage: node check-web-public-build.mjs before|after");
}

const required = [
  "NEXT_PUBLIC_AMAP_JS_KEY",
  "NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX",
  "NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID",
];
if (process.env.NEXT_PUBLIC_API_BASE_URL !== "/api") {
  throw new Error(
    "Production Web build requires NEXT_PUBLIC_API_BASE_URL=/api",
  );
}
if (process.env.NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE !== "aliyun") {
  throw new Error(
    "Production Web build requires NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE=aliyun",
  );
}
if (process.env.NEXT_PUBLIC_INTERNAL_DEMO_MODE === "enabled") {
  throw new Error("Production Web build must not enable internal Demo mode");
}
for (const name of required) {
  if (!process.env[name]?.trim()) {
    throw new Error(`Production Web build requires ${name}`);
  }
}

if (phase === "after") {
  const chunks = join(resolve("apps/web/.next"), "static/chunks");
  const files = readdirSync(chunks, { recursive: true })
    .map((name) => join(chunks, name))
    .filter((name) => name.endsWith(".js") && statSync(name).isFile());
  if (files.length === 0) throw new Error("No Web JavaScript chunks found");
  const bundle = files.map((name) => readFileSync(name, "utf8")).join("\n");
  const unresolved = [
    "NEXT_PUBLIC_API_BASE_URL",
    "NEXT_PUBLIC_AMAP_JS_KEY",
    "NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE",
    "NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX",
    "NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID",
  ].filter((name) => bundle.includes(name));
  if (unresolved.length > 0) {
    throw new Error(
      `Unresolved public Web variables: ${unresolved.join(", ")}`,
    );
  }
  for (const name of required) {
    if (!bundle.includes(process.env[name])) {
      throw new Error(`${name} is absent from the compiled Web chunks`);
    }
  }
  if (bundle.includes("http://127.0.0.1:3300")) {
    throw new Error("Compiled Web chunks still contain the local API fallback");
  }
}

console.log(`Production Web public-build check passed (${phase})`);
