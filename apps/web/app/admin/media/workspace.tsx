"use client";

import {
  getAdminMediaPlatform,
  getCurrentAccount,
  listAdminMediaAudits,
  listAdminMediaPlatforms,
  listAdminMediaResources,
  listAdminMediaSources,
  logout,
  type Account,
  type MediaCatalogAudit,
  type MediaPlatformAdmin,
  type MediaResourceAdmin,
  type MediaSupplySource,
} from "@geoeval/api-client";
import { useEffect, useMemo, useState } from "react";

import { AdminSidebar } from "./admin-sidebar.js";
import {
  ListingEditor,
  PlatformEditor,
  ResourceEditor,
  SourceEditor,
} from "./media-editors.js";
import {
  categoryLabels,
  filterAdminPlatforms,
  formatAuditValue,
  formatDateTime,
  formatFenAsYuan,
  isApiStatus,
  listingStatusLabels,
  mediaCategoryOptions,
  platformStatusLabels,
  publicationModeLabels,
  qualityLabels,
  resourceStatusLabels,
  sourceStatusLabels,
  visibilityLabels,
  type PlatformStatusFilter,
  type SalesStatusFilter,
} from "./media-ui.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

type WorkspaceState = "loading" | "ready" | "denied" | "error";
type DetailTab = "OVERVIEW" | "RESOURCES" | "SOURCES" | "AUDIT";
type EditorState =
  | { kind: "platform-new" }
  | { kind: "platform-edit"; platform: MediaPlatformAdmin }
  | { kind: "listing"; platform: MediaPlatformAdmin }
  | { kind: "resource-new"; platform: MediaPlatformAdmin }
  | {
      kind: "resource-edit";
      platform: MediaPlatformAdmin;
      resource: MediaResourceAdmin;
    }
  | { kind: "source-new" }
  | { kind: "source-edit"; source: MediaSupplySource };

const roleLabels: Record<Account["role"], string> = {
  TERMINAL_CUSTOMER: "终端客户",
  OPERATIONS: "运营人员",
  ADMINISTRATOR: "系统管理员",
  AGENT: "代理商",
};

const auditEntityLabels: Record<string, string> = {
  PLATFORM: "平台资料",
  LISTING: "销售设置",
  RESOURCE: "媒体资源",
  SOURCE: "合作来源",
};

const auditActionLabels: Record<string, string> = {
  CREATE: "创建",
  UPDATE: "修改",
  DELETE: "删除",
};

export function AdminMediaWorkspace() {
  const [state, setState] = useState<WorkspaceState>("loading");
  const [account, setAccount] = useState<Account>();
  const [platforms, setPlatforms] = useState<MediaPlatformAdmin[]>([]);
  const [selectedPlatform, setSelectedPlatform] =
    useState<MediaPlatformAdmin>();
  const [resources, setResources] = useState<MediaResourceAdmin[]>([]);
  const [sources, setSources] = useState<MediaSupplySource[]>([]);
  const [audits, setAudits] = useState<MediaCatalogAudit[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<
    "ALL" | MediaPlatformAdmin["categories"][number]
  >("ALL");
  const [platformStatus, setPlatformStatus] =
    useState<PlatformStatusFilter>("ALL");
  const [salesStatus, setSalesStatus] = useState<SalesStatusFilter>("ALL");
  const [tab, setTab] = useState<DetailTab>("OVERVIEW");
  const [auditScope, setAuditScope] = useState<"SELECTED" | "ALL">("SELECTED");
  const [editor, setEditor] = useState<EditorState>();

  async function bootstrap() {
    setState("loading");
    setErrorMessage("");
    try {
      const currentAccount = await getCurrentAccount(apiBaseUrl);
      setAccount(currentAccount);
      if (currentAccount.role !== "ADMINISTRATOR") {
        setState("denied");
        return;
      }
      await reloadAdminData();
      setState("ready");
    } catch (error) {
      if (isApiStatus(error, 401)) {
        window.location.assign("/enter");
        return;
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "管理员媒体库暂时无法加载，请稍后重试",
      );
      setState("error");
    }
  }

  async function reloadAdminData(preferredPlatformId?: string) {
    const [nextPlatforms, nextSources, nextAudits] = await Promise.all([
      listAdminMediaPlatforms(apiBaseUrl),
      listAdminMediaSources(apiBaseUrl),
      listAdminMediaAudits(apiBaseUrl, { limit: 120 }),
    ]);
    setPlatforms(nextPlatforms);
    setSources(nextSources);
    setAudits(nextAudits);
    const targetId =
      preferredPlatformId ?? selectedPlatform?.id ?? nextPlatforms.at(0)?.id;
    if (!targetId || !nextPlatforms.some((item) => item.id === targetId)) {
      setSelectedPlatform(undefined);
      setResources([]);
      return;
    }
    const [detail, nextResources] = await Promise.all([
      getAdminMediaPlatform(apiBaseUrl, targetId),
      listAdminMediaResources(apiBaseUrl, targetId),
    ]);
    setSelectedPlatform(detail);
    setResources(nextResources);
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function selectPlatform(platformId: string) {
    if (selectedPlatform?.id === platformId) return;
    setDetailLoading(true);
    setErrorMessage("");
    try {
      const [detail, nextResources] = await Promise.all([
        getAdminMediaPlatform(apiBaseUrl, platformId),
        listAdminMediaResources(apiBaseUrl, platformId),
      ]);
      setSelectedPlatform(detail);
      setResources(nextResources);
      setTab("OVERVIEW");
      setAuditScope("SELECTED");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "平台详情暂时无法加载",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function acceptedMutation(
    message: string,
    preferredPlatformId?: string,
  ): void {
    setToast(message);
    setRefreshing(true);
    void reloadAdminData(preferredPlatformId)
      .catch((error) => {
        setErrorMessage(
          `变更已保存，但最新数据刷新失败：${
            error instanceof Error ? error.message : "请手动刷新"
          }`,
        );
      })
      .finally(() => setRefreshing(false));
  }

  const filteredPlatforms = useMemo(
    () =>
      filterAdminPlatforms(platforms, {
        search,
        category,
        platformStatus,
        salesStatus,
      }),
    [platforms, search, category, platformStatus, salesStatus],
  );
  const activeSourceCount = sources.filter(
    (source) => source.status === "ACTIVE",
  ).length;
  const onShelfCount = platforms.filter(
    (platform) => platform.listing?.status === "ON_SHELF",
  ).length;
  const selectedAuditEntityIds = new Set([
    ...(selectedPlatform ? [selectedPlatform.id] : []),
    ...resources.map((resource) => resource.id),
  ]);
  const visibleAudits =
    auditScope === "ALL"
      ? audits
      : audits.filter((audit) => selectedAuditEntityIds.has(audit.entityId));

  if (state === "loading") {
    return (
      <main className="loading-page admin-loading-page">
        <span className="loading-orbit" />
        <div>
          <b>正在核验管理员身份</b>
          <small>通过后再加载媒体平台、合作来源与操作记录</small>
        </div>
      </main>
    );
  }

  if (state === "denied" && account) {
    return (
      <main className="admin-denied-page">
        <section>
          <span className="denied-mark" aria-hidden="true">
            403
          </span>
          <p className="eyebrow">权限边界</p>
          <h1>该账号不能进入媒体库管理</h1>
          <p>
            当前账号角色是「{roleLabels[account.role]}
            」。平台资料、价格、合作来源、采购成本和操作记录只向系统管理员开放。
          </p>
          <div>
            {account.role === "TERMINAL_CUSTOMER" && (
              <a className="primary-button" href="/brands">
                返回我的品牌
              </a>
            )}
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                void logout(apiBaseUrl).then(() =>
                  window.location.assign("/enter"),
                )
              }
            >
              退出并更换账号
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="admin-error-page">
        <section>
          <p className="eyebrow">暂时无法进入工作区</p>
          <h1>管理员媒体库没有加载完成</h1>
          <p>{errorMessage}</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => void bootstrap()}
          >
            重新加载
          </button>
        </section>
      </main>
    );
  }

  if (!account) return null;

  return (
    <div className="app-shell admin-app-shell">
      <AdminSidebar account={account} />
      <main className="workspace admin-media-workspace" id="media-catalog">
        <header className="workspace-header admin-workspace-header">
          <div>
            <p className="eyebrow">管理员工作区</p>
            <h1>媒体库管理</h1>
            <p>
              集中维护媒体平台、销售状态、媒体资源和合作来源，并保留完整操作记录。
            </p>
          </div>
          <div className="workspace-header-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={refreshing}
              onClick={() => {
                setRefreshing(true);
                void reloadAdminData()
                  .catch((error) =>
                    setErrorMessage(
                      error instanceof Error ? error.message : "刷新失败",
                    ),
                  )
                  .finally(() => setRefreshing(false));
              }}
            >
              {refreshing ? "刷新中…" : "刷新数据"}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setEditor({ kind: "platform-new" })}
            >
              ＋ 创建平台
            </button>
          </div>
        </header>

        {toast && (
          <p className="toast-message" role="status">
            {toast}
          </p>
        )}
        {errorMessage && (
          <div className="admin-page-error" role="alert">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage("")}>
              知道了
            </button>
          </div>
        )}

        <section className="admin-metric-strip" aria-label="媒体库概况">
          <article>
            <span>平台数量</span>
            <b>{platforms.length}</b>
            <small>
              {platforms.filter((item) => item.status === "ACTIVE").length}{" "}
              个使用中
            </small>
          </article>
          <article>
            <span>销售中</span>
            <b>{onShelfCount}</b>
            <small>客户当前可以购买</small>
          </article>
          <article>
            <span>合作来源</span>
            <b>{activeSourceCount}</b>
            <small>{sources.length} 个来源记录</small>
          </article>
          <article>
            <span>操作记录</span>
            <b>{audits.length}</b>
            <small>当前加载的只读记录</small>
          </article>
        </section>

        <section className="admin-catalog-layout">
          <aside className="platform-browser" aria-label="媒体平台列表">
            <header>
              <div>
                <p className="step-label">平台列表</p>
                <h2>媒体平台</h2>
              </div>
              <span>
                {filteredPlatforms.length} / {platforms.length}
              </span>
            </header>
            <div className="platform-filters">
              <label className="platform-search">
                <span>搜索平台或别名</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="输入名称…"
                />
              </label>
              <div className="platform-filter-row">
                <label>
                  <span>分类</span>
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value as typeof category)
                    }
                  >
                    <option value="ALL">全部分类</option>
                    {mediaCategoryOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>资料状态</span>
                  <select
                    value={platformStatus}
                    onChange={(event) =>
                      setPlatformStatus(
                        event.target.value as PlatformStatusFilter,
                      )
                    }
                  >
                    <option value="ALL">全部</option>
                    <option value="ACTIVE">使用中</option>
                    <option value="ARCHIVED">已归档</option>
                  </select>
                </label>
                <label>
                  <span>销售状态</span>
                  <select
                    value={salesStatus}
                    onChange={(event) =>
                      setSalesStatus(event.target.value as SalesStatusFilter)
                    }
                  >
                    <option value="ALL">全部</option>
                    <option value="NOT_SELLING">未销售</option>
                    <option value="ON_SHELF">销售中</option>
                    <option value="PAUSED">暂停销售</option>
                    <option value="OFF_SHELF">已下架</option>
                  </select>
                </label>
              </div>
            </div>
            {platforms.length === 0 ? (
              <div className="platform-list-empty">
                <span aria-hidden="true">＋</span>
                <h3>还没有媒体平台</h3>
                <p>先填写平台资料，再按需要设置价格、销售状态和媒体资源。</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setEditor({ kind: "platform-new" })}
                >
                  创建首个平台
                </button>
              </div>
            ) : filteredPlatforms.length === 0 ? (
              <div className="platform-list-empty compact">
                <h3>没有匹配的平台</h3>
                <p>尝试清除搜索词或恢复全部筛选。</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setSearch("");
                    setCategory("ALL");
                    setPlatformStatus("ALL");
                    setSalesStatus("ALL");
                  }}
                >
                  清除筛选
                </button>
              </div>
            ) : (
              <div className="platform-list">
                {filteredPlatforms.map((platform) => {
                  const selected = platform.id === selectedPlatform?.id;
                  return (
                    <button
                      type="button"
                      key={platform.id}
                      className={selected ? "selected" : ""}
                      onClick={() => void selectPlatform(platform.id)}
                      aria-current={selected ? "true" : undefined}
                    >
                      <span className="platform-list-logo">
                        {platform.logoUrl && (
                          <img
                            src={platform.logoUrl}
                            alt=""
                            onLoad={(event) => {
                              event.currentTarget.style.display = "block";
                            }}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <b aria-hidden="true">
                          {platform.displayName.slice(0, 1)}
                        </b>
                      </span>
                      <span>
                        <b>{platform.displayName}</b>
                        <small>
                          {platform.categories
                            .slice(0, 2)
                            .map((item) => categoryLabels[item])
                            .join(" · ")}
                        </small>
                      </span>
                      <em
                        className={`state-pill ${platform.listing?.status.toLowerCase() ?? "no-listing"}`}
                      >
                        {platform.listing
                          ? listingStatusLabels[platform.listing.status]
                          : "未销售"}
                      </em>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="platform-detail-workspace">
            {detailLoading ? (
              <div className="detail-loading" role="status">
                <span className="loading-orbit" />
                正在加载平台资料与资源…
              </div>
            ) : !selectedPlatform ? (
              <div className="detail-empty">
                <p className="eyebrow">平台详情</p>
                <h2>选择一个平台开始维护</h2>
                <p>平台资料、销售设置、媒体资源和操作记录会分别呈现。</p>
              </div>
            ) : (
              <>
                <PlatformDetailHeader
                  platform={selectedPlatform}
                  resources={resources}
                  onEdit={() =>
                    setEditor({
                      kind: "platform-edit",
                      platform: selectedPlatform,
                    })
                  }
                />
                <div
                  className="detail-tabs"
                  role="tablist"
                  aria-label="平台维护区域"
                >
                  {(
                    [
                      ["OVERVIEW", "平台与销售"],
                      ["RESOURCES", `媒体资源 ${resources.length}`],
                      ["SOURCES", `合作来源 ${sources.length}`],
                      ["AUDIT", "操作记录"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={tab === value}
                      className={tab === value ? "active" : ""}
                      onClick={() => setTab(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tab === "OVERVIEW" && (
                  <OverviewPanel
                    platform={selectedPlatform}
                    onEditPlatform={() =>
                      setEditor({
                        kind: "platform-edit",
                        platform: selectedPlatform,
                      })
                    }
                    onEditListing={() =>
                      setEditor({
                        kind: "listing",
                        platform: selectedPlatform,
                      })
                    }
                  />
                )}
                {tab === "RESOURCES" && (
                  <ResourcesPanel
                    platform={selectedPlatform}
                    resources={resources}
                    onCreate={() =>
                      setEditor({
                        kind: "resource-new",
                        platform: selectedPlatform,
                      })
                    }
                    onEdit={(resource) =>
                      setEditor({
                        kind: "resource-edit",
                        platform: selectedPlatform,
                        resource,
                      })
                    }
                  />
                )}
                {tab === "SOURCES" && (
                  <SourcesPanel
                    sources={sources}
                    onCreate={() => setEditor({ kind: "source-new" })}
                    onEdit={(source) =>
                      setEditor({ kind: "source-edit", source })
                    }
                  />
                )}
                {tab === "AUDIT" && (
                  <AuditPanel
                    audits={visibleAudits}
                    scope={auditScope}
                    selectedName={selectedPlatform.displayName}
                    onScopeChange={setAuditScope}
                  />
                )}
              </>
            )}
          </section>
        </section>
      </main>

      {editor?.kind === "platform-new" && (
        <PlatformEditor
          apiBaseUrl={apiBaseUrl}
          onClose={() => setEditor(undefined)}
          onSaved={(saved, message) => acceptedMutation(message, saved.id)}
        />
      )}
      {editor?.kind === "platform-edit" && (
        <PlatformEditor
          apiBaseUrl={apiBaseUrl}
          platform={editor.platform}
          onClose={() => setEditor(undefined)}
          onSaved={(saved, message) => acceptedMutation(message, saved.id)}
        />
      )}
      {editor?.kind === "listing" && (
        <ListingEditor
          apiBaseUrl={apiBaseUrl}
          platform={editor.platform}
          onClose={() => setEditor(undefined)}
          onSaved={(saved, message) => acceptedMutation(message, saved.id)}
        />
      )}
      {editor?.kind === "resource-new" && (
        <ResourceEditor
          apiBaseUrl={apiBaseUrl}
          platform={editor.platform}
          sources={sources}
          onClose={() => setEditor(undefined)}
          onSaved={(saved, message) =>
            acceptedMutation(message, saved.platformId)
          }
        />
      )}
      {editor?.kind === "resource-edit" && (
        <ResourceEditor
          apiBaseUrl={apiBaseUrl}
          platform={editor.platform}
          sources={sources}
          resource={editor.resource}
          onClose={() => setEditor(undefined)}
          onSaved={(saved, message) =>
            acceptedMutation(message, saved.platformId)
          }
        />
      )}
      {editor?.kind === "source-new" && (
        <SourceEditor
          apiBaseUrl={apiBaseUrl}
          onClose={() => setEditor(undefined)}
          onSaved={(_saved, message) =>
            acceptedMutation(message, selectedPlatform?.id)
          }
        />
      )}
      {editor?.kind === "source-edit" && (
        <SourceEditor
          apiBaseUrl={apiBaseUrl}
          source={editor.source}
          onClose={() => setEditor(undefined)}
          onSaved={(_saved, message) =>
            acceptedMutation(message, selectedPlatform?.id)
          }
        />
      )}
    </div>
  );
}

function PlatformDetailHeader({
  platform,
  resources,
  onEdit,
}: {
  platform: MediaPlatformAdmin;
  resources: MediaResourceAdmin[];
  onEdit: () => void;
}) {
  return (
    <header className="platform-detail-header">
      <div className="platform-identity-block">
        <span className="platform-logo-preview">
          {platform.logoUrl && (
            <img
              src={platform.logoUrl}
              alt=""
              onLoad={(event) => {
                event.currentTarget.style.display = "block";
              }}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
          <b aria-hidden="true">{platform.displayName.slice(0, 1)}</b>
        </span>
        <div>
          <div className="platform-title-row">
            <h2>{platform.displayName}</h2>
            <span className={`state-pill ${platform.status.toLowerCase()}`}>
              {platformStatusLabels[platform.status]}
            </span>
          </div>
          <p>{platform.description || "尚未填写平台简介"}</p>
          <div className="platform-category-row">
            {platform.categories.map((category) => (
              <span key={category}>{categoryLabels[category]}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="platform-detail-actions">
        <span>
          {resources.length} 个资源 ·{" "}
          {platform.regionScope === "DOMESTIC" ? "国内" : "海外"}
        </span>
        <button type="button" className="secondary-button" onClick={onEdit}>
          编辑平台资料
        </button>
      </div>
    </header>
  );
}

function OverviewPanel({
  platform,
  onEditPlatform,
  onEditListing,
}: {
  platform: MediaPlatformAdmin;
  onEditPlatform: () => void;
  onEditListing: () => void;
}) {
  return (
    <div className="detail-panel-grid">
      <article className="detail-card platform-facts-card">
        <header>
          <div>
            <p className="step-label">01 · 平台资料</p>
            <h3>平台基本信息</h3>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={onEditPlatform}
          >
            编辑
          </button>
        </header>
        <dl className="fact-list">
          <div>
            <dt>标准名称</dt>
            <dd>{platform.normalizedName}</dd>
          </div>
          <div>
            <dt>覆盖地区</dt>
            <dd>{platform.regionScope === "DOMESTIC" ? "国内" : "海外"}</dd>
          </div>
          <div>
            <dt>资料状态</dt>
            <dd>{platformStatusLabels[platform.status]}</dd>
          </div>
          <div>
            <dt>别名</dt>
            <dd>{platform.aliases.join("、") || "无"}</dd>
          </div>
          <div className="wide">
            <dt>平台图标</dt>
            <dd>{platform.logoUrl ? "已设置并展示" : "未设置"}</dd>
          </div>
          <div className="wide">
            <dt>最后更新</dt>
            <dd>{formatDateTime(platform.updatedAt)}</dd>
          </div>
        </dl>
      </article>
      <article className="detail-card listing-card">
        <header>
          <div>
            <p className="step-label">02 · 销售设置</p>
            <h3>价格与销售状态</h3>
          </div>
          <button type="button" className="text-button" onClick={onEditListing}>
            {platform.listing ? "修改" : "设置"}
          </button>
        </header>
        {platform.listing ? (
          <div className="listing-summary">
            <span
              className={`listing-state-orb ${platform.listing.status.toLowerCase()}`}
              aria-hidden="true"
            />
            <div>
              <b>{listingStatusLabels[platform.listing.status]}</b>
              <p>
                {typeof platform.listing.pointPrice !== "number"
                  ? "尚未设置积分价"
                  : `${platform.listing.pointPrice.toLocaleString("zh-CN")} 积分 / 次`}
              </p>
              <small>
                最后更新：{formatDateTime(platform.listing.updatedAt)}
              </small>
            </div>
          </div>
        ) : (
          <div className="listing-empty">
            <b>暂未设置销售</b>
            <p>需要对客户开放购买时，再设置单次积分价和销售状态。</p>
          </div>
        )}
        <p className="ownership-note">
          平台资料正常、销售状态为“销售中”且积分价有效时，客户才能购买；媒体资源数量不影响销售状态。
        </p>
      </article>
    </div>
  );
}

function ResourcesPanel({
  platform,
  resources,
  onCreate,
  onEdit,
}: {
  platform: MediaPlatformAdmin;
  resources: MediaResourceAdmin[];
  onCreate: () => void;
  onEdit: (resource: MediaResourceAdmin) => void;
}) {
  return (
    <section className="resource-panel">
      <header className="panel-section-header">
        <div>
          <p className="step-label">03 · 媒体资源</p>
          <h3>媒体账号与渠道</h3>
          <p>
            资源不可由客户单独购买，也不会自动决定「{platform.displayName}
            」是否可售。
          </p>
        </div>
        <button type="button" className="primary-button" onClick={onCreate}>
          ＋ 添加资源
        </button>
      </header>
      {resources.length === 0 ? (
        <div className="panel-empty-state">
          <span aria-hidden="true">媒</span>
          <div>
            <h4>尚无媒体资源</h4>
            <p>平台仍可单独设置销售状态；有真实账号或渠道信息时再添加。</p>
          </div>
        </div>
      ) : (
        <div className="resource-grid">
          {resources.map((resource) => (
            <article key={resource.id} className="resource-card">
              <header>
                <div>
                  <span
                    className={`state-pill ${resource.status.toLowerCase()}`}
                  >
                    {resourceStatusLabels[resource.status]}
                  </span>
                  <span className="privacy-pill">
                    {visibilityLabels[resource.publicVisibility]}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onEdit(resource)}
                >
                  编辑
                </button>
              </header>
              <h4>{resource.resourceName}</h4>
              {resource.publicVisibility === "MASKED" &&
                resource.publicAlias && (
                  <p className="public-alias">
                    客户展示：{resource.publicAlias}
                  </p>
                )}
              <div className="resource-meta">
                <span>{publicationModeLabels[resource.publicationMode]}</span>
                <span>{qualityLabels[resource.qualityTier]}</span>
                <span>合作来源：{resource.source.name}</span>
              </div>
              <dl>
                <div>
                  <dt>账号名称或编号</dt>
                  <dd>{resource.accountIdentifier || "未记录"}</dd>
                </div>
                <div>
                  <dt>采购成本</dt>
                  <dd>
                    {resource.procurementCostFen === null ||
                    resource.procurementCostFen === undefined
                      ? "未记录"
                      : `¥${formatFenAsYuan(resource.procurementCostFen)}`}
                  </dd>
                </div>
              </dl>
              {resource.publicationNotes && (
                <p className="resource-note">{resource.publicationNotes}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SourcesPanel({
  sources,
  onCreate,
  onEdit,
}: {
  sources: MediaSupplySource[];
  onCreate: () => void;
  onEdit: (source: MediaSupplySource) => void;
}) {
  return (
    <section className="source-panel">
      <header className="panel-section-header">
        <div>
          <p className="step-label">04 · 合作来源</p>
          <h3>合作方与联系方式</h3>
          <p>
            一个合作来源可以对应多个媒体资源；停用来源不会自动改变平台销售状态。
          </p>
        </div>
        <button type="button" className="primary-button" onClick={onCreate}>
          ＋ 创建合作来源
        </button>
      </header>
      {sources.length === 0 ? (
        <div className="panel-empty-state">
          <span aria-hidden="true">合</span>
          <div>
            <h4>尚无合作来源</h4>
            <p>创建合作来源后，才能为媒体资源记录当前合作方。</p>
          </div>
        </div>
      ) : (
        <div className="source-table-wrap">
          <table className="source-table">
            <thead>
              <tr>
                <th>来源</th>
                <th>状态</th>
                <th>联系人</th>
                <th>联系方式</th>
                <th>内部备注</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td>
                    <b>{source.name}</b>
                    <small>{formatDateTime(source.updatedAt)}</small>
                  </td>
                  <td>
                    <span
                      className={`state-pill ${source.status.toLowerCase()}`}
                    >
                      {sourceStatusLabels[source.status]}
                    </span>
                  </td>
                  <td>{source.contactName || "—"}</td>
                  <td>{source.contactMethod || "—"}</td>
                  <td className="source-notes">{source.notes || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onEdit(source)}
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AuditPanel({
  audits,
  scope,
  selectedName,
  onScopeChange,
}: {
  audits: MediaCatalogAudit[];
  scope: "SELECTED" | "ALL";
  selectedName: string;
  onScopeChange: (scope: "SELECTED" | "ALL") => void;
}) {
  return (
    <section className="audit-panel">
      <header className="panel-section-header audit-header">
        <div>
          <p className="step-label">05 · 操作记录</p>
          <h3>重要修改历史</h3>
          <p>记录谁在什么时间修改了什么；这里只查看记录，不提供一键恢复。</p>
        </div>
        <div className="audit-scope-toggle" role="group" aria-label="记录范围">
          <button
            type="button"
            className={scope === "SELECTED" ? "active" : ""}
            onClick={() => onScopeChange("SELECTED")}
          >
            当前平台
          </button>
          <button
            type="button"
            className={scope === "ALL" ? "active" : ""}
            onClick={() => onScopeChange("ALL")}
          >
            全部记录
          </button>
        </div>
      </header>
      {audits.length === 0 ? (
        <div className="panel-empty-state">
          <span aria-hidden="true">记</span>
          <div>
            <h4>暂无操作记录</h4>
            <p>
              {scope === "SELECTED"
                ? `「${selectedName}」及其当前资源尚无已加载记录。`
                : "当前查询没有返回操作记录。"}
            </p>
          </div>
        </div>
      ) : (
        <ol className="audit-timeline">
          {audits.map((audit) => (
            <li key={audit.id}>
              <span className="audit-node" aria-hidden="true" />
              <article>
                <header>
                  <div>
                    <span className="audit-entity">
                      {auditEntityLabels[audit.entityType] ?? "其他记录"}
                    </span>
                    <b>{auditActionLabels[audit.action] ?? "修改"}</b>
                  </div>
                  <time>{formatDateTime(audit.createdAt)}</time>
                </header>
                <p>{audit.reason}</p>
                <small>
                  操作账号 {audit.actorAccountId} · 记录编号 {audit.entityId}
                </small>
                <details>
                  <summary>查看修改前后内容</summary>
                  <div className="audit-value-grid">
                    <section>
                      <b>变更前</b>
                      <pre>{formatAuditValue(audit.beforeState)}</pre>
                    </section>
                    <section>
                      <b>变更后</b>
                      <pre>{formatAuditValue(audit.afterState)}</pre>
                    </section>
                  </div>
                </details>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
