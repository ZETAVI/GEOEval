import {
  ApiRequestError,
  type MediaListingMutation,
  type MediaPlatformAdmin,
} from "@geoeval/api-client";

export const mediaCategoryOptions = [
  ["CENTRAL_MEDIA", "中央媒体"],
  ["PORTAL_MEDIA", "门户媒体"],
  ["LOCAL_MEDIA", "地方媒体"],
  ["VERTICAL_MEDIA", "垂直媒体"],
  ["CONTENT_PLATFORM", "内容平台"],
  ["OVERSEAS_MEDIA", "海外媒体"],
] as const;

export const categoryLabels = Object.fromEntries(
  mediaCategoryOptions,
) as Record<MediaPlatformAdmin["categories"][number], string>;

export const listingStatusLabels = {
  DRAFT: "草稿",
  ON_SHELF: "已上架",
  PAUSED: "已暂停",
  OFF_SHELF: "已下架",
} as const;

export const platformStatusLabels = {
  ACTIVE: "使用中",
  ARCHIVED: "已归档",
} as const;

export const resourceStatusLabels = {
  ACTIVE: "可用",
  PAUSED: "已暂停",
  ARCHIVED: "已归档",
} as const;

export const sourceStatusLabels = {
  ACTIVE: "有效",
  INACTIVE: "已停用",
} as const;

export const publicationModeLabels = {
  FIRST_PUBLISH: "首发",
  REPOST: "转载",
} as const;

export const visibilityLabels = {
  HIDDEN: "客户隐藏",
  FULL: "完整展示",
  MASKED: "脱敏展示",
} as const;

export const qualityLabels = {
  HIGH: "优先",
  MEDIUM: "常规",
  LOW: "补充",
} as const;

export type PlatformStatusFilter =
  | "ALL"
  | MediaPlatformAdmin["status"]
  | NonNullable<MediaPlatformAdmin["listing"]>["status"]
  | "NO_LISTING";

export function filterAdminPlatforms(
  platforms: MediaPlatformAdmin[],
  filters: {
    search: string;
    category: "ALL" | MediaPlatformAdmin["categories"][number];
    status: PlatformStatusFilter;
  },
): MediaPlatformAdmin[] {
  const term = filters.search.trim().toLocaleLowerCase("zh-CN");
  return platforms.filter((platform) => {
    const matchesSearch =
      !term ||
      [platform.displayName, platform.normalizedName, ...platform.aliases]
        .join(" ")
        .toLocaleLowerCase("zh-CN")
        .includes(term);
    const matchesCategory =
      filters.category === "ALL" ||
      platform.categories.includes(filters.category);
    const matchesStatus =
      filters.status === "ALL" ||
      (filters.status === "NO_LISTING"
        ? platform.listing === null || platform.listing === undefined
        : platform.status === filters.status ||
          platform.listing?.status === filters.status);
    return matchesSearch && matchesCategory && matchesStatus;
  });
}

export function isSupportedUrlReference(value: string): boolean {
  const normalized = value.trim();
  return (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.startsWith("https://")
  );
}

export function parseNullableWholeNumber(
  value: string,
  options: { allowZero: boolean },
): { value: number | null; error?: string } {
  const normalized = value.trim();
  if (!normalized) return { value: null };
  if (!/^\d+$/.test(normalized)) {
    return { value: null, error: "请输入整数" };
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed > 2_147_483_647) {
    return { value: null, error: "数值超出可保存范围" };
  }
  if (options.allowZero ? parsed < 0 : parsed <= 0) {
    return {
      value: null,
      error: options.allowZero ? "不能小于 0" : "必须大于 0",
    };
  }
  return { value: parsed };
}

export function buildListingMutation(input: {
  status: MediaListingMutation["status"];
  pointPriceInput: string;
  reason: string;
  currentRevision?: number;
}): { value?: MediaListingMutation; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const price = parseNullableWholeNumber(input.pointPriceInput, {
    allowZero: false,
  });
  if (price.error) errors.pointPrice = price.error;
  if (input.status === "ON_SHELF" && price.value === null) {
    errors.pointPrice = "上架前必须设置有效积分价";
  }
  if (!input.reason.trim()) errors.reason = "请填写本次调整原因";
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      status: input.status,
      pointPrice: price.value,
      reason: input.reason.trim(),
      ...(input.currentRevision === undefined
        ? {}
        : { expectedRevision: input.currentRevision }),
    },
  };
}

export function allowedListingStatuses(
  current: MediaPlatformAdmin["listing"],
): MediaListingMutation["status"][] {
  if (!current) return ["DRAFT", "ON_SHELF", "OFF_SHELF"];
  const allowed: Record<
    MediaListingMutation["status"],
    MediaListingMutation["status"][]
  > = {
    DRAFT: ["DRAFT", "ON_SHELF", "OFF_SHELF"],
    ON_SHELF: ["ON_SHELF", "PAUSED", "OFF_SHELF"],
    PAUSED: ["PAUSED", "ON_SHELF", "OFF_SHELF"],
    OFF_SHELF: ["OFF_SHELF", "ON_SHELF"],
  };
  return allowed[current.status];
}

export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiRequestError && error.status === status;
}

export function isListingRevisionConflict(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.status === 409 &&
    /已经变化|刷新后重试/.test(error.message)
  );
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "无";
  return JSON.stringify(value, null, 2);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
