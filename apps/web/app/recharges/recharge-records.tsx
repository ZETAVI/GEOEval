"use client";

import {
  listRechargeInvoices,
  listRecharges,
  getRechargeInvoiceDefaults,
  getRechargeInvoiceOrderSummaries,
  type RechargeInvoice,
  type RechargeInvoicePage,
  type RechargeInvoiceSubmission,
  type RechargePage,
  type RechargeSummary,
} from "@geoeval/api-client";
import { useEffect, useMemo, useRef, useState } from "react";
import { InvoiceDialog } from "./invoice-dialog.js";
import { PaymentMethodMark } from "./payment-method-mark.js";
import { RecordReference } from "./record-reference.js";
import { rechargeLabels } from "./recharge-status.js";
import styles from "./recharge.module.css";

const emptyRecharges: RechargePage = { items: [], nextCursor: null };
const emptyInvoices: RechargeInvoicePage = { items: [], nextCursor: null };

type DialogState =
  | { order: RechargeSummary; invoice?: undefined }
  | { invoice: RechargeInvoice; order?: RechargeSummary };

export function RechargeRecords({
  base,
  accountId,
}: {
  base: string;
  accountId: string;
}) {
  const [tab, setTab] = useState<"recharges" | "invoices">("recharges");
  const [recharges, setRecharges] = useState(emptyRecharges);
  const [invoices, setInvoices] = useState(emptyInvoices);
  const [invoiceSummaries, setInvoiceSummaries] = useState<RechargeInvoice[]>(
    [],
  );
  const [defaults, setDefaults] = useState<RechargeInvoiceSubmission | null>(
    null,
  );
  const [status, setStatus] = useState<RechargeSummary["status"] | "">("");
  const [rechargeBusy, setRechargeBusy] = useState(true);
  const [invoiceBusy, setInvoiceBusy] = useState(true);
  const [rechargeError, setRechargeError] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [dialog, setDialog] = useState<DialogState>();
  const generation = useRef(0);

  async function loadRecharges(
    nextStatus: typeof status,
    cursor?: string,
    signal?: AbortSignal,
  ) {
    setRechargeBusy(true);
    setRechargeError("");
    try {
      const result = await listRecharges(
        base,
        accountId,
        {
          ...(nextStatus ? { status: nextStatus } : {}),
          ...(cursor ? { cursor } : {}),
        },
        signal,
      );
      setRecharges((old) => ({
        items: cursor ? [...old.items, ...result.items] : result.items,
        nextCursor: result.nextCursor,
      }));
      if (!cursor) setInvoiceSummaries([]);
      if (result.items.length) {
        try {
          const summaries = await getRechargeInvoiceOrderSummaries(
            base,
            accountId,
            result.items.map((item) => item.id),
            signal,
          );
          setInvoiceSummaries((old) => [
            ...(cursor ? old : []),
            ...summaries.items,
          ]);
          setSummaryError("");
        } catch (cause) {
          if (!signal?.aborted)
            setSummaryError(
              cause instanceof Error
                ? cause.message
                : "发票状态读取失败，请刷新后重试",
            );
        }
      } else {
        setSummaryError("");
      }
    } catch (cause) {
      if (!signal?.aborted)
        setRechargeError(
          cause instanceof Error ? cause.message : "充值记录读取失败",
        );
    } finally {
      if (!signal?.aborted) setRechargeBusy(false);
    }
  }

  async function loadInvoices(cursor?: number, signal?: AbortSignal) {
    setInvoiceBusy(true);
    setInvoiceError("");
    try {
      const result = await listRechargeInvoices(
        base,
        accountId,
        { ...(cursor ? { cursor } : {}) },
        signal,
      );
      setInvoices((old) => ({
        items: cursor ? [...old.items, ...result.items] : result.items,
        nextCursor: result.nextCursor,
      }));
      const requested = new URLSearchParams(window.location.search).get(
        "invoice",
      );
      const selected = result.items.find((item) => item.id === requested);
      if (!cursor && selected) {
        setDialog({ invoice: selected });
        setTab("invoices");
      }
    } catch (cause) {
      if (!signal?.aborted)
        setInvoiceError(
          cause instanceof Error ? cause.message : "发票记录读取失败",
        );
    } finally {
      if (!signal?.aborted) setInvoiceBusy(false);
    }
  }

  useEffect(() => {
    const current = ++generation.current;
    const abort = new AbortController();
    void loadRecharges("", undefined, abort.signal);
    void loadInvoices(undefined, abort.signal);
    void getRechargeInvoiceDefaults(base, accountId, abort.signal)
      .then((value) => {
        if (current === generation.current) setDefaults(value.submission);
      })
      .catch(() => {
        if (current === generation.current) setDefaults(null);
      });
    return () => {
      ++generation.current;
      abort.abort();
    };
  }, [accountId, base]);

  const invoiceByOrder = useMemo(
    () =>
      new Map(
        invoiceSummaries.map((invoice) => [invoice.rechargeOrderId, invoice]),
      ),
    [invoiceSummaries],
  );

  function saveInvoice(value: RechargeInvoice) {
    setInvoices((old) => ({
      ...old,
      items: [value, ...old.items.filter((item) => item.id !== value.id)].sort(
        (a, b) => b.number - a.number,
      ),
    }));
    setDefaults(value.submission);
    setInvoiceSummaries((old) => [
      value,
      ...old.filter((item) => item.rechargeOrderId !== value.rechargeOrderId),
    ]);
    openInvoice(value);
  }

  function openInvoice(value: RechargeInvoice) {
    const order = recharges.items.find(
      (item) => item.id === value.rechargeOrderId,
    );
    setDialog({ invoice: value, ...(order ? { order } : {}) });
  }

  return (
    <section className={styles.history} aria-label="充值与发票记录">
      <div className={styles.recordTabs} role="tablist" aria-label="记录类型">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "recharges"}
          onClick={() => setTab("recharges")}
        >
          充值记录
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "invoices"}
          onClick={() => setTab("invoices")}
        >
          发票记录
        </button>
      </div>

      {tab === "recharges" ? (
        <div role="tabpanel">
          <div className={styles.historyHeading}>
            <div>
              <h2>充值记录</h2>
              <p className="commerce-muted">在已成功充值的订单上申请发票。</p>
            </div>
            <label>
              订单状态
              <select
                value={status}
                onChange={(event) => {
                  const next = event.target.value as typeof status;
                  setStatus(next);
                  setRecharges(emptyRecharges);
                  void loadRecharges(next);
                }}
              >
                <option value="">全部状态</option>
                {Object.entries(rechargeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              disabled={rechargeBusy}
              onClick={() => void loadRecharges(status)}
            >
              刷新
            </button>
          </div>
          {rechargeError && (
            <p className="form-error" role="alert">
              {rechargeError}
            </p>
          )}
          {summaryError && (
            <p className="form-error" role="alert">
              {summaryError}
            </p>
          )}
          {rechargeBusy && !recharges.items.length ? (
            <p role="status">正在查询充值记录…</p>
          ) : !recharges.items.length ? (
            <p>当前没有充值记录。</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.recordsTable}>
                <thead>
                  <tr>
                    <th>充值时间</th>
                    <th>充值额度</th>
                    <th>实付人民币</th>
                    <th>支付方式</th>
                    <th>订单号</th>
                    <th>支付状态</th>
                    <th>发票状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {recharges.items.map((order) => {
                    const invoice = invoiceByOrder.get(order.id);
                    return (
                      <tr key={order.id}>
                        <td>{date(order.createdAt)}</td>
                        <td>{order.points.toLocaleString()} 积分</td>
                        <td>¥{order.amountYuan.toLocaleString()}</td>
                        <td>
                          <PaymentMethodMark method={order.method} compact />
                        </td>
                        <td>
                          <RecordReference value={order.id} label="订单号" />
                        </td>
                        <td>
                          <Status
                            tone={
                              order.status === "SUCCESSFUL" ? "good" : "neutral"
                            }
                          >
                            {rechargeLabels[order.status]}
                          </Status>
                        </td>
                        <td>
                          {summaryError ? (
                            <Status tone="neutral">待刷新</Status>
                          ) : (
                            invoiceStatus(order, invoice)
                          )}
                        </td>
                        <td className={styles.rowActions}>
                          {order.status === "SUCCESSFUL" &&
                            !invoice &&
                            !summaryError && (
                              <button
                                type="button"
                                onClick={() => setDialog({ order })}
                              >
                                申请发票
                              </button>
                            )}
                          {invoice && (
                            <button
                              type="button"
                              onClick={() => setDialog({ order, invoice })}
                            >
                              {invoice.status === "NEEDS_CORRECTION"
                                ? "修改资料"
                                : invoice.status === "ISSUED"
                                  ? "查看详情"
                                  : "查看申请"}
                            </button>
                          )}
                          <a href={`/recharges/${order.id}`}>订单详情</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {recharges.nextCursor && (
            <button
              className="secondary-button"
              disabled={rechargeBusy}
              onClick={() =>
                void loadRecharges(status, recharges.nextCursor ?? undefined)
              }
            >
              加载更多
            </button>
          )}
        </div>
      ) : (
        <div role="tabpanel">
          <div className={styles.historyHeading}>
            <div>
              <h2>发票记录</h2>
              <p className="commerce-muted">查看已主动提交的开票申请。</p>
            </div>
            <button
              className="secondary-button"
              disabled={invoiceBusy}
              onClick={() => void loadInvoices()}
            >
              刷新
            </button>
          </div>
          {invoiceError && (
            <p className="form-error" role="alert">
              {invoiceError}
            </p>
          )}
          {invoiceBusy && !invoices.items.length ? (
            <p role="status">正在查询发票记录…</p>
          ) : !invoices.items.length ? (
            <p>尚未提交开票申请。</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.recordsTable}>
                <thead>
                  <tr>
                    <th>申请号</th>
                    <th>发票类型</th>
                    <th>抬头类型</th>
                    <th>抬头</th>
                    <th>金额</th>
                    <th>关联订单</th>
                    <th>接收邮箱</th>
                    <th>提交时间</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.items.map((invoice) => (
                    <tr key={invoice.id}>
                      <td># {invoice.number}</td>
                      <td>电子普通发票</td>
                      <td>
                        {invoice.submission.buyerType === "ENTERPRISE"
                          ? "企业"
                          : "个人"}
                      </td>
                      <td>{invoice.submission.title}</td>
                      <td>{money(invoice.amountFen)}</td>
                      <td>
                        <RecordReference
                          value={invoice.rechargeOrderId}
                          label="订单号"
                        />
                      </td>
                      <td>{invoice.submission.email}</td>
                      <td>{date(invoice.submittedAt)}</td>
                      <td>{invoiceStatus(undefined, invoice)}</td>
                      <td className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => openInvoice(invoice)}
                        >
                          {invoice.status === "NEEDS_CORRECTION"
                            ? "修改资料"
                            : "查看详情"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {invoices.nextCursor && (
            <button
              className="secondary-button"
              disabled={invoiceBusy}
              onClick={() =>
                void loadInvoices(invoices.nextCursor ?? undefined)
              }
            >
              加载更多
            </button>
          )}
        </div>
      )}

      {dialog && (
        <InvoiceDialog
          base={base}
          accountId={accountId}
          order={dialog.order}
          invoice={dialog.invoice}
          defaults={defaults}
          onClose={() => setDialog(undefined)}
          onSaved={saveInvoice}
        />
      )}
    </section>
  );
}

function Status({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "good" | "warning" | "neutral";
}) {
  return <span className={`${styles.status} ${styles[tone]}`}>{children}</span>;
}

function invoiceStatus(
  order: RechargeSummary | undefined,
  invoice: RechargeInvoice | undefined,
) {
  if (!invoice)
    return (
      <Status tone={order?.status === "SUCCESSFUL" ? "good" : "neutral"}>
        {order?.status === "SUCCESSFUL" ? "可申请" : "不可申请"}
      </Status>
    );
  if (invoice.status === "NEEDS_CORRECTION")
    return <Status tone="warning">需补正</Status>;
  if (invoice.status === "ISSUED") return <Status tone="good">已开票</Status>;
  return <Status tone="neutral">处理中</Status>;
}

function date(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function money(value: string) {
  const fen = BigInt(value);
  return `¥${fen / 100n}.${(fen % 100n).toString().padStart(2, "0")}`;
}
