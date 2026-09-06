import type {
  Brand,
  GeoOptimizationArticle,
  GeoOptimizationWorkspace,
} from "@geoeval/api-client";
import {
  writingBrandForm,
  type WritingBrandForm,
} from "./brand-writing-fields.js";

type BrandView = NonNullable<GeoOptimizationWorkspace["brand"]>;
type BrandBuffer = {
  id: string;
  revision: number;
  value: WritingBrandForm;
  saved: WritingBrandForm;
};
type ArticleBuffer = {
  id: string;
  revision: number;
  title: string;
  body: string;
  savedTitle: string;
  savedBody: string;
};
export type WorkspaceState = {
  workspace?: GeoOptimizationWorkspace;
  brand?: BrandBuffer;
  article?: ArticleBuffer;
  contextChanged: boolean;
};
export const initialWorkspaceState: WorkspaceState = { contextChanged: false };
export type WorkspaceAction =
  | { type: "observe"; workspace: GeoOptimizationWorkspace; discard?: boolean }
  | { type: "editBrand"; value: WritingBrandForm }
  | { type: "editArticle"; title?: string; body?: string }
  | { type: "brandSaved"; brand: Brand }
  | { type: "articleSaved"; article: GeoOptimizationArticle };

export function isBrandDirty(state: WorkspaceState): boolean {
  return Boolean(
    state.brand &&
    JSON.stringify(state.brand.value) !== JSON.stringify(state.brand.saved),
  );
}
export function isArticleDirty(state: WorkspaceState): boolean {
  const item = state.article;
  return Boolean(
    item && (item.title !== item.savedTitle || item.body !== item.savedBody),
  );
}

function brandBuffer(brand: BrandView): BrandBuffer {
  const value = writingBrandForm(brand);
  return { id: brand.id, revision: brand.revision, value, saved: value };
}
function articleBuffer(article: GeoOptimizationArticle): ArticleBuffer {
  return {
    id: article.id,
    revision: article.revision,
    title: article.title,
    body: article.bodyMarkdown,
    savedTitle: article.title,
    savedBody: article.bodyMarkdown,
  };
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  if (action.type === "editBrand") {
    return state.brand
      ? { ...state, brand: { ...state.brand, value: action.value } }
      : state;
  }
  if (action.type === "editArticle") {
    return state.article
      ? {
          ...state,
          article: {
            ...state.article,
            ...(action.title === undefined ? {} : { title: action.title }),
            ...(action.body === undefined ? {} : { body: action.body }),
          },
        }
      : state;
  }
  if (action.type === "brandSaved") {
    if (!state.workspace?.brand || state.workspace.brand.id !== action.brand.id)
      return state;
    const saved = action.brand;
    const brand: BrandView = {
      ...state.workspace.brand,
      companyName: saved.companyName,
      primaryIndustryId: saved.primaryIndustryId ?? null,
      secondaryIndustryId: saved.secondaryIndustryId ?? null,
      otherProductOrService: saved.otherProductOrService ?? null,
      flagshipProductOrService: saved.flagshipProductOrService ?? null,
      characteristics: saved.characteristics,
      articleInformation: saved.articleInformation,
      revision: saved.revision,
      primaryIndustryLabel: saved.primaryIndustryLabel ?? null,
      secondaryIndustryLabel: saved.secondaryIndustryLabel ?? null,
      storeLocation: saved.storeLocation ?? null,
      readyForEvaluation: saved.readyForEvaluation,
      missingFields: saved.missingFields,
      readyForArticleGeneration: saved.readyForArticleGeneration,
      articleInformationMissingFields: saved.articleInformationMissingFields,
    };
    return {
      ...state,
      brand: brandBuffer(brand),
      workspace: {
        ...state.workspace,
        brand:
          brand.revision >= state.workspace.brand.revision
            ? brand
            : state.workspace.brand,
      },
    };
  }
  if (action.type === "articleSaved") {
    if (
      !state.workspace ||
      action.article.brandId !== state.workspace.brand?.id
    )
      return state;
    const observed = state.workspace.article;
    return {
      ...state,
      article: articleBuffer(action.article),
      workspace: {
        ...state.workspace,
        article:
          observed && isNewerArticle(observed, action.article)
            ? observed
            : action.article,
      },
    };
  }

  const next = action.workspace;
  const switching =
    state.workspace && state.workspace.brand?.id !== next.brand?.id;
  if (
    switching &&
    !action.discard &&
    (isBrandDirty(state) || isArticleDirty(state))
  ) {
    return { ...state, contextChanged: true };
  }
  if (!state.workspace || switching || action.discard) {
    return {
      workspace: next,
      contextChanged: false,
      ...(next.brand ? { brand: brandBuffer(next.brand) } : {}),
      ...(next.article ? { article: articleBuffer(next.article) } : {}),
    };
  }
  const brand =
    next.brand &&
    state.workspace.brand &&
    next.brand.revision < state.workspace.brand.revision
      ? state.workspace.brand
      : next.brand;
  const article =
    next.article &&
    state.workspace.article &&
    isNewerArticle(state.workspace.article, next.article)
      ? state.workspace.article
      : (next.article ?? state.workspace.article);
  return {
    workspace: { ...next, brand, article },
    contextChanged: false,
    ...(brand
      ? { brand: isBrandDirty(state) ? state.brand! : brandBuffer(brand) }
      : {}),
    ...(article
      ? {
          article: isArticleDirty(state)
            ? state.article!
            : articleBuffer(article),
        }
      : {}),
  };
}

function isNewerArticle(
  current: GeoOptimizationArticle,
  incoming: GeoOptimizationArticle,
): boolean {
  return (
    current.revision > incoming.revision ||
    (current.revision === incoming.revision &&
      current.updatedAt > incoming.updatedAt)
  );
}
