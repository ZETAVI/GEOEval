import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ApiRequestError,
  type MediaPlatformAdmin,
  type MediaSupplier,
} from "@geoeval/api-client";
import {
  DeleteConfirmDialog,
  PlatformEditor,
  ResourceEditor,
  SupplierEditor,
} from "../app/admin/media/media-editors.js";
import {
  filterAdminPlatforms,
  formatAuditValue,
  groupAdminPlatformsByStatus,
  isApiStatus,
  isPlatformRevisionConflict,
  isSupportedUrlReference,
  parseNullableWholeNumber,
  parsePlatformPointPrice,
} from "../app/admin/media/media-ui.js";

const platforms: MediaPlatformAdmin[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    normalizedName: "人民网",
    displayName: "人民网",
    aliases: ["people.cn"],
    description: "中央重点新闻网站",
    logoUrl: null,
    regionScope: "DOMESTIC",
    status: "ACTIVE",
    pointPrice: 500,
    categories: ["CENTRAL_MEDIA", "PORTAL_MEDIA"],
    revision: 3,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    normalizedName: "百家号",
    displayName: "百家号",
    aliases: [],
    description: null,
    logoUrl: null,
    regionScope: "DOMESTIC",
    status: "INACTIVE",
    pointPrice: null,
    categories: ["CONTENT_PLATFORM"],
    revision: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
];

describe("Media Supply administrator UI behavior", () => {
  it("filters one platform identity without duplicating category membership", () => {
    expect(
      filterAdminPlatforms(platforms, {
        search: "people",
        category: "PORTAL_MEDIA",
        status: "ACTIVE",
      }).map((platform) => platform.displayName),
    ).toEqual(["人民网"]);
    expect(
      filterAdminPlatforms(platforms, {
        search: "",
        category: "ALL",
        status: "INACTIVE",
      }).map((platform) => platform.displayName),
    ).toEqual(["百家号"]);
  });

  it("groups filtered platforms once by their operational state", () => {
    const groups = groupAdminPlatformsByStatus(platforms);
    expect(
      groups.map((group) => [group.status, group.platforms.length]),
    ).toEqual([
      ["ACTIVE", 1],
      ["INACTIVE", 1],
    ]);
    expect(
      groups.flatMap((group) => group.platforms.map((platform) => platform.id)),
    ).toEqual(platforms.map((platform) => platform.id));
  });

  it("requires a positive whole point price only when the platform is enabled", () => {
    expect(parsePlatformPointPrice("ACTIVE", "").error).toBe(
      "启用前必须设置有效积分价",
    );
    expect(parsePlatformPointPrice("INACTIVE", "")).toEqual({ value: null });
    expect(parsePlatformPointPrice("ACTIVE", "500")).toEqual({ value: 500 });
    expect(parseNullableWholeNumber("12.5", { allowZero: false }).error).toBe(
      "请输入整数",
    );
  });

  it("accepts and stores whole-yuan cost input without unit conversion", () => {
    expect(parseNullableWholeNumber("", { allowZero: true })).toEqual({
      value: null,
    });
    expect(parseNullableWholeNumber("0", { allowZero: true })).toEqual({
      value: 0,
    });
    expect(parseNullableWholeNumber("125", { allowZero: true })).toEqual({
      value: 125,
    });
    expect(parseNullableWholeNumber("12.5", { allowZero: true }).error).toBe(
      "请输入整数",
    );
  });

  it("matches the backend HTTPS or project-path reference boundary", () => {
    expect(isSupportedUrlReference("/media/logo.svg")).toBe(true);
    expect(isSupportedUrlReference("https://example.com/logo.svg")).toBe(true);
    expect(isSupportedUrlReference("http://example.com/logo.svg")).toBe(false);
  });

  it("presents operation-history fields and common values in business Chinese", () => {
    const value = formatAuditValue({
      status: "ACTIVE",
      effectiveStatus: "RESOURCE_INACTIVE",
      procurementCostYuan: 125,
      publicationMode: "FIRST_PUBLISH",
    });
    expect(value).toContain('"状态": "启用"');
    expect(value).toContain('"当前状态": "停用"');
    expect(value).not.toContain("effectiveStatus");
    expect(value).not.toContain("手动停用");
    expect(value).toContain('"采购成本（元）": "125 元"');
    expect(value).toContain('"发布方式": "首发"');
    expect(value).not.toContain("procurementCostYuan");
  });

  it("classifies stale revision conflicts without treating other failures alike", () => {
    expect(
      isPlatformRevisionConflict(
        new ApiRequestError("平台资料已经变化，请刷新后重试", 409),
      ),
    ).toBe(true);
    expect(
      isPlatformRevisionConflict(
        new ApiRequestError("启用前必须设置价格", 409),
      ),
    ).toBe(false);
    expect(isApiStatus(new ApiRequestError("数据已变化", 409), 409)).toBe(true);
    expect(isApiStatus(new ApiRequestError("服务暂不可用", 503), 409)).toBe(
      false,
    );
  });

  it("renders the confirmed platform and resource defaults", () => {
    const supplier: MediaSupplier = {
      id: "00000000-0000-4000-8000-000000000003",
      normalizedName: "验证供应商",
      displayName: "验证供应商",
      contactName: null,
      contactMethod: null,
      status: "ACTIVE",
      notes: null,
      revision: 1,
      resourceCount: 0,
      platformCount: 0,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const platformMarkup = renderToStaticMarkup(
      <PlatformEditor
        apiBaseUrl="http://127.0.0.1:3300"
        onClose={() => undefined}
        onAccessFailure={() => false}
        onSaved={() => undefined}
      />,
    );
    const resourceMarkup = renderToStaticMarkup(
      <ResourceEditor
        apiBaseUrl="http://127.0.0.1:3300"
        platform={platforms[0]!}
        suppliers={[supplier]}
        onClose={() => undefined}
        onAccessFailure={() => false}
        onSaved={() => undefined}
      />,
    );
    const supplierMarkup = renderToStaticMarkup(
      <SupplierEditor
        apiBaseUrl="http://127.0.0.1:3300"
        onClose={() => undefined}
        onAccessFailure={() => false}
        onSaved={() => undefined}
      />,
    );
    const platformEditMarkup = renderToStaticMarkup(
      <PlatformEditor
        apiBaseUrl="http://127.0.0.1:3300"
        platform={{ ...platforms[0]!, logoUrl: "/media/logo.svg" }}
        onClose={() => undefined}
        onAccessFailure={() => false}
        onSaved={() => undefined}
      />,
    );

    expect(platformMarkup).toContain('<option value="DOMESTIC" selected="">');
    expect(platformMarkup).not.toContain("Listing");
    expect(platformMarkup).not.toContain("revision");
    expect(platformMarkup).toContain('<option value="INACTIVE" selected="">');
    expect(platformMarkup).toContain("单次积分价");
    expect(platformMarkup).not.toContain("资料状态");
    expect(platformMarkup).not.toContain("销售状态");
    expect(platformMarkup).toContain("平台图标地址");
    expect(platformMarkup).not.toContain("修改说明");
    expect(platformEditMarkup).toContain('src="/media/logo.svg"');
    expect(platformEditMarkup).toContain("修改说明");
    expect(resourceMarkup).toContain(
      '<option value="FIRST_PUBLISH" selected="">',
    );
    expect(resourceMarkup).toContain('<option value="HIDDEN" selected="">');
    expect(resourceMarkup).toContain('<option value="MEDIUM" selected="">');
    expect(resourceMarkup).toContain("采购成本（元）");
    expect(resourceMarkup).not.toContain("变更原因");
    expect(supplierMarkup).toContain(
      '<label class="wide"><span class="field-heading"><span>供应商名称</span>',
    );
    expect(supplierMarkup).not.toContain("修改说明");
  });

  it("renders one styled deletion confirmation with optional supplier cleanup", () => {
    const markup = renderToStaticMarkup(
      <DeleteConfirmDialog
        kindLabel="资源"
        name="样例资源"
        cleanupSupplierName="样例供应商"
        busy={false}
        error=""
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    );
    expect(markup).toContain("删除后无法恢复");
    expect(markup).toContain("同时删除无引用供应商");
    expect(markup).toContain("删除原因");
    expect(markup).toContain("确认删除资源");
    expect(markup).not.toContain("window.confirm");
  });
});
