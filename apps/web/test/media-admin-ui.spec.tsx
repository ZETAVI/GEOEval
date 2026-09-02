import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ApiRequestError,
  type MediaPlatformAdmin,
  type MediaSupplySource,
} from "@geoeval/api-client";
import {
  PlatformEditor,
  ResourceEditor,
  SourceEditor,
} from "../app/admin/media/media-editors.js";
import {
  filterAdminPlatforms,
  formatAuditValue,
  isApiStatus,
  isPlatformRevisionConflict,
  isSupportedUrlReference,
  parseNullableWholeNumber,
  parseNullableWholeYuanToFen,
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

  it("accepts whole-yuan cost input and converts it to stored fen", () => {
    expect(parseNullableWholeYuanToFen("")).toEqual({
      value: null,
    });
    expect(parseNullableWholeYuanToFen("0")).toEqual({
      value: 0,
    });
    expect(parseNullableWholeYuanToFen("125")).toEqual({ value: 12_500 });
    expect(parseNullableWholeYuanToFen("12.5").error).toBe("请输入整数");
  });

  it("matches the backend HTTPS or project-path reference boundary", () => {
    expect(isSupportedUrlReference("/media/logo.svg")).toBe(true);
    expect(isSupportedUrlReference("https://example.com/logo.svg")).toBe(true);
    expect(isSupportedUrlReference("http://example.com/logo.svg")).toBe(false);
  });

  it("presents operation-history fields and common values in business Chinese", () => {
    const value = formatAuditValue({
      status: "ACTIVE",
      procurementCostFen: 12_500,
      publicationMode: "FIRST_PUBLISH",
    });
    expect(value).toContain('"状态": "启用"');
    expect(value).toContain('"采购成本": "125 元"');
    expect(value).toContain('"发布方式": "首发"');
    expect(value).not.toContain("procurementCostFen");
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
    const source: MediaSupplySource = {
      id: "00000000-0000-4000-8000-000000000003",
      name: "验证来源",
      contactName: null,
      contactMethod: null,
      status: "ACTIVE",
      notes: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const platformMarkup = renderToStaticMarkup(
      <PlatformEditor
        apiBaseUrl="http://127.0.0.1:3300"
        onClose={() => undefined}
        onSaved={() => undefined}
      />,
    );
    const resourceMarkup = renderToStaticMarkup(
      <ResourceEditor
        apiBaseUrl="http://127.0.0.1:3300"
        platform={platforms[0]!}
        sources={[source]}
        onClose={() => undefined}
        onSaved={() => undefined}
      />,
    );
    const sourceMarkup = renderToStaticMarkup(
      <SourceEditor
        apiBaseUrl="http://127.0.0.1:3300"
        onClose={() => undefined}
        onSaved={() => undefined}
      />,
    );
    const platformEditMarkup = renderToStaticMarkup(
      <PlatformEditor
        apiBaseUrl="http://127.0.0.1:3300"
        platform={{ ...platforms[0]!, logoUrl: "/media/logo.svg" }}
        onClose={() => undefined}
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
    expect(sourceMarkup).toContain('<label class="wide">来源名称');
    expect(sourceMarkup).not.toContain("修改说明");
  });
});
