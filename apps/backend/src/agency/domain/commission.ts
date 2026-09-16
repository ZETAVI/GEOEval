import { BadRequestException } from "@nestjs/common";
/** One point is ten fen; rates are basis points. Positive half-fen rounds up. */
export function commissionFen(fundedPoints: number, rateBps: number): bigint {
  if (
    !Number.isSafeInteger(fundedPoints) ||
    fundedPoints < 0 ||
    fundedPoints > 2147483647 ||
    !Number.isInteger(rateBps) ||
    rateBps < 0 ||
    rateBps > 10000
  )
    throw new BadRequestException("佣金来源或费率无效");
  return (BigInt(fundedPoints) * BigInt(rateBps) + 500n) / 1000n;
}
