export function formatPoints(value: number): string {
  if (!Number.isFinite(value)) return "⚡—";
  const sign = value < 0 ? "-" : "";
  return `${sign}⚡${Math.abs(value).toLocaleString("zh-CN")}`;
}

export function formatSignedPoints(value: number): string {
  return `${value > 0 ? "+" : ""}${formatPoints(value)}`;
}
