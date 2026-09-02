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
} from "../app/admin/media/media-editors.js";
import {
  allowedListingStatuses,
  buildListingMutation,
  filterAdminPlatforms,
  isApiStatus,
  isListingRevisionConflict,
  isSupportedUrlReference,
  parseNullableWholeNumber,
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
    categories: ["CENTRAL_MEDIA", "PORTAL_MEDIA"],
    listing: {
      status: "ON_SHELF",
      pointPrice: 500,
      revision: 3,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
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
    status: "ARCHIVED",
    categories: ["CONTENT_PLATFORM"],
    listing: null,
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
        status: "ON_SHELF",
      }).map((platform) => platform.displayName),
    ).toEqual(["人民网"]);
    expect(
      filterAdminPlatforms(platforms, {
        search: "",
        category: "ALL",
        status: "NO_LISTING",
      }).map((platform) => platform.displayName),
    ).toEqual(["百家号"]);
  });

  it("includes the displayed Listing revision in every existing update", () => {
    expect(
      buildListingMutation({
        status: "PAUSED",
        pointPriceInput: "500",
        reason: "临时维护",
        currentRevision: 3,
      }),
    ).toEqual({
      errors: {},
      value: {
        status: "PAUSED",
        pointPrice: 500,
        reason: "临时维护",
        expectedRevision: 3,
      },
    });
  });

  it("does not offer a return to Draft after a Listing has left Draft", () => {
    expect(allowedListingStatuses(platforms[0]!.listing)).toEqual([
      "ON_SHELF",
      "PAUSED",
      "OFF_SHELF",
    ]);
  });

  it("rejects an on-shelf Listing without a positive whole point price", () => {
    expect(
      buildListingMutation({
        status: "ON_SHELF",
        pointPriceInput: "",
        reason: "首次上架",
      }).errors.pointPrice,
    ).toBe("上架前必须设置有效积分价");
    expect(parseNullableWholeNumber("12.5", { allowZero: false }).error).toBe(
      "请输入整数",
    );
  });

  it("keeps RMB-fen cost nullable and allows an explicit zero", () => {
    expect(parseNullableWholeNumber("", { allowZero: true })).toEqual({
      value: null,
    });
    expect(parseNullableWholeNumber("0", { allowZero: true })).toEqual({
      value: 0,
    });
  });

  it("matches the backend HTTPS or project-path reference boundary", () => {
    expect(isSupportedUrlReference("/media/logo.svg")).toBe(true);
    expect(isSupportedUrlReference("https://example.com/logo.svg")).toBe(true);
    expect(isSupportedUrlReference("http://example.com/logo.svg")).toBe(false);
  });

  it("classifies stale revision conflicts without treating other failures alike", () => {
    expect(
      isListingRevisionConflict(
        new ApiRequestError("销售配置已经变化，请刷新后重试", 409),
      ),
    ).toBe(true);
    expect(
      isListingRevisionConflict(new ApiRequestError("归档平台不能上架", 409)),
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

    expect(platformMarkup).toContain('<option value="DOMESTIC" selected="">');
    expect(platformMarkup).toContain('<option value="ACTIVE" selected="">');
    expect(resourceMarkup).toContain(
      '<option value="FIRST_PUBLISH" selected="">',
    );
    expect(resourceMarkup).toContain('<option value="HIDDEN" selected="">');
    expect(resourceMarkup).toContain('<option value="MEDIUM" selected="">');
  });
});
