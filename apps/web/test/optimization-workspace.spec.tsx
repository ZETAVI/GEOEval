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
import {
  workspaceReducer,
  initialWorkspaceState,
  isBrandDirty,
  isArticleDirty,
} from "../app/optimization/workspace-state.js";

describe("GEO optimization customer workspace", () => {
  it("preserves both dirty buffers and their exact base revisions while observing newer server content", () => {
    const original = readyWorkspace();
    let state = workspaceReducer(initialWorkspaceState, {
      type: "observe",
      workspace: original,
    });
    state = workspaceReducer(state, {
      type: "editBrand",
      value: { ...state.brand!.value, companyName: "本地尚未保存品牌" },
    });
    state = workspaceReducer(state, {
      type: "editArticle",
      title: "本地尚未保存文章",
    });
    const observed = {
      ...original,
      brand: { ...original.brand!, revision: 5, companyName: "他处保存品牌" },
      article: { ...original.article!, revision: 4, title: "他处保存文章" },
    };
    state = workspaceReducer(state, { type: "observe", workspace: observed });
    expect(state.brand).toMatchObject({
      revision: 4,
      value: { companyName: "本地尚未保存品牌" },
    });
    expect(state.article).toMatchObject({
      revision: 3,
      title: "本地尚未保存文章",
    });
    expect(state.workspace!.brand!.revision).toBe(5);
    expect(isBrandDirty(state)).toBe(true);
    expect(isArticleDirty(state)).toBe(true);
  });

  it("applies article mutations without rebasing a dirty Brand and ignores older server reads", () => {
    const original = readyWorkspace();
    let state = workspaceReducer(initialWorkspaceState, {
      type: "observe",
      workspace: original,
    });
    state = workspaceReducer(state, {
      type: "editBrand",
      value: { ...state.brand!.value, companyName: "未保存" },
    });
    const saved = { ...original.article!, revision: 4, title: "已保存第4版" };
    state = workspaceReducer(state, { type: "articleSaved", article: saved });
    state = workspaceReducer(state, { type: "observe", workspace: original });
    expect(state.article).toMatchObject({ revision: 4, title: saved.title });
    expect(state.brand!.value.companyName).toBe("未保存");
    expect(state.brand!.revision).toBe(4);
  });

  it("saving a Brand never overwrites an unsaved article", () => {
    const original = readyWorkspace();
    let state = workspaceReducer(initialWorkspaceState, {
      type: "observe",
      workspace: original,
    });
    state = workspaceReducer(state, {
      type: "editArticle",
      body: "用户未保存正文",
    });
    const savedBrand = {
      ...original.brand!,
      revision: 5,
      status: "ACTIVE" as const,
      isCurrent: true,
      createdAt: "2026-09-06T10:00:00.000Z",
      updatedAt: "2026-09-06T11:00:00.000Z",
    };
    state = workspaceReducer(state, { type: "brandSaved", brand: savedBrand });
    state = workspaceReducer(state, {
      type: "observe",
      workspace: { ...original, brand: savedBrand },
    });
    expect(state.article).toMatchObject({
      body: "用户未保存正文",
      revision: 3,
    });
    expect(isArticleDirty(state)).toBe(true);
  });

  it("does not transplant dirty content when the current Brand changes", () => {
    const original = readyWorkspace();
    let state = workspaceReducer(initialWorkspaceState, {
      type: "observe",
      workspace: original,
    });
    state = workspaceReducer(state, {
      type: "editArticle",
      title: "当前品牌的未保存文章",
    });
    const switched = {
      ...original,
      brand: { ...original.brand!, id: "brand-2" },
      article: null,
    };
    state = workspaceReducer(state, { type: "observe", workspace: switched });
    expect(state.contextChanged).toBe(true);
    expect(state.workspace!.brand!.id).toBe("brand-1");
    expect(state.article!.title).toBe("当前品牌的未保存文章");
    state = workspaceReducer(state, {
      type: "observe",
      workspace: switched,
      discard: true,
    });
    expect(state.workspace!.brand!.id).toBe("brand-2");
    expect(state.article).toBeUndefined();
  });
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

  it("links a confirmed article to saved publishing choices without claiming an active purchase", () => {
    const workspace = readyWorkspace();
    workspace.article = {
      ...workspace.article!,
      status: "CONFIRMED",
      confirmedRevision: 3,
    };
    const markup = renderToStaticMarkup(
      <ArticlePanel
        workspace={workspace}
        title={workspace.article.title}
        body={workspace.article.bodyMarkdown}
        dirty={false}
        articleSaving={false}
        confirming={false}
        generationRunning={false}
        onTitleChange={() => undefined}
        onBodyChange={() => undefined}
        onSave={() => undefined}
        onConfirm={() => undefined}
      />,
    );
    expect(markup).toContain('href="/publishing"');
    expect(markup).toContain("选择发布方案");
    expect(markup).toContain("提交购买仍在后续接入");
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
