"use client";

import {
  ApiRequestError,
  confirmCoreArticle,
  generateCoreArticle,
  getGeoOptimizationWorkspace,
  retryCoreArticleGeneration,
  saveCoreArticle,
  updateBrand,
  selectCurrentBrand,
  listBrands,
  type Brand,
  type GenerateCoreArticle,
  type GeoOptimizationWorkspace as WorkspaceView,
} from "@geoeval/api-client";
import { useEffect, useReducer, useRef, useState } from "react";

import { CustomerSidebar } from "../customer-sidebar.js";
import { SafeMarkdown } from "../diagnosis/safe-markdown.js";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../session-access.js";
import {
  BrandWritingFields,
  writingBrandMutation,
} from "./brand-writing-fields.js";
import {
  initialWorkspaceState,
  workspaceReducer,
  isBrandDirty,
  isArticleDirty,
} from "./workspace-state.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function OptimizationWorkspace() {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const { workspace } = state;
  const brandForm = state.brand?.value;
  const articleTitle = state.article?.title ?? "";
  const articleBody = state.article?.body ?? "";
  const [brandSaving, setBrandSaving] = useState(false);
  const [generationBusy, setGenerationBusy] = useState(false);
  const [articleSaving, setArticleSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [replacement, setReplacement] = useState<{
    id: string;
    revision: number;
  }>();
  const [message, setMessage] = useState("");
  const [reloadRecommended, setReloadRecommended] = useState(false);
  const generationInFlightRef = useRef(false);
  const observationSequence = useRef(0);
  const pendingGeneration = useRef<
    { brandId: string; command: GenerateCoreArticle } | undefined
  >(undefined);
  const [generationUncertain, setGenerationUncertain] = useState(false);
  const [reportBrand, setReportBrand] = useState<Brand>();
  const [reportBrandUnavailable, setReportBrandUnavailable] = useState(false);
  const [switchingBrand, setSwitchingBrand] = useState(false);

  const brandDirty = isBrandDirty(state);
  const articleDirty = isArticleDirty(state);
  const brandConflict = state.brand?.revision !== workspace?.brand?.revision;
  const articleConflict =
    state.article?.revision !== workspace?.article?.revision;

  async function refresh(discard = false) {
    const sequence = ++observationSequence.current;
    const next = await getGeoOptimizationWorkspace(apiBaseUrl);
    if (sequence === observationSequence.current)
      dispatch({ type: "observe", workspace: next, discard });
    return next;
  }

  async function reloadLatest() {
    if (
      (brandDirty || articleDirty) &&
      !window.confirm("重新加载会放弃此页尚未保存的修改。是否继续？")
    )
      return;
    try {
      await refresh(true);
      setReloadRecommended(false);
      setReplacement(undefined);
    } catch (error) {
      handleFailure(error, "暂时无法重新加载");
    }
  }

  async function bootstrap() {
    setSession({ kind: "loading" });
    const access = await loadRoleSession(apiBaseUrl, "TERMINAL_CUSTOMER");
    if (access.kind !== "ready") {
      setSession(
        access.kind === "error"
          ? { kind: "error", message: customerErrorMessage(access.message) }
          : access,
      );
      return;
    }
    try {
      const next = await refresh();
      const requestedBrandId = new URLSearchParams(window.location.search).get(
        "brandId",
      );
      if (requestedBrandId && requestedBrandId !== next.brand?.id) {
        const requested = (await listBrands(apiBaseUrl)).find(
          (brand) => brand.id === requestedBrandId,
        );
        setReportBrand(requested);
        setReportBrandUnavailable(!requested);
      }
      setSession(access);
    } catch (error) {
      setSession(
        sessionFailureState(error) ?? {
          kind: "error",
          message: customerErrorMessage(error),
        },
      );
    }
  }

  function handleFailure(error: unknown, fallback: string) {
    const failure = sessionFailureState(error);
    if (failure) {
      setSession(failure);
      return;
    }
    setReloadRecommended(
      error instanceof ApiRequestError && error.status === 409,
    );
    setMessage(error instanceof Error ? error.message : fallback);
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!generationBusy && workspace?.latestGeneration?.status !== "RUNNING")
      return;
    let active = true;
    let reading = false;
    const timer = window.setInterval(() => {
      if (!active || reading) return;
      reading = true;
      void refresh()
        .catch(
          (error) => active && handleFailure(error, "暂时无法读取生成进度"),
        )
        .finally(() => {
          reading = false;
        });
    }, 3_000);
    return () => {
      active = false;
      window.clearInterval(timer);
      ++observationSequence.current;
    };
  }, [generationBusy, workspace?.latestGeneration?.status]);

  useEffect(() => {
    if (!brandDirty && !articleDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [brandDirty, articleDirty]);

  async function switchToReportBrand() {
    if (!reportBrand || switchingBrand) return;
    setSwitchingBrand(true);
    try {
      await selectCurrentBrand(apiBaseUrl, reportBrand.id);
      await refresh(true);
      setReportBrand(undefined);
    } catch (error) {
      handleFailure(error, "品牌切换失败");
    } finally {
      setSwitchingBrand(false);
    }
  }

  async function saveBrandInformation() {
    if (!workspace?.brand || !state.brand || !brandForm || brandSaving) return;
    setBrandSaving(true);
    setMessage("");
    setReloadRecommended(false);
    try {
      const saved = await updateBrand(apiBaseUrl, workspace.brand.id, {
        ...writingBrandMutation(brandForm),
        expectedRevision: state.brand.revision,
      });
      ++observationSequence.current;
      dispatch({ type: "brandSaved", brand: saved });
      await refresh();
      setReplacement(undefined);
      setMessage(
        generationInFlightRef.current ||
          workspace.latestGeneration?.status === "RUNNING"
          ? "优化资料已保存；当前生成仍使用保存前的资料"
          : "优化资料已保存",
      );
    } catch (error) {
      handleFailure(error, "优化资料保存失败");
    } finally {
      setBrandSaving(false);
    }
  }

  async function startGeneration(forceReplacement = false) {
    if (
      !workspace?.brand ||
      generationInFlightRef.current ||
      generationUncertain ||
      brandDirty ||
      articleDirty ||
      brandSaving ||
      articleSaving ||
      confirming ||
      state.contextChanged
    )
      return;
    if (workspace.article && !forceReplacement) {
      setReplacement({
        id: workspace.article.id,
        revision: workspace.article.revision,
      });
      return;
    }
    if (
      forceReplacement &&
      (!replacement ||
        replacement.id !== workspace.article?.id ||
        replacement.revision !== workspace.article.revision)
    ) {
      setReplacement(undefined);
      setMessage("文章已有新版本，请重新检查后确认替换");
      return;
    }
    pendingGeneration.current = {
      brandId: workspace.brand.id,
      command: {
        idempotencyKey: newIdempotencyKey(),
        expectedBrandRevision: workspace.brand.revision,
        ...(replacement && forceReplacement
          ? { expectedArticleRevision: replacement.revision }
          : {}),
      },
    };
    await submitPendingGeneration();
  }

  async function submitPendingGeneration() {
    if (!pendingGeneration.current || generationInFlightRef.current) return;
    const pending = pendingGeneration.current;
    generationInFlightRef.current = true;
    setGenerationBusy(true);
    setMessage("");
    setReloadRecommended(false);
    try {
      const generation = await generateCoreArticle(
        apiBaseUrl,
        pending.brandId,
        pending.command,
      );
      pendingGeneration.current = undefined;
      setGenerationUncertain(false);
      await refresh();
      setReplacement(undefined);
      setMessage(generationMessage(generation.status));
    } catch (error) {
      if (pendingGeneration.current) {
        if (error instanceof ApiRequestError && error.status < 500)
          pendingGeneration.current = undefined;
        else setGenerationUncertain(true);
      }
      handleFailure(error, "文章生成失败");
    } finally {
      generationInFlightRef.current = false;
      setGenerationBusy(false);
    }
  }

  async function retryGeneration() {
    if (
      !workspace?.brand ||
      !workspace.latestGeneration ||
      generationInFlightRef.current ||
      articleDirty ||
      state.contextChanged
    )
      return;
    generationInFlightRef.current = true;
    setGenerationBusy(true);
    setMessage("");
    setReloadRecommended(false);
    try {
      const generation = await retryCoreArticleGeneration(
        apiBaseUrl,
        workspace.brand.id,
        workspace.latestGeneration.id,
      );
      await refresh();
      setMessage(generationMessage(generation.status));
    } catch (error) {
      handleFailure(error, "文章重试失败");
    } finally {
      generationInFlightRef.current = false;
      setGenerationBusy(false);
    }
  }

  async function saveArticleContent() {
    if (
      !workspace?.brand ||
      !workspace.article ||
      !state.article ||
      articleSaving ||
      confirming
    )
      return;
    setArticleSaving(true);
    setMessage("");
    setReloadRecommended(false);
    try {
      const article = await saveCoreArticle(
        apiBaseUrl,
        workspace.brand.id,
        workspace.article.id,
        {
          expectedRevision: state.article.revision,
          title: articleTitle,
          bodyMarkdown: articleBody,
        },
      );
      ++observationSequence.current;
      dispatch({ type: "articleSaved", article });
      setMessage(
        workspace.article.status === "CONFIRMED"
          ? "修改已保存，文章已回到草稿状态"
          : "文章修改已保存",
      );
    } catch (error) {
      handleFailure(error, "文章保存失败");
    } finally {
      setArticleSaving(false);
    }
  }

  async function confirmArticleRevision() {
    if (
      !workspace?.brand ||
      !workspace.article ||
      !state.article ||
      articleDirty ||
      confirming ||
      articleSaving
    )
      return;
    setConfirming(true);
    setMessage("");
    setReloadRecommended(false);
    try {
      const article = await confirmCoreArticle(
        apiBaseUrl,
        workspace.brand.id,
        workspace.article.id,
        { expectedRevision: state.article.revision },
      );
      ++observationSequence.current;
      dispatch({ type: "articleSaved", article });
      setMessage(`已确认文章第 ${article.revision} 版`);
    } catch (error) {
      handleFailure(error, "文章确认失败");
    } finally {
      setConfirming(false);
    }
  }

  if (session.kind !== "ready") {
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole="TERMINAL_CUSTOMER"
        workspaceName="AI 搜索优化"
        loadingDetail="通过后再读取当前品牌与文章"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void bootstrap()}
      />
    );
  }

  return (
    <div className="app-shell">
      <CustomerSidebar account={session.account} activePath="/optimization" />
      <main className="workspace optimization-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">AI 搜索优化</p>
            <h1>{workspace?.brand?.companyName ?? "完善品牌后开始优化"}</h1>
            <p>结合最新评测方向完善资料，生成、编辑并确认一篇核心文章。</p>
          </div>
          {workspace?.brand && <span className="current-badge">当前品牌</span>}
        </header>

        {message && (
          <div className="toast-message" role="status">
            <span>{message}</span>
            {reloadRecommended && (
              <button
                type="button"
                className="text-button"
                onClick={() => void reloadLatest()}
              >
                重新加载最新内容
              </button>
            )}
          </div>
        )}

        {reportBrand || reportBrandUnavailable ? (
          <section className="optimization-empty">
            <h2>
              {reportBrand
                ? `此报告属于「${reportBrand.companyName}」`
                : "报告所属品牌暂不可用"}
            </h2>
            <p>优化工作区以当前品牌为上下文，请确认后切换。</p>
            {reportBrand && (
              <button
                className="primary-button"
                type="button"
                disabled={switchingBrand}
                onClick={() => void switchToReportBrand()}
              >
                切换到报告品牌
              </button>
            )}
            <a className="secondary-button" href="/brands">
              查看我的品牌
            </a>
          </section>
        ) : !workspace?.brand ? (
          <section className="optimization-empty">
            <p className="step-label">开始之前</p>
            <h2>还没有当前品牌</h2>
            <p>先创建或选择当前品牌，这里会直接沿用同一份品牌资料。</p>
            <a className="primary-button" href="/brands">
              前往我的品牌
            </a>
          </section>
        ) : (
          <>
            {(state.contextChanged || brandConflict || articleConflict) && (
              <p className="advisory-notice">
                服务器内容或当前品牌已更新。尚未保存的修改仍保留，请复制需要的内容后重新加载。
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void reloadLatest()}
                >
                  重新加载最新内容
                </button>
              </p>
            )}
            <OptimizationStep number="01" title="确认最新优化方向">
              <BrandSummary workspace={workspace} />
              <GuidancePanel workspace={workspace} />
            </OptimizationStep>

            <OptimizationStep number="02" title="完善文章所需资料">
              <p className="optimization-step-intro">
                这里不是另一份品牌档案；保存后会更新当前品牌，诊断和优化继续共用它。
              </p>
              {brandForm && (
                <fieldset
                  className="optimization-form-lock"
                  disabled={brandSaving}
                >
                  <BrandWritingFields
                    apiBaseUrl={apiBaseUrl}
                    brand={workspace.brand}
                    value={brandForm}
                    onChange={(value) => dispatch({ type: "editBrand", value })}
                  />
                </fieldset>
              )}
              <div className="explicit-save-bar">
                <span
                  className={brandDirty ? "dirty-indicator" : "saved-indicator"}
                >
                  {brandDirty ? "有未保存的修改" : "当前修改已保存"}
                </span>
                <button
                  className="primary-button"
                  type="button"
                  disabled={
                    !brandDirty ||
                    brandSaving ||
                    state.contextChanged ||
                    brandConflict
                  }
                  onClick={() => void saveBrandInformation()}
                >
                  {brandSaving ? "保存中…" : "保存优化资料"}
                </button>
              </div>
            </OptimizationStep>

            <OptimizationStep number="03" title="生成核心文章">
              {generationUncertain && (
                <div className="recoverable-state">
                  <p>
                    暂未收到生成结果。重新检查会继续查询同一次操作，不另建生成任务。
                  </p>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={generationBusy}
                    onClick={() => void submitPendingGeneration()}
                  >
                    重新检查生成结果
                  </button>
                </div>
              )}
              <GenerationPanel
                workspace={workspace}
                brandDirty={brandDirty}
                articleDirty={articleDirty}
                busy={
                  generationBusy ||
                  generationUncertain ||
                  brandSaving ||
                  articleSaving ||
                  confirming ||
                  state.contextChanged
                }
                replacementPending={Boolean(replacement)}
                onGenerate={() => void startGeneration()}
                onConfirmReplacement={() => void startGeneration(true)}
                onCancelReplacement={() => setReplacement(undefined)}
                onRetry={() => void retryGeneration()}
                onReload={() => void reloadLatest()}
              />
            </OptimizationStep>

            <OptimizationStep number="04" title="编辑并确认文章">
              <ArticlePanel
                workspace={workspace}
                title={articleTitle}
                body={articleBody}
                dirty={articleDirty}
                articleSaving={articleSaving}
                confirming={confirming}
                generationRunning={
                  generationBusy ||
                  workspace.latestGeneration?.status === "RUNNING"
                }
                onTitleChange={(title) =>
                  dispatch({ type: "editArticle", title })
                }
                onBodyChange={(body) => dispatch({ type: "editArticle", body })}
                onSave={() => void saveArticleContent()}
                onConfirm={() => void confirmArticleRevision()}
              />
            </OptimizationStep>
          </>
        )}
      </main>
    </div>
  );
}

function OptimizationStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="optimization-step">
      <header>
        <span>{number}</span>
        <h2>{title}</h2>
      </header>
      <div>{children}</div>
    </section>
  );
}

function BrandSummary({ workspace }: { workspace: WorkspaceView }) {
  const brand = workspace.brand!;
  return (
    <div className="optimization-brand-summary">
      <div>
        <span>主推主题</span>
        <b>{brand.flagshipProductOrService ?? "待补充"}</b>
      </div>
      <div>
        <span>行业</span>
        <b>
          {[brand.primaryIndustryLabel, brand.secondaryIndustryLabel]
            .filter(Boolean)
            .join(" · ") || "待补充"}
        </b>
      </div>
      <div>
        <span>具体门店</span>
        <b>{brand.storeLocation?.placeName ?? "待补充"}</b>
      </div>
      <a href="/brands">修改完整品牌资料 →</a>
    </div>
  );
}

function GuidancePanel({ workspace }: { workspace: WorkspaceView }) {
  if (!workspace.guidance) {
    return (
      <div className="optimization-guidance-empty">
        <h3>还没有可用的评测方向</h3>
        <p>先完成一次有效评测；系统不会在没有报告时编造优化建议。</p>
        <a className="secondary-button" href="/diagnosis">
          前往 AI 搜索诊断
        </a>
      </div>
    );
  }
  return (
    <div className="optimization-directions">
      {workspace.guidance.brandInformationChanged && (
        <p className="advisory-notice">
          品牌资料在评测后有更新。你可以继续使用当前方向，也可以自行选择重新评测。
        </p>
      )}
      <div>
        {workspace.guidance.customerDirections.map((direction, index) => (
          <article key={direction.directionId}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <small>当前问题</small>
              <p>{direction.currentProblem}</p>
              <small>建议方向</small>
              <h3>{direction.recommendedDirection}</h3>
              <p>{direction.intendedImprovement}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function GenerationPanel({
  workspace,
  brandDirty,
  articleDirty,
  busy,
  replacementPending,
  onGenerate,
  onConfirmReplacement,
  onCancelReplacement,
  onRetry,
  onReload,
}: {
  workspace: WorkspaceView;
  brandDirty: boolean;
  articleDirty: boolean;
  busy: boolean;
  replacementPending: boolean;
  onGenerate(): void;
  onConfirmReplacement(): void;
  onCancelReplacement(): void;
  onRetry(): void;
  onReload(): void;
}) {
  const brand = workspace.brand!;
  const generation = workspace.latestGeneration;
  const running = generation?.status === "RUNNING";
  const retryable = generation?.status === "FAILED";
  const notApplied = generation?.status === "NOT_APPLIED";
  const unavailableReason = brandDirty
    ? "请先保存上方修改"
    : articleDirty
      ? "请先保存当前文章修改"
      : !brand.readyForArticleGeneration
        ? `还需补充：${brand.articleInformationMissingFields.join("、")}`
        : !workspace.guidance
          ? "请先完成一次有效评测"
          : "";

  return (
    <div className="generation-panel">
      {workspace.articleFreshness &&
        (workspace.articleFreshness.brandInformationChanged ||
          workspace.articleFreshness.guidanceChanged) && (
          <p className="advisory-notice">
            当前资料或评测方向比这篇文章更新。文章仍可编辑和确认；需要时再重新生成。
          </p>
        )}
      {running && (
        <div className="recoverable-state">
          <p className="generation-status" role="status">
            <span className="loading-orbit" />{" "}
            正在生成，本页面其他内容仍可编辑。
          </p>
          <p>若长时间没有进展，可以重新检查；系统会继续同一次操作。</p>
          <button
            className="secondary-button"
            type="button"
            disabled={busy || articleDirty}
            onClick={onRetry}
          >
            重新检查处理状态
          </button>
        </div>
      )}
      {retryable && (
        <div className="recoverable-state">
          <b>
            {generation.status === "FAILED"
              ? "本次生成没有完成"
              : "结果未替换当前文章"}
          </b>
          <p>
            {generation.failure?.message ??
              "当前文章保持不变，你可以重试或检查最新内容。"}
          </p>
          <button
            className="secondary-button"
            type="button"
            disabled={busy || articleDirty}
            onClick={onRetry}
          >
            {busy ? "正在重试…" : "使用同一份输入重试"}
          </button>
        </div>
      )}
      {notApplied && (
        <div className="recoverable-state">
          <b>结果未替换当前文章</b>
          <p>生成期间文章版本发生了变化，当前文章保持不变。</p>
          <button className="secondary-button" type="button" onClick={onReload}>
            重新读取当前文章
          </button>
        </div>
      )}
      {replacementPending && workspace.article ? (
        <div className="replacement-confirmation" role="alert">
          <h3>重新生成会替换当前文章</h3>
          <p>
            只有生成成功且文章仍是第 {workspace.article.revision} 版时才会替换；
            在此之前当前文章保持可见。
          </p>
          <div>
            <button
              className="secondary-button"
              type="button"
              onClick={onCancelReplacement}
            >
              取消
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={busy || running || Boolean(unavailableReason)}
              onClick={onConfirmReplacement}
            >
              确认替换并重新生成
            </button>
          </div>
        </div>
      ) : (
        <div className="generation-action-row">
          <div>
            <b>{workspace.article ? "需要新的版本？" : "资料已经准备好？"}</b>
            <small>
              {unavailableReason || "将基于已保存资料与最新方向生成一篇草稿。"}
            </small>
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={Boolean(unavailableReason) || busy || running}
            onClick={onGenerate}
          >
            {busy || running
              ? "生成中…"
              : workspace.article
                ? "重新生成"
                : "生成核心文章"}
          </button>
        </div>
      )}
    </div>
  );
}

export function ArticlePanel({
  workspace,
  title,
  body,
  dirty,
  articleSaving,
  confirming,
  generationRunning,
  onTitleChange,
  onBodyChange,
  onSave,
  onConfirm,
}: {
  workspace: WorkspaceView;
  title: string;
  body: string;
  dirty: boolean;
  articleSaving: boolean;
  confirming: boolean;
  generationRunning: boolean;
  onTitleChange(value: string): void;
  onBodyChange(value: string): void;
  onSave(): void;
  onConfirm(): void;
}) {
  const article = workspace.article;
  if (!article) {
    return (
      <div className="article-empty-state">
        <h3>尚未生成文章</h3>
        <p>保存完整资料并完成上一步后，草稿会显示在这里。</p>
      </div>
    );
  }
  return (
    <div className="article-workbench">
      <div className="article-status-row">
        <span className={`article-status ${article.status.toLowerCase()}`}>
          {article.status === "CONFIRMED" ? "已确认" : "草稿"}
        </span>
        <small>第 {article.revision} 版</small>
        <span className={dirty ? "dirty-indicator" : "saved-indicator"}>
          {dirty ? "有未保存的修改" : "内容已保存"}
        </span>
      </div>
      <div className="article-columns">
        <div className="article-editor-fields">
          <label>
            文章标题
            <input
              value={title}
              maxLength={200}
              disabled={articleSaving || confirming || generationRunning}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </label>
          <label>
            文章正文（支持 Markdown）
            <textarea
              value={body}
              maxLength={100000}
              disabled={articleSaving || confirming || generationRunning}
              onChange={(event) => onBodyChange(event.target.value)}
            />
          </label>
        </div>
        <article className="article-preview">
          <small>安全预览</small>
          <h2>{title || "无标题"}</h2>
          <SafeMarkdown markdown={body} highlights={[]} />
        </article>
      </div>
      <div className="article-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={!dirty || articleSaving || confirming || generationRunning}
          onClick={onSave}
        >
          {articleSaving ? "保存中…" : "保存文章修改"}
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={
            dirty ||
            articleSaving ||
            confirming ||
            generationRunning ||
            article.status === "CONFIRMED"
          }
          onClick={onConfirm}
        >
          {confirming
            ? "确认中…"
            : article.status === "CONFIRMED"
              ? `已确认第 ${article.revision} 版`
              : `确认第 ${article.revision} 版`}
        </button>
      </div>
      {article.status === "CONFIRMED" && (
        <div className="future-order-handoff">
          <div>
            <b>文章已准备好进入购买与发布流程</b>
            <p>发布服务购买入口正在准备中，已确认的文章会保留在这里。</p>
          </div>
          <button className="primary-button" type="button" disabled>
            购买发布服务（后续接入）
          </button>
        </div>
      )}
    </div>
  );
}

function newIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `generation-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function generationMessage(status: string): string {
  if (status === "SUCCEEDED") return "文章草稿已生成";
  if (status === "NOT_APPLIED")
    return "生成已完成，但当前文章有新修改，因此未替换";
  if (status === "FAILED") return "本次生成没有完成，当前文章保持不变";
  return "文章正在生成";
}

function customerErrorMessage(error: unknown): string {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  return message === "Failed to fetch" || !message
    ? "暂时无法连接服务，请稍后重试"
    : message;
}
