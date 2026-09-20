import { describe, expect, it } from "vitest";
import { CHINA_TIME_ZONE, formatChinaDateTime } from "../app/china-time.js";

describe("China Standard Time presentation", () => {
  it("formats the same instant in Asia/Shanghai regardless of host timezone", () => {
    expect(CHINA_TIME_ZONE).toBe("Asia/Shanghai");
    expect(formatChinaDateTime("2026-09-20T15:34:13.000Z")).toContain(
      "23:34:13",
    );
  });

  it("keeps compact caller fields while fixing the timezone", () => {
    const value = formatChinaDateTime("2026-09-20T15:34:13.000Z", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    expect(value).toContain("23:34");
    expect(value).not.toContain("15:34");
  });
});
