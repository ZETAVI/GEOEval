"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  getCustomerPublicationResults,
  type CustomerPublicationPage,
  type PublishingOrder,
} from "@geoeval/api-client";

export const deliveryStatusLabel: Record<PublishingOrder["status"], string> = {
  PENDING_HANDLING: "待处理",
  PUBLISHING: "发布中",
  COMPLETED: "已完成",
};
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function PublicationResultsView({
  page,
}: {
  page: CustomerPublicationPage;
}) {
  return (
    <div className="delivery-list">
      {page.items.map((item) => (
        <article className="commerce-card" key={item.slot}>
          <div className="commerce-card-heading">
            <h3>{item.targetName ?? `发布结果 ${item.slot}`}</h3>
            <span className="current-badge">
              {item.result ? "已发布" : "处理中"}
            </span>
          </div>
          {item.result ? (
            <>
              <p>{item.result.title}</p>
              <p>
                发布时间：{new Date(item.result.publishedAt).toLocaleString()}
              </p>
              <a
                className="secondary-button"
                href={item.result.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                查看已发布文章 ↗
              </a>
            </>
          ) : (
            <p>该项属于已购买的发布范围，结果将在发布后显示。</p>
          )}
        </article>
      ))}
    </div>
  );
}

export function CustomerPublicationResults({
  order,
  children,
}: {
  order: PublishingOrder;
  children?: ReactNode;
}) {
  const [page, setPage] = useState<CustomerPublicationPage>();
  const [after, setAfter] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const epoch = useRef(0);
  async function load() {
    const request = ++epoch.current;
    setLoading(true);
    setError("");
    try {
      const next = await getCustomerPublicationResults(
        apiBaseUrl,
        order.id,
        after,
      );
      if (request === epoch.current) setPage(next);
    } catch (error) {
      if (request === epoch.current)
        setError(error instanceof Error ? error.message : "发布结果读取失败");
    } finally {
      if (request === epoch.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      epoch.current += 1;
    };
  }, [order.id, after]);
  return (
    <>
      <section
        className="commerce-editor"
        aria-label="发布进度"
        aria-busy={loading}
      >
        <div className="commerce-card-heading">
          <h2>发布进度</h2>
          <span className="current-badge">
            {deliveryStatusLabel[page?.status ?? order.status]}
          </span>
        </div>
        {page && (
          <>
            <p>
              已发布 {page.publishedQuantity} / {page.quantity} 篇
              {page.delayed ? " · 已延期，平台仍在处理中" : ""}
            </p>
            <progress
              aria-label="已发布数量"
              value={page.publishedQuantity}
              max={page.quantity}
            />
            <p>
              预计完成时间：
              {new Date(page.expectedCompletionAt).toLocaleString()}
            </p>
          </>
        )}
        {loading && <p role="status">正在读取最新发布结果…</p>}
        <button
          className="secondary-button"
          disabled={loading}
          onClick={() => void load()}
        >
          刷新进度
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
      {children}
      <section className="commerce-editor" aria-label="发布结果">
        <h2>
          {order.agreement.mode === "PRECISE"
            ? "已购媒体与发布结果"
            : "发布结果"}
        </h2>
        {page && <PublicationResultsView page={page} />}
        {page && !page.items.length && !loading && (
          <p>
            尚无可显示的发布结果。实际发布完成后会陆续出现在这里，无需等待整单完成。
          </p>
        )}
        <div className="commerce-actions">
          {after > 0 && (
            <button
              className="secondary-button"
              disabled={loading}
              onClick={() => setAfter(0)}
            >
              返回首批结果
            </button>
          )}
          {page?.nextAfterSlot != null && (
            <button
              className="secondary-button"
              disabled={loading}
              onClick={() => setAfter(page.nextAfterSlot!)}
            >
              下一批结果
            </button>
          )}
        </div>
        <p className="purchase-context">
          发布链接由第三方媒体提供，不承诺永久可用。如需协助，请通过原服务联系渠道联系平台。
        </p>
      </section>
    </>
  );
}
