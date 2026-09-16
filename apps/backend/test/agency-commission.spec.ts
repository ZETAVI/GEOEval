import { describe, it, expect } from "vitest";
import { commissionFen } from "../src/agency/domain/commission.js";
import {
  allocateOrderPointReturn,
  computeOrderPointReturn,
} from "../src/publishing-commerce/domain/order-point-return.js";
describe("commission based on original funded consumption", () => {
  it("uses the existing source split and excludes grants and returns", () => {
    const returned = allocateOrderPointReturn(
      { granted: 200, funded: 800 },
      250,
    );
    expect(returned).toEqual({ grantedDelta: 50, fundedDelta: 200 });
    expect(commissionFen(800 - returned.fundedDelta, 1000)).toBe(600n);
  });
  it.each([
    [1, 49, 0n],
    [1, 50, 0n],
    [1, 499, 0n],
    [1, 500, 1n],
    [1, 1000, 1n],
    [2147483647, 10000, 21474836470n],
    [0, 1000, 0n],
    [123, 0, 0n],
  ])("rounds %s points at %s bps to %s fen exactly", (points, rate, expected) =>
    expect(commissionFen(points, rate)).toBe(expected),
  );
  it("shares forecast allocation with actual credit without requiring a wallet for an estimate", () => {
    for (const original of [
      { granted: 1, funded: 1 },
      { granted: 100, funded: 200 },
      { granted: 0, funded: 7 },
      { granted: 7, funded: 0 },
    ]) {
      expect(allocateOrderPointReturn(original, 0)).toEqual({
        fundedDelta: 0,
        grantedDelta: 0,
      });
      for (
        let amount = 1;
        amount <= original.granted + original.funded;
        amount++
      ) {
        const actual = computeOrderPointReturn(original, amount, {
          grantedBalance: 0,
          fundedBalance: 0,
          revision: 1,
          reservedFundedPoints: 0,
          reservedLedgerSlots: 0,
        });
        expect(allocateOrderPointReturn(original, amount)).toEqual({
          grantedDelta: actual.grantedDelta,
          fundedDelta: actual.fundedDelta,
        });
      }
    }
  });
  it("rejects invalid money rather than silently rounding points or rate", () => {
    for (const [points, rate] of [
      [-1, 1000],
      [1.1, 1000],
      [1, -1],
      [1, 10001],
      [2147483648, 1],
    ])
      expect(() => commissionFen(points!, rate!)).toThrow();
  });
});
