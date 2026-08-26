"use client";

import {
  createBrand,
  getCurrentAccount,
  listBrands,
  selectCurrentBrand,
  updateBrand,
  type Account,
  type Brand,
  type BrandMutation,
} from "@geoeval/api-client";
import { useEffect, useState } from "react";
import { CustomerSidebar } from "../customer-sidebar.js";
import { BrandEditor } from "./brand-editor.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
export function BrandWorkspace() {
  const [account, setAccount] = useState<Account>();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Brand | "new">();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const [nextAccount, nextBrands] = await Promise.all([
      getCurrentAccount(apiBaseUrl),
      listBrands(apiBaseUrl),
    ]);
    setAccount(nextAccount);
    setBrands(nextBrands);
  }
  useEffect(() => {
    void refresh()
      .catch(() => window.location.assign("/enter"))
      .finally(() => setLoading(false));
  }, []);

  const current = brands.find((brand) => brand.isCurrent);
  const readyCount = brands.filter((brand) => brand.readyForEvaluation).length;

  async function save(input: BrandMutation) {
    setBusy(true);
    setMessage("");
    try {
      if (editing === "new") await createBrand(apiBaseUrl, input);
      else if (editing) await updateBrand(apiBaseUrl, editing.id, input);
      await refresh();
      setEditing(undefined);
      setMessage("品牌资料已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  async function select(brand: Brand) {
    if (brand.isCurrent) return;
    setBusy(true);
    setMessage("");
    try {
      await selectCurrentBrand(apiBaseUrl, brand.id);
      await refresh();
      setMessage(`已切换到「${brand.companyName}」`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "切换失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <main className="loading-page">
        <span className="loading-orbit" />
        正在准备你的品牌空间…
      </main>
    );

  return (
    <div className="app-shell">
      <CustomerSidebar account={account} activePath="/brands" />
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">品牌空间</p>
            <h1>我的品牌</h1>
            <p>管理诊断所需资料，并从当前品牌继续 GEO 优化旅程。</p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => setEditing("new")}
          >
            ＋ 创建品牌
          </button>
        </header>
        {message && (
          <p className="toast-message" role="status">
            {message}
          </p>
        )}
        {brands.length === 0 ? (
          <section className="empty-brand-state">
            <div className="empty-visual" aria-hidden="true">
              <span>G</span>
              <i />
              <i />
              <i />
            </div>
            <div>
              <p className="step-label">从这里开始</p>
              <h2>先建立一份品牌资料</h2>
              <p>
                只需填写公司或店铺名称即可保存。资料不完整也没关系，进入诊断前再逐步补齐。
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={() => setEditing("new")}
              >
                创建首个品牌
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="brand-overview">
              <div className="current-brand-panel">
                <div className="panel-title">
                  <span className="current-badge">当前品牌</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => current && setEditing(current)}
                  >
                    编辑资料
                  </button>
                </div>
                <h2>{current?.companyName ?? "请选择品牌"}</h2>
                <p>
                  {current?.readyForEvaluation
                    ? "诊断资料已经齐全，可以进入下一步免费评测。"
                    : `还需补充 ${current?.missingFields.length ?? 0} 项诊断资料。`}
                </p>
                <div className="progress-line">
                  <i
                    style={
                      {
                        "--progress": `${current ? Math.round(((10 - current.missingFields.length) / 10) * 100) : 0}%`,
                      } as React.CSSProperties
                    }
                  />
                </div>
                <div className="panel-actions">
                  {current?.readyForEvaluation ? (
                    <a className="primary-button" href="/diagnosis">
                      进入免费诊断
                    </a>
                  ) : (
                    <button className="primary-button" type="button" disabled>
                      请先补全资料
                    </button>
                  )}
                  {!current?.readyForEvaluation && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => current && setEditing(current)}
                    >
                      补全资料
                    </button>
                  )}
                </div>
              </div>
              <div className="overview-stats">
                <article>
                  <span>品牌资料</span>
                  <b>{brands.length}</b>
                  <small>个独立品牌</small>
                </article>
                <article>
                  <span>可诊断</span>
                  <b>{readyCount}</b>
                  <small>资料已齐全</small>
                </article>
                <article className="journey-stat">
                  <span>当前进度</span>
                  <b>{current?.readyForEvaluation ? "准备诊断" : "完善资料"}</b>
                  <small>
                    {current?.readyForEvaluation
                      ? "可进入免费评测"
                      : "先补全诊断资料"}
                  </small>
                </article>
              </div>
            </section>
            <section className="section-heading">
              <div>
                <h2>全部品牌</h2>
                <p>切换当前品牌后，诊断与优化页面会同步使用同一份资料。</p>
              </div>
              <span>{brands.length} 个品牌</span>
            </section>
            <section className="brand-grid">
              {brands.map((brand) => (
                <article
                  className={`brand-card ${brand.isCurrent ? "selected" : ""}`}
                  key={brand.id}
                >
                  <div className="brand-card-top">
                    <span className="brand-avatar">
                      {brand.companyName?.slice(0, 1) ?? "品"}
                    </span>
                    {brand.isCurrent ? (
                      <span className="current-badge">当前</span>
                    ) : (
                      <button
                        className="select-button"
                        disabled={busy}
                        type="button"
                        onClick={() => void select(brand)}
                      >
                        设为当前
                      </button>
                    )}
                  </div>
                  <h3>{brand.companyName}</h3>
                  <p>
                    {[brand.primaryIndustry, brand.secondaryIndustry]
                      .filter(Boolean)
                      .join(" · ") || "行业信息待补充"}
                  </p>
                  <div className="readiness-row">
                    <span>
                      {brand.readyForEvaluation
                        ? "资料完整"
                        : `${brand.missingFields.length} 项待补充`}
                    </span>
                    <i className={brand.readyForEvaluation ? "ready" : ""} />
                  </div>
                  <button
                    className="card-edit"
                    type="button"
                    onClick={() => setEditing(brand)}
                  >
                    编辑品牌资料 <span>→</span>
                  </button>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
      {editing && (
        <BrandEditor
          {...(editing === "new" ? {} : { brand: editing })}
          busy={busy}
          onCancel={() => setEditing(undefined)}
          onSave={save}
        />
      )}
    </div>
  );
}
