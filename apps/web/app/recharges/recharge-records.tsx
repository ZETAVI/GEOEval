"use client";

import {
  listRechargeInvoices,
  listRecharges,
  getRechargeInvoice,
  getRechargeInvoiceDefaults,
  getRechargeInvoiceOrderSummaries,
  type RechargeInvoice,
  type RechargeInvoicePage,
  type RechargeInvoiceSubmission,
  type RechargePage,
  type RechargeSummary,
} from "@geoeval/api-client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatChinaDateTime } from "../china-time.js";
import { formatPoints } from "../point-format.js";
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
  const [summaryUnavailableOrderIds, setSummaryUnavailableOrderIds] = useState<
    ReadonlySet<string>
  >(new Set());
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
        const orderIds = result.items.map((item) => item.id);
        setSummaryUnavailableOrderIds((old) =>
          updateUnavailableOrderIds(cursor ? old : new Set(), orderIds, true),
        );
        try {
          const summaries = await getRechargeInvoiceOrderSummaries(
            base,
            accountId,
            orderIds,
            signal,
          );
          setInvoiceSummaries((old) => [
            ...(cursor ? old : []),
            ...summaries.items,
          ]);
          setSummaryUnavailableOrderIds((old) =>
            updateUnavailableOrderIds(old, orderIds, false),
          );
        } catch {
          if (signal?.aborted) return;
        }
      } else if (!cursor) setSummaryUnavailableOrderIds(new Set());
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
      const selected = !cursor
        ? await resolveRequestedInvoice(requested, result.items, (id) =>
            getRechargeInvoice(base, accountId, id, signal),
          )
        : undefined;
      if (selected) {
        setInvoices((old) => ({
          ...old,
          items: [
            selected,
            ...old.items.filter((item) => item.id !== selected.id),
          ],
        }));
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
  const summaryError = summaryUnavailableOrderIds.size
    ? "部分发票状态读取失败，请刷新后重试"
    : "";

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
            <div className={styles.recordList}>
              {recharges.items.map((order) => {
                const invoice = invoiceByOrder.get(order.id);
                const summaryUnavailable = summaryUnavailableOrderIds.has(
                  order.id,
                );
                return (
                  <article className={styles.recordCard} key={order.id}>
                    <div className={styles.recordAmount}>
                      <span>充值积分</span>
                      <strong>{formatPoints(order.points)}</strong>
                      <p>
                        实付 ¥
                        {order.amountYuan.toLocaleString("zh-CN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className={styles.recordPayment}>
                      <PaymentMethodMark method={order.method} compact />
                      <time>{date(order.createdAt)}</time>
                    </div>
                    <div className={styles.recordState}>
                      <Status tone={rechargeTone(order.status)}>
                        {rechargeLabels[order.status]}
                      </Status>
                      {summaryUnavailable ? (
                        <Status tone="neutral">发票状态待刷新</Status>
                      ) : (
                        invoiceStatus(order, invoice)
                      )}
                    </div>
                    <div className={styles.recordReference}>
                      <span>充值单号</span>
                      <RecordReference value={order.id} label="订单号" />
                    </div>
                    <div className={styles.rowActions}>
                      {order.status === "SUCCESSFUL" &&
                        !invoice &&
                        !summaryUnavailable && (
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
                              ? "查看发票"
                              : "查看申请"}
                        </button>
                      )}
                      <a href={`/recharges/${order.id}`}>订单详情</a>
                    </div>
                  </article>
                );
              })}
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
  return formatChinaDateTime(value);
}

function rechargeTone(
  status: RechargeSummary["status"],
): "good" | "warning" | "neutral" {
  if (status === "SUCCESSFUL") return "good";
  if (status === "PENDING_PAYMENT" || status === "CONFIRMING") return "warning";
  return "neutral";
}

function money(value: string) {
  const fen = BigInt(value);
  return `¥${fen / 100n}.${(fen % 100n).toString().padStart(2, "0")}`;
}

export async function resolveRequestedInvoice(
  requested: string | null,
  currentPage: RechargeInvoice[],
  read: (id: string) => Promise<RechargeInvoice>,
) {
  if (!requested) return undefined;
  return currentPage.find((item) => item.id === requested) ?? read(requested);
}

export function updateUnavailableOrderIds(
  current: ReadonlySet<string>,
  orderIds: string[],
  unavailable: boolean,
) {
  const next = new Set(current);
  for (const orderId of orderIds) {
    if (unavailable) next.add(orderId);
    else next.delete(orderId);
  }
  return next;
}
