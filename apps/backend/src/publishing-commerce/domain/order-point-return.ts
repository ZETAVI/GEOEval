import {
  checkPointCapacity,
  MAX_POINTS,
  type PointBalance,
  type PointCapacity,
} from "./point-account.js";

export class OrderPointReturnError extends Error {
  readonly code = "INVALID_ORDER_RETURN";
}

/**
 * Computes one agreed positive return from the ORIGINAL consumption, not the
 * current wallet composition. The transaction owner still enforces original
 * ledger identity, administrator authority, once-only execution and atomicity.
 */
export function computeOrderPointReturn(
  original: { granted: number; funded: number },
  amount: number,
  wallet: PointCapacity,
): {
  grantedDelta: number;
  fundedDelta: number;
  balance: PointBalance;
} {
  const validOrigin = (value: number) =>
    Number.isSafeInteger(value) && value >= 0 && value <= MAX_POINTS;
  const total = original.granted + original.funded;
  if (
    !validOrigin(original.granted) ||
    !validOrigin(original.funded) ||
    total < 1 ||
    total > MAX_POINTS ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > total
  )
    throw new OrderPointReturnError(
      "实际退点必须是原消费范围内的正整数；零额由履约关闭处理",
    );
  checkPointCapacity(wallet, wallet);

  // Products can exceed Number.MAX_SAFE_INTEGER even though each point value
  // fits an Int. Largest remainder preserves the accepted granted-tie rule.
  const divisor = BigInt(total);
  const grantedNumerator = BigInt(amount) * BigInt(original.granted);
  const fundedNumerator = BigInt(amount) * BigInt(original.funded);
  let granted = grantedNumerator / divisor;
  let funded = fundedNumerator / divisor;
  if (granted + funded < BigInt(amount)) {
    if (fundedNumerator % divisor > grantedNumerator % divisor) funded += 1n;
    else granted += 1n;
  }
  const grantedDelta = Number(granted);
  const fundedDelta = Number(funded);
  const balance = {
    grantedBalance: wallet.grantedBalance + grantedDelta,
    fundedBalance: wallet.fundedBalance + fundedDelta,
    revision: wallet.revision + 1,
  };
  // HELD recharge reservations continue to consume both balance and ledger
  // capacity. A return cannot spend those reservations or silently clear them.
  checkPointCapacity(balance, wallet);
  return { grantedDelta, fundedDelta, balance };
}
