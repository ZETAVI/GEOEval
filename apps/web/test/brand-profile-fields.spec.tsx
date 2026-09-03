import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrandProfileFields } from "../app/brands/brand-profile-fields.js";

describe("shared Brand v3 fields", () => {
  it("renders one store-search path, flagship, and peer characteristics", () => {
    const markup = renderToStaticMarkup(
      <div className="form-grid">
        <BrandProfileFields
          apiBaseUrl="http://127.0.0.1:3300"
          value={{ characteristics: ["安静办公", "精品手冲"] }}
          onChange={() => undefined}
        />
      </div>,
    );

    expect(markup).toContain("具体门店");
    expect(markup).toContain("主打产品或服务");
    expect(markup).toContain("展示顺序不代表优先级");
    expect(markup).not.toContain("省级地区");
    expect(markup).not.toContain("终端地区");
  });

  it("keeps device geolocation and server credentials out of the map client", () => {
    const source = readFileSync(
      new URL("../app/brands/store-location-picker.tsx", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("navigator.geolocation");
    expect(source).not.toContain("AMAP_WEB_SERVICE_KEY");
    expect(source).not.toContain("AMAP_JS_SECURITY_CODE");
    expect(source).not.toContain("securityJsCode");
    expect(source).toContain("NEXT_PUBLIC_AMAP_JS_KEY");
    expect(source).toContain("/_AMapService");
  });
});
