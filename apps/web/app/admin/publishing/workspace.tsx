"use client";

import {
  createAdminPublishingPackage,
  listAdminMediaPlatforms,
  listAdminPublishingPackages,
  listPublishingPackageAudits,
  updateAdminPublishingPackage,
  type MediaPlatformAdmin,
  type PublishingPackageAdmin,
  type PublishingPackageAudit,
  type PublishingPackageCreate,
} from "@geoeval/api-client";
import { useEffect, useState } from "react";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../../session-access.js";
import { AdminSidebar } from "../admin-sidebar.js";
import { formatChinaDateTime } from "../../china-time.js";
import { formatPoints } from "../../point-format.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function AdminPublishingWorkspace() {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [packages, setPackages] = useState<PublishingPackageAdmin[]>([]);
  const [platforms, setPlatforms] = useState<MediaPlatformAdmin[]>([]);
  const [editor, setEditor] = useState<PublishingPackageAdmin | "new">();
  const [auditId, setAuditId] = useState<string>();
  const [message, setMessage] = useState("");

  async function load() {
    setSession({ kind: "loading" });
    const next = await loadRoleSession(apiBaseUrl, "ADMINISTRATOR");
    if (next.kind !== "ready") {
      setSession(next);
      return;
    }
    try {
      const [offers, media] = await Promise.all([
        listAdminPublishingPackages(apiBaseUrl),
        listAdminMediaPlatforms(apiBaseUrl),
      ]);
      setPackages(offers);
      setPlatforms(media);
      setSession(next);
    } catch (error) {
      setSession(
        sessionFailureState(error) ?? {
          kind: "error",
          message: error instanceof Error ? error.message : "套餐读取失败",
        },
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);

  if (session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole="ADMINISTRATOR"
        workspaceName="发布套餐管理"
        loadingDetail="通过后读取套餐和媒体范围"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void load()}
      />
    );
  return (
    <div className="app-shell">
      <AdminSidebar account={session.account} active="publishing" />
      <main className="workspace commerce-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">发布服务配置</p>
            <h1>发布套餐</h1>
            <p>
              维护客户可见的数量、总积分与媒体范围。套餐不承诺指定平台或账号。
            </p>
          </div>
          <div className="commerce-actions">
            <button
              className="secondary-button"
              disabled={!!editor}
              onClick={() => void load()}
            >
              刷新列表
            </button>
            <button
              className="primary-button"
              disabled={!!editor}
              onClick={() => {
                setEditor("new");
                setMessage("");
              }}
            >
              创建套餐
            </button>
          </div>
        </header>
        {message && (
          <p role="status" className="commerce-notice">
            {message}
          </p>
        )}
        <div className="commerce-notice">
          停用只影响新购买，不改变已购订单；客户确认购买后扣减积分并生成待处理订单。
        </div>
        {editor && (
          <PackageEditor
            key={editor === "new" ? "new" : editor.id}
            initial={editor === "new" ? undefined : editor}
            platforms={platforms}
            onCancel={() => setEditor(undefined)}
            onAuthFailure={(error) => {
              const failure = sessionFailureState(error);
              if (failure) setSession(failure);
            }}
            onSaved={(saved) => {
              setPackages((items) => [
                saved,
                ...items.filter((item) => item.id !== saved.id),
              ]);
              setEditor(undefined);
              setAuditId(undefined);
              setMessage("套餐已保存；客户读取使用当前启用状态和媒体可用性。");
            }}
          />
        )}
        {!packages.length && !editor && (
          <section className="commerce-empty">
            <h2>尚未维护发布套餐</h2>
            <p>
              先在媒体库维护平台，再创建有明确范围和价格的套餐；系统不会自动填入销售方案。
            </p>
            <a href="/admin/media">前往媒体库管理 →</a>
          </section>
        )}
        <div className="commerce-grid">
          {packages.map((item) => (
            <article className="commerce-card" key={item.id}>
              <div className="commerce-card-heading">
                <h2>{item.name}</h2>
                <span className="current-badge">
                  {item.status === "ACTIVE" ? "已启用" : "已停用"}
                </span>
              </div>
              <p className="commerce-price">
                {formatPoints(item.pointPrice)} <small>/ 套餐</small>
              </p>
              <p>
                成功发布 {item.quantity.toLocaleString()} 篇 · 第{" "}
                {item.revision} 版
              </p>
              <p className="commerce-muted">
                媒体范围：
                {item.platformIds
                  .map(
                    (id) =>
                      platforms.find((p) => p.id === id)?.displayName ??
                      "媒体已不可读",
                  )
                  .join("、")}
              </p>
              <div className="commerce-actions">
                <button
                  className="secondary-button"
                  disabled={!!editor}
                  onClick={() => setEditor(item)}
                >
                  编辑 {item.name}
                </button>
                <button
                  className="text-button"
                  onClick={() => setAuditId(item.id)}
                >
                  查看记录
                </button>
              </div>
            </article>
          ))}
        </div>
        {auditId && (
          <PackageAudit
            key={auditId}
            id={auditId}
            onClose={() => setAuditId(undefined)}
            onAuthFailure={(error) => {
              const failure = sessionFailureState(error);
              if (failure) setSession(failure);
            }}
          />
        )}
      </main>
    </div>
  );
}

type PackageForm = {
  name: string;
  quantity: string;
  pointPrice: string;
  status: "ACTIVE" | "INACTIVE";
  platformIds: string[];
  reason: string;
};
export function packageForm(initial?: PublishingPackageAdmin): PackageForm {
  return {
    name: initial?.name ?? "",
    quantity: initial ? String(initial.quantity) : "",
    pointPrice: initial ? String(initial.pointPrice) : "",
    status: initial?.status ?? "INACTIVE",
    platformIds: initial?.platformIds ?? [],
    reason: "",
  };
}
export function packageMutation(form: PackageForm): PublishingPackageCreate {
  if (!/^\d+$/.test(form.quantity) || !/^\d+$/.test(form.pointPrice))
    throw new Error("发布数量与总积分必须为正整数，不支持小数");
  const quantity = Number(form.quantity),
    pointPrice = Number(form.pointPrice);
  if (
    ![quantity, pointPrice].every(
      (n) => Number.isInteger(n) && n > 0 && n <= 2147483647,
    )
  )
    throw new Error("发布数量或总积分超出有效范围");
  return {
    name: form.name.trim(),
    quantity,
    pointPrice,
    status: form.status,
    platformIds: form.platformIds,
  };
}

function PackageEditor({
  initial,
  platforms,
  onCancel,
  onSaved,
  onAuthFailure,
}: {
  initial: PublishingPackageAdmin | undefined;
  platforms: MediaPlatformAdmin[];
  onCancel: () => void;
  onSaved: (saved: PublishingPackageAdmin) => void;
  onAuthFailure: (error: unknown) => void;
}) {
  const [form, setForm] = useState(() => packageForm(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(form) !== JSON.stringify(packageForm(initial));
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const fields = packageMutation(form);
      const saved = initial
        ? await updateAdminPublishingPackage(apiBaseUrl, initial.id, {
            ...fields,
            expectedRevision: initial.revision,
            reason: form.reason,
          })
        : await createAdminPublishingPackage(apiBaseUrl, fields);
      onSaved(saved);
    } catch (error) {
      onAuthFailure(error);
      setError(
        error instanceof Error ? error.message : "保存失败，修改内容已保留",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="commerce-editor" aria-labelledby="package-editor-title">
      <h2 id="package-editor-title">{initial ? "编辑套餐" : "创建套餐"}</h2>
      <p>填写明确的发布承诺。总积分是整个套餐价格，不是单篇价格。</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy} className="commerce-form-grid">
          <label className="wide">
            套餐名称
            <input
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            成功发布数量
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </label>
          <label>
            套餐总积分
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              value={form.pointPrice}
              onChange={(e) => setForm({ ...form, pointPrice: e.target.value })}
            />
          </label>
          <label className="wide">
            套餐状态
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as PackageForm["status"],
                })
              }
            >
              <option value="INACTIVE">停用 · 客户不可见</option>
              <option value="ACTIVE">启用 · 展示给客户</option>
            </select>
          </label>
          <fieldset className="wide commerce-scope">
            <legend>适用媒体范围（至少一项，最多 200 项）</legend>
            <p>
              由平台在此范围内安排发布；没有可购买媒体时，客户会看到暂不可用。
            </p>
            {!platforms.length && (
              <p>
                媒体库暂无平台，请先<a href="/admin/media">维护媒体平台</a>。
              </p>
            )}
            <div className="commerce-scope-options">
              {platforms.map((platform) => (
                <label key={platform.id}>
                  <input
                    type="checkbox"
                    checked={form.platformIds.includes(platform.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        platformIds: e.target.checked
                          ? [...form.platformIds, platform.id]
                          : form.platformIds.filter((id) => id !== platform.id),
                      })
                    }
                  />
                  <span>
                    {platform.displayName}
                    <small>
                      {platform.status === "ACTIVE" ? "已启用" : "已停用"}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {initial && (
            <label className="wide">
              修改原因
              <textarea
                required
                maxLength={320}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </label>
          )}
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}。可放弃修改后刷新列表，不会自动覆盖新版本。
          </p>
        )}
        <footer className="commerce-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={onCancel}
          >
            {dirty ? "放弃未保存修改" : "取消"}
          </button>
          <button
            className="primary-button"
            disabled={
              busy ||
              !dirty ||
              !form.platformIds.length ||
              form.platformIds.length > 200
            }
          >
            {busy ? "保存中…" : "保存套餐"}
          </button>
        </footer>
      </form>
    </section>
  );
}

function PackageAudit({
  id,
  onClose,
  onAuthFailure,
}: {
  id: string;
  onClose: () => void;
  onAuthFailure: (error: unknown) => void;
}) {
  const [items, setItems] = useState<PublishingPackageAudit[]>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void listPublishingPackageAudits(apiBaseUrl, id)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((error) => {
        if (active) {
          onAuthFailure(error);
          setError(error instanceof Error ? error.message : "记录读取失败");
        }
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <section className="commerce-editor">
      <div className="commerce-card-heading">
        <h2>套餐变更记录</h2>
        <button className="secondary-button" onClick={onClose}>
          关闭记录
        </button>
      </div>
      <p>最近 50 条记录，历史内容不会随套餐修改而变化。</p>
      {error ? (
        <p role="alert">{error}</p>
      ) : !items ? (
        <p role="status">读取中…</p>
      ) : (
        <ol className="commerce-audit">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.reason}</strong>
              <p>
                {formatChinaDateTime(item.createdAt)} · 第{" "}
                {item.afterState.revision} 版
              </p>
              <p>
                {item.beforeState
                  ? `${item.beforeState.quantity} 篇 / ${formatPoints(item.beforeState.pointPrice)} → `
                  : "创建："}
                {item.afterState.quantity} 篇 /{" "}
                {formatPoints(item.afterState.pointPrice)} ·{" "}
                {item.afterState.status === "ACTIVE" ? "启用" : "停用"}
              </p>
              <small>操作账号：{item.actorAccountId}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
