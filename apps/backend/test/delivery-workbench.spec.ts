import { describe, expect, it } from "vitest";
import {
  deliveryListQuerySchema,
  deliverySchedule,
} from "../src/publication-delivery/domain/delivery-workbench.js";

describe("delivery workbench expectation", () => {
  const purchasedAt = new Date("2026-09-01T00:00:00.000Z");
  it.each([
    ["2026-09-05T23:59:59.999Z", "NORMAL"],
    ["2026-09-06T00:00:00.000Z", "NORMAL"],
    ["2026-09-07T00:00:00.000Z", "NEARING_DEADLINE"],
    ["2026-09-08T00:00:00.000Z", "NEARING_DEADLINE"],
    ["2026-09-08T00:00:00.001Z", "DELAYED"],
  ])("classifies %s only for presentation", (now, urgency) => {
    expect(
      deliverySchedule(purchasedAt, "PUBLISHING", Date.parse(now)),
    ).toEqual({
      expectedCompletionAt: new Date("2026-09-08T00:00:00.000Z"),
      urgency,
    });
  });
  it("never labels completed service overdue", () => {
    expect(
      deliverySchedule(
        purchasedAt,
        "COMPLETED",
        Date.parse("2026-09-30T00:00:00Z"),
      ).urgency,
    ).toBe("COMPLETED");
  });
  it("requires a complete, valid immutable cursor and drops the old pagination contract", () => {
    for (const query of [
      { cursorCreatedAt: purchasedAt.toISOString() },
      { cursorSequence: 1 },
      { cursorCreatedAt: "invalid", cursorSequence: 1 },
      { cursorCreatedAt: purchasedAt.toISOString(), cursorSequence: 0 },
      { beforeSequence: 1 },
    ])
      expect(deliveryListQuerySchema.safeParse(query).success).toBe(false);
    expect(
      deliveryListQuerySchema.parse({
        cursorCreatedAt: purchasedAt.toISOString(),
        cursorSequence: "2",
      }),
    ).toMatchObject({
      scope: "POOL",
      state: "ACTIVE",
      cursorSequence: 2,
    });
  });
});
