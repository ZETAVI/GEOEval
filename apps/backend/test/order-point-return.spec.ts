import { describe, expect, it } from "vitest";
import {
  MAX_POINTS,
  type PointCapacity,
} from "../src/publishing-commerce/domain/point-account.js";
import { computeOrderPointReturn } from "../src/publishing-commerce/domain/order-point-return.js";

const wallet = (changes: Partial<PointCapacity> = {}): PointCapacity => ({
  grantedBalance: 0,
  fundedBalance: 0,
  revision: 1,
  reservedFundedPoints: 0,
  reservedLedgerSlots: 0,
  ...changes,
});

describe("original-source order return arithmetic and shared capacity", () => {
  it("restores original sources in full without mutating the locked snapshot", () => {
    const current = wallet({ grantedBalance: 20, fundedBalance: 30 });
    expect(
      computeOrderPointReturn({ granted: 6, funded: 4 }, 10, current),
    ).toEqual({
      grantedDelta: 6,
      fundedDelta: 4,
      balance: { grantedBalance: 26, fundedBalance: 34, revision: 2 },
    });
    expect(current).toEqual(wallet({ grantedBalance: 20, fundedBalance: 30 }));
  });
  it.each([
    [{ granted: 10, funded: 0 }, 3, 3, 0],
    [{ granted: 0, funded: 10 }, 3, 0, 3],
    [{ granted: 1, funded: 1 }, 1, 1, 0],
    [{ granted: 1, funded: 2 }, 1, 0, 1],
    [{ granted: 2, funded: 1 }, 1, 1, 0],
  ] as const)(
    "allocates %o / %s according to original ratio and granted ties",
    (origin, amount, g, f) => {
      expect(
        computeOrderPointReturn(
          origin,
          amount,
          wallet({ grantedBalance: 90, fundedBalance: 1 }),
        ),
      ).toMatchObject({ grantedDelta: g, fundedDelta: f });
    },
  );
  it("retains exact products at the maximum supported consumption", () => {
    expect(
      computeOrderPointReturn(
        { granted: 1, funded: MAX_POINTS - 1 },
        MAX_POINTS - 1,
        wallet(),
      ),
    ).toMatchObject({ grantedDelta: 1, fundedDelta: MAX_POINTS - 2 });
    expect(
      computeOrderPointReturn(
        { granted: MAX_POINTS - 1, funded: 1 },
        MAX_POINTS,
        wallet({ revision: MAX_POINTS - 1 }),
      ),
    ).toEqual({
      grantedDelta: MAX_POINTS - 1,
      fundedDelta: 1,
      balance: {
        grantedBalance: MAX_POINTS - 1,
        fundedBalance: 1,
        revision: MAX_POINTS,
      },
    });
  });
  it.each([0, -1, 0.5, 11, MAX_POINTS + 1, NaN, Infinity])(
    "rejects invalid positive return %s",
    (amount) => {
      expect(() =>
        computeOrderPointReturn({ granted: 5, funded: 5 }, amount, wallet()),
      ).toThrow(/正整数/);
    },
  );
  it.each([
    { granted: 0, funded: 0 },
    { granted: -1, funded: 10 },
    { granted: 1.5, funded: 10 },
    { granted: NaN, funded: 10 },
    { granted: MAX_POINTS, funded: 1 },
  ])("rejects invalid original consumption %o", (origin) => {
    expect(() => computeOrderPointReturn(origin, 1, wallet())).toThrow(
      /原消费/,
    );
  });
  it("honors HELD recharge balance capacity", () => {
    expect(() =>
      computeOrderPointReturn(
        { granted: 1, funded: 0 },
        1,
        wallet({
          grantedBalance: MAX_POINTS - 1,
          reservedFundedPoints: 1,
          reservedLedgerSlots: 1,
        }),
      ),
    ).toThrow(/容量/);
  });
  it("honors HELD ledger-slot capacity", () => {
    expect(() =>
      computeOrderPointReturn(
        { granted: 1, funded: 0 },
        1,
        wallet({
          revision: MAX_POINTS - 1,
          reservedFundedPoints: 1,
          reservedLedgerSlots: 1,
        }),
      ),
    ).toThrow(/容量/);
  });
  it("accepts available capacity while retaining the reservations unchanged", () => {
    const current = wallet({
      revision: MAX_POINTS - 2,
      reservedFundedPoints: 10,
      reservedLedgerSlots: 1,
    });
    const result = computeOrderPointReturn(
      { granted: 2, funded: 1 },
      3,
      current,
    );
    expect(result.balance.revision).toBe(MAX_POINTS - 1);
    expect(current.reservedFundedPoints).toBe(10);
    expect(current.reservedLedgerSlots).toBe(1);
    expect(result.balance).not.toHaveProperty("reservedFundedPoints");
  });
  it("does not silently repair an invalid pre-write balance", () => {
    expect(() =>
      computeOrderPointReturn(
        { granted: 5, funded: 0 },
        5,
        wallet({ grantedBalance: -1 }),
      ),
    ).toThrow(/容量/);
  });
  it("conserves whole points, source bounds and full restoration over the small domain", () => {
    for (let granted = 0; granted <= 12; granted += 1) {
      for (let funded = 0; funded <= 12; funded += 1) {
        const total = granted + funded;
        for (let amount = 1; amount <= total; amount += 1) {
          const result = computeOrderPointReturn(
            { granted, funded },
            amount,
            wallet(),
          );
          expect(result.grantedDelta + result.fundedDelta).toBe(amount);
          expect(result.grantedDelta).toBeGreaterThanOrEqual(0);
          expect(result.fundedDelta).toBeGreaterThanOrEqual(0);
          expect(result.grantedDelta).toBeLessThanOrEqual(granted);
          expect(result.fundedDelta).toBeLessThanOrEqual(funded);
          if (amount === total)
            expect(result).toMatchObject({
              grantedDelta: granted,
              fundedDelta: funded,
            });
        }
      }
    }
  });
});
