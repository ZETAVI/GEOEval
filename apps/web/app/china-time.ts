export const CHINA_TIME_ZONE = "Asia/Shanghai";

const defaultDateTimeOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

/** Product and operator timestamps are always presented in China Standard Time. */
export function formatChinaDateTime(
  value: string | number | Date,
  options?: Omit<Intl.DateTimeFormatOptions, "timeZone">,
): string {
  return new Intl.DateTimeFormat("zh-CN", {
    ...(options ?? defaultDateTimeOptions),
    timeZone: CHINA_TIME_ZONE,
  }).format(value instanceof Date ? value : new Date(value));
}
