import type { RechargeOptions } from "@geoeval/api-client";
import { formatPoints } from "../point-format.js";

export function parseRechargePoints(
  raw: string,
  options: Pick<
    RechargeOptions,
    "pointsPerYuan" | "minAmountYuan" | "maxAmountYuan"
  >,
) {
  if (options.minAmountYuan === null || options.maxAmountYuan === null)
    return {
      points: null,
      amount: null,
      problem: "在线充值暂未开放",
    };
  if (!/^\d+$/.test(raw))
    return {
      points: null,
      amount: null,
      problem: raw ? "请输入整数积分" : "请选择或填写充值积分",
    };
  const points = Number(raw),
    minimum = options.minAmountYuan * options.pointsPerYuan,
    maximum = options.maxAmountYuan * options.pointsPerYuan;
  if (!Number.isSafeInteger(points) || points < minimum || points > maximum)
    return {
      points: null,
      amount: null,
      problem: `充值积分须在 ${formatPoints(minimum)}–${formatPoints(maximum)} 之间`,
    };
  if (points % options.pointsPerYuan !== 0)
    return {
      points,
      amount: null,
      problem: `充值积分需为 ${formatPoints(options.pointsPerYuan)} 的整数倍`,
    };
  return {
    points,
    amount: points / options.pointsPerYuan,
    problem: null,
  };
}

export function amountDraftFromPoints(raw: string, pointsPerYuan: number) {
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) return raw;
  return String(Number(raw) / pointsPerYuan);
}

export function pointDraftFromAmount(raw: string, pointsPerYuan: number) {
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return raw;
  const points = Number(raw) * pointsPerYuan;
  return Number.isSafeInteger(points) ? String(points) : raw;
}
