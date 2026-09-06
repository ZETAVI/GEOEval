import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { GeoOptimizationWorkspace } from "@geoeval/api-client";
import {
  BrandWritingFields,
  writingBrandForm,
  writingBrandMutation,
} from "../app/optimization/brand-writing-fields.js";
import {
  ArticlePanel,
  GenerationPanel,
} from "../app/optimization/workspace.js";

describe("GEO optimization customer workspace", () => {
  it("extends the current Brand with free-form writing information", () => {
    const workspace = readyWorkspace();
    const form = writingBrandForm(workspace.brand!);
    const markup = renderToStaticMarkup(
      <BrandWritingFields value={form} onChange={() => undefined} />,
    );

    expect(markup).toContain("精品手冲咖啡");
    expect(markup).toContain("安静办公");
    expect(markup).toContain("为什么值得客户选择");
    expect(markup).toContain("从客户视角");
    expect(markup).not.toContain("行业领先");
    expect(markup).not.toContain("每月");

    expect(
      writingBrandMutation({
        ...form,
        characteristics: [
          ...form.characteristics!,
          { title: " ", detail: " " },
        ],
        articleInformation: {
          ...form.articleInformation!,
          suitableAudienceContexts: ["安静办公", " "],
          desiredPositioning: ["本地代表", ""],
        },
      }),
    ).toMatchObject({
      characteristics: form.characteristics,
      articleInformation: {
        suitableAudienceContexts: ["安静办公"],
        desiredPositioning: ["本地代表"],
      },
    });
  });

  it("requires an explicit exact-revision replacement acknowledgement", () => {
    const workspace = readyWorkspace();
    const initial = renderToStaticMarkup(
      <GenerationPanel
        workspace={workspace}
        brandDirty={false}
        articleDirty={false}
        busy={false}
        replacementPending={false}
        onGenerate={() => undefined}
        onConfirmReplacement={() => undefined}
        onCancelReplacement={() => undefined}
        onRetry={() => undefined}
        onReload={() => undefined}
      />,
    );
    expect(initial).toContain("重新生成");
    expect(initial).not.toContain("确认替换并重新生成");

    const confirmation = renderToStaticMarkup(
      <GenerationPanel
        workspace={workspace}
        brandDirty={false}
        articleDirty={false}
        busy={false}
        replacementPending
        onGenerate={() => undefined}
        onConfirmReplacement={() => undefined}
        onCancelReplacement={() => undefined}
        onRetry={() => undefined}
        onReload={() => undefined}
      />,
    );
    expect(confirmation).toContain("重新生成会替换当前文章");
    expect(confirmation).toContain("第 3 版");
    expect(confirmation).toContain("确认替换并重新生成");
  });

  it("prevents confirmation while the local article buffer is dirty", () => {
    const markup = renderToStaticMarkup(
      <ArticlePanel
        workspace={readyWorkspace()}
        title="本地未保存标题"
        body="# 正文"
        dirty
        articleSaving={false}
        confirming={false}
        generationRunning={false}
        onTitleChange={() => undefined}
        onBodyChange={() => undefined}
        onSave={() => undefined}
        onConfirm={() => undefined}
      />,
    );
    expect(markup).toContain("有未保存的修改");
    expect(markup).toMatch(
      /<button[^>]*disabled=""[^>]*>确认第 3 版<\/button>/,
    );
    expect(markup).not.toContain("<script");
  });
});

function readyWorkspace(): GeoOptimizationWorkspace {
  return {
    brand: {
      id: "brand-1",
      companyName: "星河咖啡",
      primaryIndustryId: "IND-01",
      secondaryIndustryId: "IND-01-02",
      otherProductOrService: null,
      flagshipProductOrService: "精品手冲咖啡",
      characteristics: [
        { id: "feature-1", title: "安静办公", detail: "稳定网络和安静座位" },
        { id: "feature-2", title: "精品手冲", detail: null },
      ],
      articleInformation: {
        price: { mode: "RANGE", minimum: 28, maximum: 68 },
        suitableAudienceContexts: ["需要安静办公的顾客"],
        supplementalBackground: "专业咖啡师团队",
        desiredPositioning: ["本地精品咖啡代表"],
      },
      revision: 4,
      primaryIndustryLabel: "餐饮",
      secondaryIndustryLabel: "咖啡店",
      storeLocation: null,
      readyForEvaluation: true,
      missingFields: [],
      readyForArticleGeneration: true,
      articleInformationMissingFields: [],
    },
    guidance: {
      guidanceId: "guidance-1",
      acceptedAt: "2026-09-06T10:00:00.000Z",
      brandInformationChanged: false,
      customerDirections: [],
    },
    latestGeneration: null,
    article: {
      id: "article-1",
      brandId: "brand-1",
      title: "星河咖啡指南",
      bodyMarkdown: "# 正文",
      status: "DRAFT",
      revision: 3,
      confirmedRevision: null,
      confirmedAt: null,
      createdAt: "2026-09-06T10:00:00.000Z",
      updatedAt: "2026-09-06T10:00:00.000Z",
    },
    articleFreshness: {
      brandInformationChanged: false,
      guidanceChanged: false,
    },
  };
}
