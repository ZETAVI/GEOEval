import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Store Brand v3 migration safety", () => {
  it("fails closed on non-empty Brand/evaluation data before dropping v2 fields", () => {
    const migration = readFileSync(
      new URL(
        "../prisma/migrations/20260903050000_activate_store_brand_context_v3/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const guard = migration.indexOf(
      "Store Brand v3 activation requires an explicitly authorized empty database",
    );
    const destructiveAlter = migration.indexOf('ALTER TABLE "brand_profiles"');
    const firstSchemaWrite = migration.indexOf(
      'CREATE TYPE "BrandStoreLocationProvider"',
    );

    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(firstSchemaWrite);
    expect(guard).toBeLessThan(destructiveAlter);
    expect(migration).toContain('SELECT 1 FROM "brand_profiles"');
    expect(migration).toContain('SELECT 1 FROM "evaluation_definitions"');
    expect(migration).toContain('DROP COLUMN "province_region_id"');
  });
});
