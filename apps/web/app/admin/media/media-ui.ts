import { ApiRequestError, type MediaPlatformAdmin } from "@geoeval/api-client";

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

export const platformStatusLabels = {
  ACTIVE: "启用",
  INACTIVE: "停用",
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
  HIDDEN: "不向客户展示",
  FULL: "展示完整名称",
  MASKED: "展示替代名称",
} as const;

export const qualityLabels = {
  HIGH: "优先",
  MEDIUM: "常规",
  LOW: "补充",
} as const;

export type PlatformStatusFilter = "ALL" | MediaPlatformAdmin["status"];

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
      filters.status === "ALL" || platform.status === filters.status;
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

export function parsePlatformPointPrice(
  status: MediaPlatformAdmin["status"],
  value: string,
): { value: number | null; error?: string } {
  const price = parseNullableWholeNumber(value, { allowZero: false });
  if (price.error) return price;
  if (status === "ACTIVE" && price.value === null) {
    return { value: null, error: "启用前必须设置有效积分价" };
  }
  return price;
}

export function parseNullableWholeYuanToFen(value: string): {
  value: number | null;
  error?: string;
} {
  const yuan = parseNullableWholeNumber(value, { allowZero: true });
  if (yuan.error || yuan.value === null) return yuan;
  if (yuan.value > Math.floor(2_147_483_647 / 100)) {
    return { value: null, error: "金额超出可保存范围" };
  }
  return { value: yuan.value * 100 };
}

export function formatFenAsYuan(value: number): string {
  const yuan = value / 100;
  return Number.isInteger(yuan)
    ? yuan.toLocaleString("zh-CN")
    : yuan.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiRequestError && error.status === status;
}

export function isPlatformRevisionConflict(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.status === 409 &&
    /已经变化|刷新后重试/.test(error.message)
  );
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "无";
  const keyLabels: Record<string, string> = {
    id: "记录编号",
    platformId: "平台编号",
    supplySourceId: "合作来源编号",
    source: "合作来源",
    normalizedName: "标准名称",
    displayName: "平台名称",
    aliases: "别名",
    description: "平台简介",
    logoUrl: "平台图标地址",
    regionScope: "覆盖地区",
    status: "状态",
    categories: "媒体分类",
    pointPrice: "单次积分价",
    revision: "数据版本",
    name: "名称",
    contactName: "联系人",
    contactMethod: "联系方式",
    notes: "备注",
    resourceName: "资源名称",
    accountIdentifier: "账号名称或编号",
    accountUrl: "账号链接",
    publicationMode: "发布方式",
    publicVisibility: "客户展示方式",
    publicAlias: "客户展示名称",
    qualityTier: "资源优先级",
    procurementCostFen: "采购成本",
    caseUrl: "参考案例链接",
    publicationNotes: "发布说明",
    createdAt: "创建时间",
    updatedAt: "更新时间",
  };
  const valueLabels: Record<string, string> = {
    ...categoryLabels,
    ...platformStatusLabels,
    ...resourceStatusLabels,
    ...sourceStatusLabels,
    ...publicationModeLabels,
    ...visibilityLabels,
    ...qualityLabels,
    ACTIVE: "启用",
    ARCHIVED: "已归档",
    PAUSED: "暂停",
    INACTIVE: "已停用",
    DOMESTIC: "国内",
    OVERSEAS: "海外",
  };
  function localize(current: unknown, parentKey?: string): unknown {
    if (parentKey === "procurementCostFen" && typeof current === "number") {
      return `${formatFenAsYuan(current)} 元`;
    }
    if (Array.isArray(current))
      return current.map((item) => localize(item, parentKey));
    if (typeof current === "string") return valueLabels[current] ?? current;
    if (current && typeof current === "object") {
      return Object.fromEntries(
        Object.entries(current).map(([key, item]) => [
          keyLabels[key] ?? key,
          localize(item, key),
        ]),
      );
    }
    return current;
  }
  return JSON.stringify(localize(value), null, 2);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
