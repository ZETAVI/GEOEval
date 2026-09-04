"use client";

import {
  getAdminMediaPlatform,
  getAdminMediaSupplier,
  batchUpdateAdminMediaResourceStatus,
  deleteAdminMediaPlatform,
  deleteAdminMediaResource,
  deleteAdminMediaSupplier,
  listAdminMediaAudits,
  listAdminMediaPlatforms,
  listAdminMediaResources,
  listAdminMediaSuppliers,
  type Account,
  type MediaCatalogAudit,
  type MediaPlatformAdmin,
  type MediaResourceAdmin,
  type MediaSupplier,
  type MediaSupplierDetail,
} from "@geoeval/api-client";
import { useEffect, useMemo, useState } from "react";

import {
  loadRoleSession,
  type RoleSessionState,
  sessionFailureState,
  WorkspaceAccessPanel,
} from "../../session-access.js";
import { AdminSidebar } from "../admin-sidebar.js";
import {
  DeleteConfirmDialog,
  PlatformEditor,
  ResourceEditor,
  SupplierEditor,
} from "./media-editors.js";
import {
  categoryLabels,
  filterAdminPlatforms,
  formatAuditValue,
  formatDateTime,
  groupAdminPlatformsByStatus,
  mediaCategoryOptions,
  platformStatusLabels,
  publicationModeLabels,
  qualityLabels,
  resourceEffectiveStatusLabels,
  supplierStatusLabels,
  visibilityLabels,
  type PlatformStatusFilter,
} from "./media-ui.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

type WorkspaceState = RoleSessionState["kind"];
type DetailTab = "OVERVIEW" | "RESOURCES" | "AUDIT";
type WorkspaceArea = "PLATFORMS" | "SUPPLIERS";
type EditorState =
  | { kind: "platform-new" }
  | { kind: "platform-edit"; platform: MediaPlatformAdmin }
  | { kind: "resource-new"; platform: MediaPlatformAdmin }
  | {
      kind: "resource-edit";
      platform: MediaPlatformAdmin;
      resource: MediaResourceAdmin;
    }
  | { kind: "supplier-new" }
  | { kind: "supplier-edit"; supplier: MediaSupplier };
type DeleteTarget =
  | { kind: "platform"; platform: MediaPlatformAdmin }
  | { kind: "resource"; resource: MediaResourceAdmin }
  | { kind: "supplier"; supplier: MediaSupplier };

const auditEntityLabels: Record<string, string> = {
  PLATFORM: "媒体平台",
  LISTING: "历史销售设置",
  RESOURCE: "媒体资源",
  SUPPLIER: "供应商",
};

const auditActionLabels: Record<string, string> = {
  CREATE: "创建",
  UPDATE: "修改",
  DELETE: "删除",
  BATCH_STATUS_UPDATE: "批量修改状态",
};

export function AdminMediaWorkspace() {
  const [state, setState] = useState<WorkspaceState>("loading");
  const [account, setAccount] = useState<Account>();
  const [platforms, setPlatforms] = useState<MediaPlatformAdmin[]>([]);
  const [selectedPlatform, setSelectedPlatform] =
    useState<MediaPlatformAdmin>();
  const [resources, setResources] = useState<MediaResourceAdmin[]>([]);
  const [suppliers, setSuppliers] = useState<MediaSupplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] =
    useState<MediaSupplierDetail>();
  const [area, setArea] = useState<WorkspaceArea>("PLATFORMS");
  const [audits, setAudits] = useState<MediaCatalogAudit[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<
    "ALL" | MediaPlatformAdmin["categories"][number]
  >("ALL");
  const [status, setStatus] = useState<PlatformStatusFilter>("ALL");
  const [tab, setTab] = useState<DetailTab>("OVERVIEW");
  const [auditScope, setAuditScope] = useState<"SELECTED" | "ALL">("SELECTED");
  const [editor, setEditor] = useState<EditorState>();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function bootstrap() {
    setState("loading");
    setErrorMessage("");
    const session = await loadRoleSession(apiBaseUrl, "ADMINISTRATOR");
    if (session.kind === "ready" || session.kind === "denied") {
      setAccount(session.account);
    }
    if (session.kind !== "ready") {
      if (session.kind === "error") setErrorMessage(session.message);
      setState(session.kind);
      return;
    }
    try {
      await reloadAdminData();
      setState("ready");
    } catch (error) {
      if (handleSessionFailure(error)) return;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "管理员媒体库暂时无法加载，请稍后重试",
      );
      setState("error");
    }
  }

  function handleSessionFailure(error: unknown): boolean {
    const failure = sessionFailureState(error);
    if (failure) {
      setState(failure.kind);
      return true;
    }
    return false;
  }

  async function reloadAdminData(preferredPlatformId?: string) {
    const [nextPlatforms, nextSuppliers, nextAudits] = await Promise.all([
      listAdminMediaPlatforms(apiBaseUrl),
      listAdminMediaSuppliers(apiBaseUrl),
      listAdminMediaAudits(apiBaseUrl, { limit: 120 }),
    ]);
    setPlatforms(nextPlatforms);
    setSuppliers(nextSuppliers);
    if (selectedSupplier) {
      const current = nextSuppliers.find(
        (supplier) => supplier.id === selectedSupplier.id,
      );
      setSelectedSupplier(
        current
          ? await getAdminMediaSupplier(apiBaseUrl, current.id)
          : undefined,
      );
    }
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
      if (handleSessionFailure(error)) return;
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
        if (handleSessionFailure(error)) return;
        setErrorMessage(
          `变更已保存，但最新数据刷新失败：${
            error instanceof Error ? error.message : "请手动刷新"
          }`,
        );
      })
      .finally(() => setRefreshing(false));
  }

  async function runBatchStatus(
    items: Array<{ resourceId: string; expectedRevision: number }>,
    nextStatus: MediaResourceAdmin["status"],
    supplierId?: string,
  ) {
    if (items.length === 0) return;
    setRefreshing(true);
    setErrorMessage("");
    try {
      await batchUpdateAdminMediaResourceStatus(apiBaseUrl, {
        items,
        status: nextStatus,
        reason:
          nextStatus === "ACTIVE" ? "批量启用媒体资源" : "批量停用媒体资源",
      });
      await reloadAdminData(selectedPlatform?.id);
      if (supplierId) {
        setSelectedSupplier(
          await getAdminMediaSupplier(apiBaseUrl, supplierId),
        );
      }
      setToast(
        `已批量${nextStatus === "ACTIVE" ? "启用" : "停用"} ${items.length} 个资源`,
      );
    } catch (error) {
      if (handleSessionFailure(error)) return;
      setErrorMessage(
        error instanceof Error ? error.message : "批量操作未执行，请稍后重试",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function removePlatform(platform: MediaPlatformAdmin, reason: string) {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteAdminMediaPlatform(apiBaseUrl, platform.id, {
        expectedRevision: platform.revision,
        reason,
      });
      setDeleteTarget(undefined);
      setSelectedPlatform(undefined);
      await reloadAdminData();
      setToast("平台已删除");
    } catch (error) {
      if (handleSessionFailure(error)) return;
      setDeleteError(error instanceof Error ? error.message : "平台删除失败");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function removeSupplier(supplier: MediaSupplier, reason: string) {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteAdminMediaSupplier(apiBaseUrl, supplier.id, {
        expectedRevision: supplier.revision,
        reason,
      });
      setDeleteTarget(undefined);
      setSelectedSupplier(undefined);
      await reloadAdminData();
      setToast("供应商已删除");
    } catch (error) {
      if (handleSessionFailure(error)) return;
      setDeleteError(error instanceof Error ? error.message : "供应商删除失败");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function removeResource(
    resource: MediaResourceAdmin,
    reason: string,
    deleteUnreferencedSupplier: boolean,
  ) {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteAdminMediaResource(apiBaseUrl, resource.id, {
        expectedRevision: resource.revision,
        reason,
        deleteUnreferencedSupplier,
        ...(deleteUnreferencedSupplier
          ? { expectedSupplierRevision: resource.supplier.revision }
          : {}),
      });
      setDeleteTarget(undefined);
      await reloadAdminData(resource.platformId);
      setToast(
        deleteUnreferencedSupplier ? "资源和无引用供应商已删除" : "资源已删除",
      );
    } catch (error) {
      if (handleSessionFailure(error)) return;
      setDeleteError(error instanceof Error ? error.message : "资源删除失败");
    } finally {
      setDeleteBusy(false);
    }
  }

  function openDelete(target: DeleteTarget) {
    setDeleteError("");
    setDeleteTarget(target);
  }

  const filteredPlatforms = useMemo(
    () =>
      filterAdminPlatforms(platforms, {
        search,
        category,
        status,
      }),
    [platforms, search, category, status],
  );
  const platformGroups = useMemo(
    () => groupAdminPlatformsByStatus(filteredPlatforms),
    [filteredPlatforms],
  );
  const activeSupplierCount = suppliers.filter(
    (supplier) => supplier.status === "ACTIVE",
  ).length;
  const activePlatformCount = platforms.filter(
    (platform) => platform.status === "ACTIVE",
  ).length;
  const selectedAuditEntityIds = new Set([
    ...(selectedPlatform ? [selectedPlatform.id] : []),
    ...resources.map((resource) => resource.id),
  ]);
  const visibleAudits =
    auditScope === "ALL"
      ? audits
      : audits.filter((audit) => selectedAuditEntityIds.has(audit.entityId));

  if (state !== "ready") {
    const accessState: Exclude<RoleSessionState, { kind: "ready" }> =
      state === "denied" && account
        ? { kind: "denied", account }
        : state === "error"
          ? { kind: "error", message: errorMessage }
          : state === "denied"
            ? { kind: "error", message: "当前账号角色暂时无法读取" }
            : { kind: state };
    return (
      <WorkspaceAccessPanel
        state={accessState}
        expectedRole="ADMINISTRATOR"
        workspaceName="媒体库管理"
        loadingDetail="通过后再加载媒体平台、供应商与操作记录"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void bootstrap()}
      />
    );
  }

  if (!account) return null;

  return (
    <div className="app-shell admin-app-shell">
      <AdminSidebar account={account} active="media" />
      <main className="workspace admin-media-workspace" id="media-catalog">
        <header className="workspace-header admin-workspace-header">
          <div>
            <p className="eyebrow">管理员工作区</p>
            <h1>媒体库管理</h1>
            <p>分别维护媒体平台与资源、全局供应商，并保留完整操作记录。</p>
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
              onClick={() =>
                setEditor(
                  area === "PLATFORMS"
                    ? { kind: "platform-new" }
                    : { kind: "supplier-new" },
                )
              }
            >
              {area === "PLATFORMS" ? "＋ 创建平台" : "＋ 创建供应商"}
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

        <nav className="workspace-area-switch" aria-label="媒体库管理区域">
          <button
            type="button"
            className={area === "PLATFORMS" ? "active" : ""}
            onClick={() => setArea("PLATFORMS")}
          >
            平台与资源
          </button>
          <button
            type="button"
            className={area === "SUPPLIERS" ? "active" : ""}
            onClick={() => setArea("SUPPLIERS")}
          >
            供应商管理
          </button>
        </nav>

        <section className="admin-metric-strip" aria-label="媒体库概况">
          <article>
            <span>平台数量</span>
            <b>{platforms.length}</b>
            <small>默认停用，确认价格后再启用</small>
          </article>
          <article>
            <span>启用平台</span>
            <b>{activePlatformCount}</b>
            <small>客户当前可以购买</small>
          </article>
          <article>
            <span>可用供应商</span>
            <b>{activeSupplierCount}</b>
            <small>{suppliers.length} 个供应商</small>
          </article>
          <article>
            <span>操作记录</span>
            <b>{audits.length}</b>
            <small>当前加载的只读记录</small>
          </article>
        </section>

        {area === "SUPPLIERS" ? (
          <SupplierWorkspace
            suppliers={suppliers}
            selected={selectedSupplier}
            onSelect={(supplierId) => {
              setDetailLoading(true);
              void getAdminMediaSupplier(apiBaseUrl, supplierId)
                .then(setSelectedSupplier)
                .catch((error) =>
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : "供应商详情加载失败",
                  ),
                )
                .finally(() => setDetailLoading(false));
            }}
            onCreate={() => setEditor({ kind: "supplier-new" })}
            onEdit={(supplier) =>
              setEditor({ kind: "supplier-edit", supplier })
            }
            onDelete={(supplier) => openDelete({ kind: "supplier", supplier })}
            onJumpToPlatform={(platformId) => {
              setArea("PLATFORMS");
              void selectPlatform(platformId).then(() => setTab("RESOURCES"));
            }}
            onBatchStatus={(items, status) =>
              runBatchStatus(items, status, selectedSupplier?.id)
            }
          />
        ) : (
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
                    <span>状态</span>
                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as PlatformStatusFilter)
                      }
                    >
                      <option value="ALL">全部状态</option>
                      <option value="ACTIVE">启用</option>
                      <option value="INACTIVE">停用</option>
                    </select>
                  </label>
                </div>
              </div>
              {platforms.length === 0 ? (
                <div className="platform-list-empty">
                  <span aria-hidden="true">＋</span>
                  <h3>还没有媒体平台</h3>
                  <p>先填写平台、价格和分类；新建后默认停用。</p>
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
                      setStatus("ALL");
                    }}
                  >
                    清除筛选
                  </button>
                </div>
              ) : (
                <div className="admin-platform-list">
                  {platformGroups.map((group) => (
                    <section
                      className="platform-list-group"
                      key={group.status}
                      aria-label={
                        group.status === "ACTIVE" ? "启用平台" : "停用平台"
                      }
                    >
                      <header>
                        <span>
                          <i
                            className={`platform-group-dot ${group.status.toLowerCase()}`}
                            aria-hidden="true"
                          />
                          <b>
                            {group.status === "ACTIVE"
                              ? "启用平台"
                              : "停用平台"}
                          </b>
                        </span>
                        <em>{group.platforms.length}</em>
                      </header>
                      <div className="platform-list-items">
                        {group.platforms.map((platform) => {
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
                                      event.currentTarget.style.display =
                                        "block";
                                    }}
                                    onError={(event) => {
                                      event.currentTarget.style.display =
                                        "none";
                                    }}
                                  />
                                )}
                                <b aria-hidden="true">
                                  {platform.displayName.slice(0, 1)}
                                </b>
                              </span>
                              <span className="platform-list-copy">
                                <b>{platform.displayName}</b>
                                <small className="platform-list-category">
                                  {platform.categories
                                    .slice(0, 2)
                                    .map((item) => categoryLabels[item])
                                    .join(" · ")}
                                </small>
                                <small className="platform-list-details">
                                  <span>
                                    {platform.regionScope === "DOMESTIC"
                                      ? "国内"
                                      : "海外"}
                                  </span>
                                  <span>
                                    {typeof platform.pointPrice === "number"
                                      ? `${platform.pointPrice.toLocaleString("zh-CN")} 积分/次`
                                      : "未设置积分价"}
                                  </span>
                                </small>
                              </span>
                              <em
                                className={`state-pill ${platform.status.toLowerCase()}`}
                              >
                                {platformStatusLabels[platform.status]}
                              </em>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
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
                  <p>平台信息、价格、媒体资源和操作记录会集中呈现。</p>
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
                    onDelete={() =>
                      openDelete({
                        kind: "platform",
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
                        ["OVERVIEW", "平台信息"],
                        ["RESOURCES", `媒体资源 ${resources.length}`],
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
                      onDelete={(resource) =>
                        openDelete({ kind: "resource", resource })
                      }
                      onBatchStatus={(items, nextStatus) =>
                        runBatchStatus(items, nextStatus)
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
        )}
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
      {editor?.kind === "resource-new" && (
        <ResourceEditor
          apiBaseUrl={apiBaseUrl}
          platform={editor.platform}
          suppliers={suppliers}
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
          suppliers={suppliers}
          resource={editor.resource}
          onClose={() => setEditor(undefined)}
          onSaved={(saved, message) =>
            acceptedMutation(message, saved.platformId)
          }
        />
      )}
      {editor?.kind === "supplier-new" && (
        <SupplierEditor
          apiBaseUrl={apiBaseUrl}
          onClose={() => setEditor(undefined)}
          onSaved={(_saved, message) =>
            acceptedMutation(message, selectedPlatform?.id)
          }
        />
      )}
      {editor?.kind === "supplier-edit" && (
        <SupplierEditor
          apiBaseUrl={apiBaseUrl}
          supplier={editor.supplier}
          onClose={() => setEditor(undefined)}
          onSaved={(_saved, message) =>
            acceptedMutation(message, selectedPlatform?.id)
          }
        />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          kindLabel={
            deleteTarget.kind === "platform"
              ? "平台"
              : deleteTarget.kind === "supplier"
                ? "供应商"
                : "资源"
          }
          name={
            deleteTarget.kind === "platform"
              ? deleteTarget.platform.displayName
              : deleteTarget.kind === "supplier"
                ? deleteTarget.supplier.displayName
                : deleteTarget.resource.resourceName
          }
          {...(deleteTarget.kind === "resource" &&
          deleteTarget.resource.supplier.status === "INACTIVE" &&
          deleteTarget.resource.supplier.resourceCount === 1
            ? {
                cleanupSupplierName: deleteTarget.resource.supplier.displayName,
              }
            : {})}
          busy={deleteBusy}
          error={deleteError}
          onClose={() => {
            if (deleteBusy) return;
            setDeleteTarget(undefined);
            setDeleteError("");
          }}
          onConfirm={(reason, deleteSupplier) => {
            if (deleteTarget.kind === "platform") {
              void removePlatform(deleteTarget.platform, reason);
            } else if (deleteTarget.kind === "supplier") {
              void removeSupplier(deleteTarget.supplier, reason);
            } else {
              void removeResource(
                deleteTarget.resource,
                reason,
                deleteSupplier,
              );
            }
          }}
        />
      )}
    </div>
  );
}

function PlatformDetailHeader({
  platform,
  resources,
  onEdit,
  onDelete,
}: {
  platform: MediaPlatformAdmin;
  resources: MediaResourceAdmin[];
  onEdit: () => void;
  onDelete: () => void;
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
        <div className="record-actions">
          <button type="button" className="secondary-button" onClick={onEdit}>
            编辑平台
          </button>
          <button
            type="button"
            className="danger-action-button"
            onClick={onDelete}
            disabled={platform.status === "ACTIVE" || resources.length > 0}
          >
            删除平台
          </button>
        </div>
        <small className="record-action-hint">
          {platform.status === "ACTIVE"
            ? resources.length > 0
              ? `请先停用平台，并处理 ${resources.length} 条关联资源`
              : "停用平台后才可删除"
            : resources.length > 0
              ? `仍有 ${resources.length} 条资源，请先处理关联资源`
              : "当前没有关联资源，可以删除"}
        </small>
      </div>
    </header>
  );
}

function OverviewPanel({
  platform,
  onEditPlatform,
}: {
  platform: MediaPlatformAdmin;
  onEditPlatform: () => void;
}) {
  return (
    <div className="detail-panel-grid">
      <article className="detail-card platform-facts-card">
        <header>
          <div>
            <p className="step-label">01 · 平台信息</p>
            <h3>基本信息与价格</h3>
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
            <dt>平台状态</dt>
            <dd>{platformStatusLabels[platform.status]}</dd>
          </div>
          <div>
            <dt>单次积分价</dt>
            <dd>
              {typeof platform.pointPrice === "number"
                ? `${platform.pointPrice.toLocaleString("zh-CN")} 积分 / 次`
                : "未设置"}
            </dd>
          </div>
          <div className="wide">
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
      <article className="detail-card availability-card">
        <header>
          <div>
            <p className="step-label">02 · 使用说明</p>
            <h3>接单规则</h3>
          </div>
        </header>
        <div className="availability-summary">
          <span
            className={`availability-state-orb ${platform.status.toLowerCase()}`}
            aria-hidden="true"
          />
          <div>
            <b>{platformStatusLabels[platform.status]}</b>
            <p>
              {platform.status === "ACTIVE"
                ? "客户可以按当前积分价购买该平台。"
                : "客户不能购买；平台资料和历史记录仍会保留。"}
            </p>
            <small>停用后立即停止接单，平台资料和历史记录仍会保留。</small>
          </div>
        </div>
        <p className="ownership-note">
          媒体资源用于履约参考，不会自动启用或停用平台。
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
  onDelete,
  onBatchStatus,
}: {
  platform: MediaPlatformAdmin;
  resources: MediaResourceAdmin[];
  onCreate: () => void;
  onEdit: (resource: MediaResourceAdmin) => void;
  onDelete: (resource: MediaResourceAdmin) => void;
  onBatchStatus: (
    items: Array<{ resourceId: string; expectedRevision: number }>,
    status: MediaResourceAdmin["status"],
  ) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedItems = resources
    .filter((resource) => selectedIds.includes(resource.id))
    .map((resource) => ({
      resourceId: resource.id,
      expectedRevision: resource.revision,
    }));
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
            <p>平台可以独立启用或停用；有真实账号或渠道信息时再添加。</p>
          </div>
        </div>
      ) : (
        <>
          <div className="resource-batch-bar">
            <label className="batch-select-all">
              <input
                type="checkbox"
                checked={selectedIds.length === resources.length}
                onChange={(event) =>
                  setSelectedIds(
                    event.target.checked
                      ? resources.map((item) => item.id)
                      : [],
                  )
                }
              />
              全选
            </label>
            <div className="batch-selection-summary">
              <b>批量操作</b>
              <span>已选择 {selectedItems.length} 条资源</span>
            </div>
            <div className="resource-batch-actions">
              <button
                type="button"
                disabled={selectedItems.length === 0}
                onClick={() => onBatchStatus(selectedItems, "ACTIVE")}
              >
                启用所选
              </button>
              <button
                type="button"
                disabled={selectedItems.length === 0}
                onClick={() => onBatchStatus(selectedItems, "INACTIVE")}
              >
                停用所选
              </button>
            </div>
          </div>
          <div className="resource-grid">
            {resources.map((resource) => (
              <article key={resource.id} className="resource-card">
                <header>
                  <div>
                    <input
                      type="checkbox"
                      aria-label={`选择${resource.resourceName}`}
                      checked={selectedIds.includes(resource.id)}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, resource.id]
                            : current.filter((id) => id !== resource.id),
                        )
                      }
                    />
                    <span
                      className={`state-pill ${resource.effectiveStatus.toLowerCase()}`}
                    >
                      {resourceEffectiveStatusLabels[resource.effectiveStatus]}
                    </span>
                    <span className="privacy-pill">
                      {visibilityLabels[resource.publicVisibility]}
                    </span>
                  </div>
                  <div className="record-action-column">
                    <div className="record-actions compact">
                      <button
                        type="button"
                        className="card-action-button"
                        onClick={() => onEdit(resource)}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="danger-card-action"
                        onClick={() => onDelete(resource)}
                        disabled={resource.status === "ACTIVE"}
                      >
                        删除
                      </button>
                    </div>
                    {resource.status === "ACTIVE" && (
                      <small className="record-action-hint">
                        停用资源后才可删除
                      </small>
                    )}
                  </div>
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
                  <span>供应商：{resource.supplier.displayName}</span>
                </div>
                <dl>
                  <div>
                    <dt>账号名称或编号</dt>
                    <dd>{resource.accountIdentifier || "未记录"}</dd>
                  </div>
                  <div>
                    <dt>采购成本</dt>
                    <dd>
                      {resource.procurementCostYuan === null ||
                      resource.procurementCostYuan === undefined
                        ? "未记录"
                        : `¥${resource.procurementCostYuan.toLocaleString("zh-CN")}`}
                    </dd>
                  </div>
                </dl>
                {resource.publicationNotes && (
                  <p className="resource-note">{resource.publicationNotes}</p>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function SupplierWorkspace({
  suppliers,
  selected,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onJumpToPlatform,
  onBatchStatus,
}: {
  suppliers: MediaSupplier[];
  selected: MediaSupplierDetail | undefined;
  onSelect: (supplierId: string) => void;
  onCreate: () => void;
  onEdit: (supplier: MediaSupplier) => void;
  onDelete: (supplier: MediaSupplier) => void;
  onJumpToPlatform: (platformId: string) => void;
  onBatchStatus: (
    items: Array<{ resourceId: string; expectedRevision: number }>,
    status: MediaResourceAdmin["status"],
  ) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const associations = selected?.resources ?? [];
  const selectedItems = associations
    .filter((resource) => selectedIds.includes(resource.resourceId))
    .map((resource) => ({
      resourceId: resource.resourceId,
      expectedRevision: resource.resourceRevision,
    }));
  return (
    <section className="supplier-workspace">
      <aside className="supplier-browser">
        <header>
          <div>
            <p className="step-label">供应商列表</p>
            <h2>全局供应商</h2>
          </div>
          <span>{suppliers.length}</span>
        </header>
        {suppliers.length === 0 ? (
          <div className="panel-empty-state">
            <span aria-hidden="true">供</span>
            <div>
              <h4>尚无供应商</h4>
              <p>供应商可被不同平台下的多个资源复用。</p>
              <button
                type="button"
                className="primary-button"
                onClick={onCreate}
              >
                创建供应商
              </button>
            </div>
          </div>
        ) : (
          <div className="supplier-list">
            {suppliers.map((supplier) => (
              <button
                type="button"
                key={supplier.id}
                className={selected?.id === supplier.id ? "selected" : ""}
                onClick={() => {
                  setSelectedIds([]);
                  onSelect(supplier.id);
                }}
              >
                <span>
                  <b>{supplier.displayName}</b>
                  <small>
                    {supplier.resourceCount} 条资源 · {supplier.platformCount}{" "}
                    个平台
                  </small>
                </span>
                <em className={`state-pill ${supplier.status.toLowerCase()}`}>
                  {supplierStatusLabels[supplier.status]}
                </em>
              </button>
            ))}
          </div>
        )}
      </aside>
      <section className="supplier-detail">
        {!selected ? (
          <div className="detail-empty">
            <p className="eyebrow">供应商详情</p>
            <h2>选择一个供应商</h2>
            <p>这里会展示联系方式、关联资源与涉及平台。</p>
          </div>
        ) : (
          <>
            <header className="supplier-detail-header">
              <div>
                <p className="eyebrow">全局供应商</p>
                <h2>{selected.displayName}</h2>
                <p>
                  {selected.contactName || "未记录联系人"} ·{" "}
                  {selected.contactMethod || "未记录联系方式"}
                </p>
              </div>
              <div className="supplier-heading-actions">
                <span className={`state-pill ${selected.status.toLowerCase()}`}>
                  {supplierStatusLabels[selected.status]}
                </span>
                <div className="record-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onEdit(selected)}
                  >
                    编辑供应商
                  </button>
                  <button
                    type="button"
                    className="danger-action-button"
                    onClick={() => onDelete(selected)}
                    disabled={
                      selected.status === "ACTIVE" || selected.resourceCount > 0
                    }
                  >
                    删除供应商
                  </button>
                </div>
                <small className="record-action-hint">
                  {selected.status === "ACTIVE"
                    ? selected.resourceCount > 0
                      ? `请先停用供应商，并处理 ${selected.resourceCount} 条关联资源`
                      : "停用供应商后才可删除"
                    : selected.resourceCount > 0
                      ? `仍关联 ${selected.resourceCount} 条资源，请先处理关联资源`
                      : "当前没有关联资源，可以删除"}
                </small>
              </div>
            </header>
            <div className="supplier-stat-row">
              <span>
                <b>{selected.resourceCount}</b> 条关联资源
              </span>
              <span>
                <b>{selected.platformCount}</b> 个涉及平台
              </span>
              <span>更新于 {formatDateTime(selected.updatedAt)}</span>
            </div>
            <div className="resource-batch-bar">
              <label className="batch-select-all">
                <input
                  type="checkbox"
                  checked={
                    associations.length > 0 &&
                    selectedIds.length === associations.length
                  }
                  onChange={(event) =>
                    setSelectedIds(
                      event.target.checked
                        ? associations.map((item) => item.resourceId)
                        : [],
                    )
                  }
                />
                全选
              </label>
              <div className="batch-selection-summary">
                <b>批量操作</b>
                <span>已选择 {selectedItems.length} 条资源</span>
              </div>
              <div className="resource-batch-actions">
                <button
                  type="button"
                  disabled={selectedItems.length === 0}
                  onClick={() => onBatchStatus(selectedItems, "ACTIVE")}
                >
                  启用所选
                </button>
                <button
                  type="button"
                  disabled={selectedItems.length === 0}
                  onClick={() => onBatchStatus(selectedItems, "INACTIVE")}
                >
                  停用所选
                </button>
              </div>
            </div>
            {associations.length === 0 ? (
              <div className="panel-empty-state compact">
                <span aria-hidden="true">空</span>
                <div>
                  <h4>暂无关联资源</h4>
                  <p>停用后可以安全删除该供应商。</p>
                </div>
              </div>
            ) : (
              <div className="supplier-association-list">
                {associations.map((resource) => (
                  <article key={resource.resourceId}>
                    <input
                      type="checkbox"
                      aria-label={`选择${resource.resourceName}`}
                      checked={selectedIds.includes(resource.resourceId)}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, resource.resourceId]
                            : current.filter(
                                (id) => id !== resource.resourceId,
                              ),
                        )
                      }
                    />
                    <div>
                      <b>{resource.resourceName}</b>
                      <small>{resource.platformDisplayName}</small>
                    </div>
                    <span
                      className={`state-pill ${resource.effectiveStatus.toLowerCase()}`}
                    >
                      {resourceEffectiveStatusLabels[resource.effectiveStatus]}
                    </span>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onJumpToPlatform(resource.platformId)}
                    >
                      查看平台
                    </button>
                  </article>
                ))}
              </div>
            )}
            {selected.notes && (
              <p className="supplier-notes">内部备注：{selected.notes}</p>
            )}
          </>
        )}
      </section>
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
