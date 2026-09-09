/** Temporary local browser fixture; never registered in a normal build. */
import { mkdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const web = join(root, "apps/web");
const directory = join(web, "app/native-checkout-preview");
const page = join(directory, "page.tsx");
await mkdir(directory); // fails if any existing route owns this location
await writeFile(
  page,
  'export { default } from "../../test/fixtures/native-checkout-preview.js";\n',
  { flag: "wx" },
);
const child = spawn(
  join(web, "node_modules/.bin/next"),
  ["dev", "--hostname", "127.0.0.1", "--port", "32577"],
  {
    cwd: web,
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  },
);
let done = false;
async function cleanup(code = 0) {
  if (done) return;
  done = true;
  await unlink(page);
  await rmdir(directory);
  process.exitCode = code;
}
process.once("SIGINT", () => child.kill("SIGINT"));
process.once("SIGTERM", () => child.kill("SIGTERM"));
child.once("error", async () => cleanup(1));
child.once("exit", async (code) => cleanup(code ?? 0));
console.log(
  "Local fixture: http://127.0.0.1:32577/native-checkout-preview (no payment backend)",
);
