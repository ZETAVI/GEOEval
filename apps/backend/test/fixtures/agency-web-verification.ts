import { strict as assert } from "node:assert";
import { PrismaService } from "../../src/infrastructure/prisma.service.js";
import { PostgresAcquisitionRepository } from "../../src/agency/infrastructure/postgres-acquisition.repository.js";
import { loadIntegrationApiConfig } from "../integration-test-config.js";
const config = loadIntegrationApiConfig();
if (
  new URL(config.databaseUrl).pathname !== "/geoeval_issue100" ||
  process.env.REDIS_URL !== "redis://127.0.0.1:56379/10"
)
  throw new Error("AGENCY_OWNED_TARGET_REQUIRED");
const db = new PrismaService(config.databaseUrl);
await db.$connect();
try {
  const admin = await db.account.findUniqueOrThrow({
    where: { mobile: "+8613900010801" },
  });
  const agentA = await db.account.findUniqueOrThrow({
    where: { mobile: "+8613900010802" },
  });
  const agentB = await db.account.upsert({
    where: { mobile: "+8613900010804" },
    create: { mobile: "+8613900010804", role: "AGENT" },
    update: {},
  });
  const owner = new PostgresAcquisitionRepository(db);
  const a = (await owner.issueLink(admin.id, agentA.id)).entryKey;
  const b = (await owner.issueLink(admin.id, agentB.id)).entryKey;
  const base = "http://127.0.0.1:3290";
  async function open(key: string, cookie?: string) {
    const response = await fetch(`${base}/e/${key}`, {
      redirect: "manual",
      headers: cookie ? { cookie } : {},
    });
    assert.equal(response.status, 303);
    assert.match(response.headers.get("cache-control")!, /no-store/);
    const setCookie = response.headers.get("set-cookie")!;
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=lax/i);
    assert.doesNotMatch(setCookie, /Domain=/i);
    return {
      cookie: setCookie.split(";", 1)[0]!,
      expires: /expires=([^;]+)/i.exec(setCookie)![1]!,
    };
  }
  async function homepage(cookie?: string) {
    const response = await fetch(base, { headers: cookie ? { cookie } : {} });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /no-store/);
    return await response.text();
  }
  const publicHtml = await homepage();
  assert.ok(!publicHtml.includes(`/e/${a}`) && !publicHtml.includes(`/e/${b}`));
  const va = await open(a),
    vb = await open(b);
  assert.notEqual(va.cookie, vb.cookie);
  const [ha, hb] = await Promise.all([
    homepage(va.cookie),
    homepage(vb.cookie),
  ]);
  assert.ok(ha.includes(`href="/e/${a}"`) && !ha.includes(`href="/e/${b}"`));
  assert.ok(hb.includes(`href="/e/${b}"`) && !hb.includes(`href="/e/${a}"`));
  const copied = await open(a);
  assert.notEqual(copied.cookie, va.cookie);
  assert.ok((await homepage(copied.cookie)).includes(`href="/e/${a}"`));
  const renewed = await open(b, va.cookie);
  assert.equal(renewed.expires, va.expires);
  assert.ok((await homepage(renewed.cookie)).includes(`href="/e/${a}"`));
  console.log(
    JSON.stringify({
      public_entry: "passed",
      two_visitor_isolation: "passed",
      copied_link_new_credential: "passed",
      first_agent_preserved: "passed",
      expiry_not_renewed: "passed",
      private_no_store: "passed",
    }),
  );
} finally {
  await db.$disconnect();
}
