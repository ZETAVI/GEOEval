import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EntryFlow } from "../app/enter/entry-flow.js";
import PrivacyPage from "../app/privacy/page.js";

describe("public authentication entry", () => {
  it("links the security notice before a visitor requests a code", () => {
    const html = renderToStaticMarkup(<EntryFlow />);

    expect(html).toContain('href="/privacy"');
    expect(html).toContain("个人信息与安全验证说明");
    expect(html).toContain("获取验证码");
  });

  it("publishes the processor, provider, retention and rights boundary", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);

    expect(html).toContain("互动派科技股份有限公司");
    expect(html).toContain("marketing@hudongpai.com");
    expect(html).toContain("阿里云验证码 2.0");
    expect(html).toContain("不复制或保存阿里云侧的原始设备指纹");
    expect(html).toContain("24");
    expect(html).toContain("30");
    expect(html).toContain("查询、更正、账号停用、依法删除");
  });
});
