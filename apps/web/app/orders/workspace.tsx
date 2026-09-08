"use client";
import {
  getPublishingOrder,
  getPublishingWorkspace,
  listPublishingOrders,
  type PublishingOrder,
  type PublishingOrderPage,
} from "@geoeval/api-client";
import { useEffect, useRef, useState } from "react";
import { CustomerSidebar } from "../customer-sidebar.js";
import { SafeMarkdown } from "../diagnosis/safe-markdown.js";
import { AgreementSummary } from "../publishing/agreement-summary.js";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../session-access.js";
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
export function OrderWorkspace({ orderId }: { orderId?: string }) {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [order, setOrder] = useState<PublishingOrder>(),
    [page, setPage] = useState<PublishingOrderPage>({
      items: [],
      nextBeforeNumber: null,
    });
  const [brand, setBrand] = useState<{
      id: string;
      companyName: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  async function load() {
    setSession({ kind: "loading" });
    setError("");
    const next = await loadRoleSession(apiBaseUrl, "TERMINAL_CUSTOMER");
    if (next.kind !== "ready") {
      setSession(next);
      return;
    }
    try {
      if (orderId) setOrder(await getPublishingOrder(apiBaseUrl, orderId));
      else {
        const state = await getPublishingWorkspace(apiBaseUrl);
        setBrand(state.brand);
        setPage(
          await listPublishingOrders(
            apiBaseUrl,
            state.brand ? { brandId: state.brand.id } : {},
          ),
        );
      }
      setSession(next);
    } catch (error) {
      setSession(
        sessionFailureState(error) ?? {
          kind: "error",
          message: error instanceof Error ? error.message : "订单读取失败",
        },
      );
    }
  }
  useEffect(() => {
    void load();
  }, [orderId]);
  async function more() {
    if (lock.current || !page.nextBeforeNumber) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await listPublishingOrders(apiBaseUrl, {
        ...(brand ? { brandId: brand.id } : {}),
        beforeNumber: page.nextBeforeNumber,
      });
      setPage({
        items: [...page.items, ...result.items],
        nextBeforeNumber: result.nextBeforeNumber,
      });
    } catch (error) {
      const failure = sessionFailureState(error);
      if (failure) setSession(failure);
      setError(error instanceof Error ? error.message : "读取失败");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole="TERMINAL_CUSTOMER"
        workspaceName="发布订单"
        loadingDetail="读取属于你的购买记录"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void load()}
      />
    );
  return (
    <div className="app-shell">
      <CustomerSidebar account={session.account} activePath="/orders" />
      <main className="workspace commerce-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">已确认的文章与服务约定</p>
            <h1>{orderId ? "发布订单详情" : "发布管理"}</h1>
            <p className="purchase-context">
              {order
                ? order.number
                : brand
                  ? `${brand.companyName}的购买订单`
                  : "我的全部品牌订单"}
            </p>
          </div>
          <a
            className="secondary-button"
            href={orderId ? "/orders" : "/publishing"}
          >
            {orderId ? "返回订单列表" : "选择发布方案"}
          </a>
        </header>
        {order ? (
          <OrderDetail order={order} />
        ) : (
          <>
            {!page.items.length && (
              <section className="commerce-empty">
                <h2>还没有发布订单</h2>
                <p>保存方案不会下单。核对并确认购买后，可以在这里查看订单。</p>
                <a href="/publishing">前往发布方案 →</a>
              </section>
            )}
            <div className="commerce-grid">
              {page.items.map((item) => (
                <article className="commerce-card" key={item.id}>
                  <div className="commerce-card-heading">
                    <h2>{item.title}</h2>
                    <span className="current-badge">
                      {item.status === "PUBLISHING" ? "发布中" : "待处理"}
                    </span>
                  </div>
                  <p>
                    {item.number} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p>
                    {item.mode === "RANDOM" ? "随机套餐" : "精确发布"} ·{" "}
                    {item.quantity} 篇 · {item.totalPoints.toLocaleString()}{" "}
                    积分
                  </p>
                  <a className="secondary-button" href={`/orders/${item.id}`}>
                    查看订单详情
                  </a>
                </article>
              ))}
            </div>
            {page.nextBeforeNumber && (
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => void more()}
              >
                加载更多订单
              </button>
            )}
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
export function OrderDetail({ order }: { order: PublishingOrder }) {
  return (
    <>
      <section className="commerce-intro">
        <div>
          <span className="current-badge">
            {order.status === "PUBLISHING" ? "发布中" : "待处理"}
          </span>
          <h2>{order.title}</h2>
          <p>
            购买时间：{new Date(order.createdAt).toLocaleString()} · 文章版本{" "}
            {order.articleRevision}
          </p>
        </div>
        <a href="/account">查看积分流水 →</a>
      </section>
      <p className="commerce-notice">
        {order.status === "PUBLISHING"
          ? "运营已接手处理本订单。"
          : "购买已完成，订单等待平台处理。"}
        此处保留购买时的文章及服务约定；后续修改品牌、文章或媒体价格不会改变本订单。
      </p>
      <AgreementSummary terms={order.agreement} />
      <section className="commerce-editor" aria-label="购买时的文章">
        <h2>购买时的文章</h2>
        <SafeMarkdown markdown={order.bodyMarkdown} highlights={[]} />
      </section>
    </>
  );
}
