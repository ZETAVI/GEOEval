import { describe, expect, it } from "vitest";
import { formatPoints, formatSignedPoints } from "../app/point-format.js";

describe("point presentation", () => {
  it("keeps points distinct from renminbi", () => {
    expect(formatPoints(1000)).toBe("⚡1,000");
    expect(formatPoints(-10)).toBe("-⚡10");
    expect(formatSignedPoints(10)).toBe("+⚡10");
  });
});
