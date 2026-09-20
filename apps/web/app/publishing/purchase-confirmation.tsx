"use client";
import { submitPublishingOrder } from "@geoeval/api-client";
import { useEffect, useRef, useState } from "react";
import { AgreementSummary } from "./agreement-summary.js";
import { formatPoints } from "../point-format.js";
import {
  purchaseRejected,
  purchaseStorageKey,
  type PurchaseIntent,
} from "./pending-purchase.js";

export function PurchaseConfirmation({
  intent,
  recovering,
  apiBaseUrl,
  onBack,
}: {
  intent: PurchaseIntent;
  recovering: boolean;
  apiBaseUrl: string;
  onBack: (message?: string) => void;
}) {
  const [pending, setPending] = useState(recovering),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    let stored = pending;
    try {
      if (!stored) {
        // Persist the exact accepted intent before a network write; never invent a new key on recovery.
        sessionStorage.setItem(
          purchaseStorageKey(intent.actorAccountId),
          JSON.stringify(intent),
        );
        stored = true;
        setPending(true);
      }
      const order = await submitPublishingOrder(apiBaseUrl, intent.request);
      sessionStorage.removeItem(purchaseStorageKey(intent.actorAccountId));
      window.location.assign(`/orders/${order.id}`);
    } catch (error) {
      if (stored && purchaseRejected(error)) {
        try {
          sessionStorage.removeItem(purchaseStorageKey(intent.actorAccountId));
          onBack(
            error instanceof Error ? error.message : "购买未提交，请重新核对",
          );
          return;
        } catch {
          /* Preserve the original key when browser storage cannot be cleared. */
        }
      }
      setError(
        !stored
          ? "浏览器无法保存核对凭据，本次没有提交购买。请允许会话存储后重试。"
          : `结果尚未确认，请核对或重试同一次请求，不要另行购买。${error instanceof Error ? ` ${error.message}` : ""}`,
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">
            {pending ? "恢复同一次购买" : "最后一步 · 请核对购买内容"}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {pending ? "核对购买结果" : "确认发布购买"}
          </h1>
          <p className="purchase-context">
            {intent.brandName} · {intent.articleTitle} · 文章版本{" "}
            {intent.request.articleRevision}
          </p>
        </div>
      </header>
      <AgreementSummary terms={intent.request.acceptedTerms} />
      <p className="commerce-notice">
        {pending
          ? "已保留原文章版本、报价与请求标识。重试只核对这一笔购买，不会重复扣分。"
          : "确认后将扣除积分并创建待处理订单。若文章、报价或可用服务已变化，本次不会购买，需要重新核对确认。"}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="commerce-actions">
        <button
          className="primary-button"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy
            ? "正在核对购买…"
            : pending
              ? "核对或重试同一次购买"
              : `确认购买并扣除 ${formatPoints(intent.request.acceptedTerms.totalPoints)}`}
        </button>
        {!pending && (
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => onBack()}
          >
            返回调整选择
          </button>
        )}
        <a href="/orders">查看已有订单 →</a>
      </div>
    </>
  );
}
