import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  packageForm,
  packageMutation,
} from "../app/admin/publishing/workspace.js";
import { PublishingPackageCards } from "../app/publishing/workspace.js";

describe("publishing package customer and editor contract", () => {
  it("does not invent commercial configuration or a usable purchase button", () => {
    expect(packageForm()).toMatchObject({
      quantity: "",
      pointPrice: "",
      status: "INACTIVE",
      platformIds: [],
    });
    expect(
      renderToStaticMarkup(<PublishingPackageCards packages={[]} />),
    ).toContain("发布方案正在准备中");
    const html = renderToStaticMarkup(
      <PublishingPackageCards
        packages={[
          {
            id: "package",
            name: "区域发布",
            quantity: 3,
            pointPrice: 800,
            revision: 1,
            buyable: true,
            scope: [{ platformId: "p", displayName: "媒体甲" }],
          },
        ]}
      />,
    );
    expect(html).toContain("购买入口准备中");
    expect(html).toContain("disabled");
    expect(html).toContain("不指定单个平台或账号");
    expect(html).toContain("媒体甲");
  });
  it("keeps unavailable maintained offers truthful", () => {
    const html = renderToStaticMarkup(
      <PublishingPackageCards
        packages={[
          {
            id: "package",
            name: "区域发布",
            quantity: 3,
            pointPrice: 800,
            revision: 2,
            buyable: false,
            scope: [{ platformId: "p", displayName: "媒体甲" }],
          },
        ]}
      />,
    );
    expect(html).toContain("暂不可购买");
    expect(html).toContain("当前均不可购买");
  });
  it("requires explicit positive integer input without silently rounding", () => {
    const base = {
      ...packageForm(),
      name: "范围套餐",
      quantity: "3",
      pointPrice: "800",
      platformIds: ["p"],
    };
    expect(packageMutation(base)).toMatchObject({
      quantity: 3,
      pointPrice: 800,
    });
    for (const invalid of ["1.5", "-1", "1e3", "", "0", "2147483648"])
      expect(() => packageMutation({ ...base, pointPrice: invalid })).toThrow();
  });
});
