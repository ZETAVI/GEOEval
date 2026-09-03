import { describe, expect, it } from "vitest";

import { mediaResourceEffectiveStatus } from "../src/media-supply/domain/media-resource-availability.js";

describe("media resource effective availability", () => {
  it.each([
    ["ACTIVE", "ACTIVE", "ACTIVE"],
    ["ACTIVE", "INACTIVE", "SUPPLIER_INACTIVE"],
    ["INACTIVE", "ACTIVE", "MANUAL_INACTIVE"],
    ["INACTIVE", "INACTIVE", "MANUAL_INACTIVE"],
  ] as const)(
    "maps resource %s and supplier %s to %s",
    (resource, supplier, expected) => {
      expect(mediaResourceEffectiveStatus(resource, supplier)).toBe(expected);
    },
  );
});
