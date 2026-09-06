"use client";

import {
  getPublishingWorkspace,
  listCustomerMedia,
  listMediaCategories,
  listPublishingPackages,
  savePublishingSelection,
  type PublishingPackage,
  type PublishingWorkspace as Workspace,
  type CustomerMediaPage,
  type CustomerMediaPlatform,
  type MediaCategory,
} from "@geoeval/api-client";
import { useEffect, useRef, useState } from "react";
import { CustomerSidebar } from "../customer-sidebar.js";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../session-access.js";
import {
  estimatedPoints,
  mergeMedia,
  selectionForm,
  selectionInput,
  type SelectionForm,
} from "./selection-form.js";
import { QuoteSummary } from "./quote-summary.js";
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function PublishingWorkspace() {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [data, setData] = useState<Workspace>();
  const [packages, setPackages] = useState<PublishingPackage[]>([]);
  const [catalog, setCatalog] = useState<CustomerMediaPage>({
    items: [],
    nextCursor: null,
  });
  const [knownMedia, setKnownMedia] = useState<CustomerMediaPlatform[]>([]);
  const [categories, setCategories] = useState<MediaCategory[]>([]),
    [category, setCategory] = useState("");
  const [form, setForm] = useState<SelectionForm>(selectionForm(null));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const actionLock = useRef(false);
  const dirty =
    JSON.stringify(form) !==
    JSON.stringify(selectionForm(data?.selection ?? null));
  const confirmed =
    !!data?.article &&
    data.article.status === "CONFIRMED" &&
    data.article.confirmedRevision === data.article.revision;
  const needsRebind =
    !!data?.selection &&
    !!data.article &&
    (data.selection.articleId !== data.article.id ||
      data.selection.articleRevision !== data.article.revision);
  async function load() {
    setSession({ kind: "loading" });
    setError("");
    const next = await loadRoleSession(apiBaseUrl, "TERMINAL_CUSTOMER");
    if (next.kind !== "ready") {
      setSession(next);
      return;
    }
    try {
      const [workspace, offers, media, categories] = await Promise.all([
        getPublishingWorkspace(apiBaseUrl),
        listPublishingPackages(apiBaseUrl),
        listCustomerMedia(apiBaseUrl),
        listMediaCategories(apiBaseUrl),
      ]);
      setData(workspace);
      setForm(selectionForm(workspace.selection));
      setPackages(offers);
      setCatalog(media);
      setKnownMedia(media.items);
      setCategories(categories);
      setCategory("");
      setSession(next);
    } catch (error) {
      setSession(
        sessionFailureState(error) ?? {
          kind: "error",
          message: error instanceof Error ? error.message : "方案读取失败",
        },
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function failure(error: unknown) {
    const access = sessionFailureState(error);
    if (access) setSession(access);
    setError(error instanceof Error ? error.message : "操作失败");
  }
  async function save() {
    if (actionLock.current || !data?.brand) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await savePublishingSelection(
        apiBaseUrl,
        data.brand.id,
        selectionInput(form, data),
      );
      setNotice(
        `已为 ${data.brand.companyName} 保存选择（版本 ${result.revision}），未扣分或创建订单。`,
      );
      await load();
    } catch (error) {
      failure(error);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function mediaPage(nextCategory: string, cursor?: string) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      const page = await listCustomerMedia(apiBaseUrl, {
        ...(nextCategory ? { category: nextCategory } : {}),
        ...(cursor ? { cursor } : {}),
      });
      setCatalog(
        cursor
          ? { ...page, items: mergeMedia(catalog.items, page.items) }
          : page,
      );
      setKnownMedia((known) => mergeMedia(known, page.items));
      setCategory(nextCategory);
    } catch (error) {
      failure(error);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  if (session.kind !== "ready" || !data)
    return (
      <WorkspaceAccessPanel
        state={session.kind === "ready" ? { kind: "loading" } : session}
        expectedRole="TERMINAL_CUSTOMER"
        workspaceName="发布方案"
        loadingDetail="读取当前品牌、已保存选择与最新报价"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void load()}
      />
    );
  const names = new Map([
    ...knownMedia.map((item) => [item.id, item.displayName] as const),
    ...(data.quote?.lines.map(
      (line) => [line.platformId, line.displayName] as const,
    ) ?? []),
  ]);
  const prices = new Map([
    ...knownMedia.map((item) => [item.id, item.pointPrice] as const),
    ...(data.quote?.lines
      .filter((line) => line.unitPoints !== null)
      .map((line) => [line.platformId, line.unitPoints!] as const) ?? []),
  ]);
  const estimated = estimatedPoints(form, packages, prices);
  return (
    <div className="app-shell">
      <CustomerSidebar account={session.account} activePath="/publishing" />
      <main className="workspace commerce-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">让品牌内容走向更多媒体</p>
            <h1>发布方案</h1>
            <p>随机套餐与精确发布，按需要选择；保存后可随时继续。</p>
          </div>
          <button
            className="secondary-button"
            disabled={busy || dirty}
            onClick={() => {
              setNotice("已刷新当前资料与报价，请核对最新内容。");
              void load();
            }}
          >
            刷新资料与报价
          </button>
        </header>
        <section className="commerce-intro">
          <div>
            <span className="step-label">
              {data.brand?.companyName ?? "尚未选择品牌"}
            </span>
            <h2>{data.article?.title ?? "先准备一篇核心文章"}</h2>
            <p>
              {confirmed
                ? `当前已确认文章 · 版本 ${data.article!.revision}`
                : "保存发布选择前，请先保存并确认当前品牌的核心文章。"}
            </p>
          </div>
          <a
            className="secondary-button"
            href={data.brand ? "/optimization" : "/brands"}
          >
            {data.brand ? "查看或编辑核心文章 →" : "选择我的品牌 →"}
          </a>
        </section>
        <div className="commerce-notice">
          现在可保存选择并查看报价；提交购买与在线充值尚未接入。保存不会扣分、锁价或产生订单。
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="commerce-notice" role="status">
            {notice}
          </p>
        )}
        <div className="publishing-modes" role="group" aria-label="发布方式">
          <button
            className={
              form.mode === "RANDOM" ? "primary-button" : "secondary-button"
            }
            aria-pressed={form.mode === "RANDOM"}
            disabled={busy}
            onClick={() => setForm({ ...form, mode: "RANDOM" })}
          >
            随机发布套餐
          </button>
          <button
            className={
              form.mode === "PRECISE" ? "primary-button" : "secondary-button"
            }
            aria-pressed={form.mode === "PRECISE"}
            disabled={busy}
            onClick={() => setForm({ ...form, mode: "PRECISE" })}
          >
            精确媒体发布
          </button>
        </div>
        {form.mode === "RANDOM" ? (
          <>
            <p>
              购买约定范围内的成功发布数量，由平台安排具体媒体，不承诺指定平台或账号。
            </p>
            <PublishingPackageCards
              packages={packages}
              selectedId={form.packageId}
              disabled={busy}
              onSelect={(id) => setForm({ ...form, packageId: id })}
            />
            {!!form.packageId &&
              !packages.some((item) => item.id === form.packageId) && (
                <p className="form-error">
                  原套餐已停用，请选择其他套餐；已保存选择没有被删除。
                </p>
              )}
          </>
        ) : (
          <>
            <section className="commerce-editor">
              <h2>挑选发布媒体</h2>
              <label>
                媒体类型
                <select
                  value={category}
                  disabled={busy}
                  onChange={(event) => void mediaPage(event.target.value)}
                >
                  <option value="">全部类型</option>
                  {categories.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="commerce-grid">
                {catalog.items.map((item) => (
                  <article className="commerce-card" key={item.id}>
                    <div className="commerce-card-heading">
                      <h3>{item.displayName}</h3>
                      <span className="current-badge">
                        {item.regionScope === "DOMESTIC"
                          ? "境内媒体"
                          : "境外媒体"}
                      </span>
                    </div>
                    <p>
                      {item.description ??
                        "具体发布安排以所选平台与确认的服务内容为准。"}
                    </p>
                    <p className="commerce-price">
                      {item.pointPrice.toLocaleString()}{" "}
                      <small>积分 / 篇</small>
                    </p>
                    <p className="commerce-muted">
                      {item.categories
                        .map(
                          (id) =>
                            categories.find((category) => category.id === id)
                              ?.label ?? id,
                        )
                        .join(" · ")}
                    </p>
                    <button
                      className="secondary-button"
                      disabled={
                        busy ||
                        form.lines.some(
                          (line) => line.platformId === item.id,
                        ) ||
                        form.lines.length >= 200
                      }
                      onClick={() =>
                        setForm({
                          ...form,
                          lines: [
                            ...form.lines,
                            { platformId: item.id, quantity: "1" },
                          ],
                        })
                      }
                    >
                      {form.lines.some((line) => line.platformId === item.id)
                        ? "已加入选择"
                        : `选择 ${item.displayName}`}
                    </button>
                  </article>
                ))}
              </div>
              {!catalog.items.length && <p>该类型暂无可选媒体。</p>}
              {catalog.nextCursor && (
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void mediaPage(category, catalog.nextCursor!)}
                >
                  加载更多媒体
                </button>
              )}
            </section>
            <section className="commerce-editor">
              <h2>已选媒体与数量</h2>
              {!form.lines.length ? (
                <p>请从媒体卡片中添加发布目标。</p>
              ) : (
                <ul className="publishing-lines">
                  {form.lines.map((line) => (
                    <li key={line.platformId}>
                      <strong>
                        {names.get(line.platformId) ?? "已选媒体"}
                      </strong>
                      <label>
                        发布数量
                        <input
                          aria-label={`${names.get(line.platformId) ?? "已选媒体"} 发布数量`}
                          inputMode="numeric"
                          value={line.quantity}
                          disabled={busy}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              lines: form.lines.map((item) =>
                                item.platformId === line.platformId
                                  ? { ...item, quantity: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                      <span>
                        {prices.get(line.platformId)?.toLocaleString() ?? "—"}{" "}
                        积分/篇
                      </span>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          setForm({
                            ...form,
                            lines: form.lines.filter(
                              (item) => item.platformId !== line.platformId,
                            ),
                          })
                        }
                      >
                        移除 {names.get(line.platformId) ?? "该媒体"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        <section className="commerce-editor publishing-save">
          <div>
            <h2>当前选择{dirty ? " · 尚未保存" : ""}</h2>
            <p>
              估算 {estimated?.toLocaleString() ?? "—"} 积分 · 可用余额{" "}
              {data.balance.toLocaleString()} 积分
            </p>
            <p className="commerce-muted">
              以上是选择估算；明确保存后以下方服务端报价为准。
            </p>
          </div>
          <div className="commerce-actions">
            <button
              className="secondary-button"
              disabled={busy || !dirty}
              onClick={() => {
                setForm(selectionForm(data.selection));
                setError("");
              }}
            >
              放弃未保存修改
            </button>
            <button
              className="primary-button"
              disabled={busy || !confirmed || (!dirty && !needsRebind)}
              onClick={() => void save()}
            >
              {busy ? "处理中…" : "保存选择并查看报价"}
            </button>
          </div>
        </section>
        <QuoteSummary quote={data.quote} balance={data.balance} dirty={dirty} />
        <p className="commerce-muted">
          服务不保证 AI
          提及或排名变化。后续履约可能围绕已确认核心文章调整表达、制作发布版本，不改变主要内容。
        </p>
      </main>
    </div>
  );
}

export function PublishingPackageCards({
  packages,
  selectedId,
  onSelect,
  disabled = false,
}: {
  packages: PublishingPackage[];
  selectedId?: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  if (!packages.length)
    return (
      <section className="commerce-empty">
        <h2>发布方案正在准备中</h2>
        <p>目前没有已启用的套餐。你可以先完善并确认核心文章，稍后再来查看。</p>
      </section>
    );
  return (
    <div className="commerce-grid">
      {packages.map((item) => (
        <article className="commerce-card" key={item.id}>
          <div className="commerce-card-heading">
            <h2>{item.name}</h2>
            <span className="current-badge">
              {item.buyable ? "方案可用" : "暂不可用"}
            </span>
          </div>
          <p className="commerce-price">
            {item.pointPrice.toLocaleString()} <small>积分 / 套餐</small>
          </p>
          <p className="commerce-quantity">
            成功发布 <strong>{item.quantity.toLocaleString()}</strong> 篇
          </p>
          <div className="commerce-tags" aria-label="套餐媒体范围">
            {item.scope.map((platform) => (
              <span key={platform.platformId}>{platform.displayName}</span>
            ))}
          </div>
          <p className="commerce-muted">
            {item.buyable
              ? "在以上范围内安排发布，不指定单个平台或账号。"
              : "范围内的媒体当前均不可购买，请稍后刷新查看。"}
          </p>
          <button
            className="primary-button"
            aria-pressed={selectedId === item.id}
            disabled={disabled || !item.buyable}
            onClick={() => onSelect(item.id)}
          >
            {!item.buyable
              ? "暂不可购买"
              : selectedId === item.id
                ? "已选择此套餐"
                : `选择 ${item.name}`}
          </button>
        </article>
      ))}
    </div>
  );
}
