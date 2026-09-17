"use client";

import {
  applyRechargeInvoice,
  resubmitRechargeInvoice,
  type RechargeInvoice,
  type RechargeInvoiceApplication,
  type RechargeInvoiceSubmission,
  type RechargeSummary,
} from "@geoeval/api-client";
import { useRef, useState } from "react";
import { RecordReference } from "./record-reference.js";
import styles from "./recharge.module.css";

type Draft = {
  buyerType: "INDIVIDUAL" | "ENTERPRISE";
  title: string;
  taxNumber: string;
  email: string;
  confirmed: boolean;
};

export function InvoiceDialog({
  base,
  accountId,
  order,
  invoice,
  defaults,
  onClose,
  onSaved,
}: {
  base: string;
  accountId: string;
  order?: RechargeSummary | undefined;
  invoice?: RechargeInvoice | undefined;
  defaults: RechargeInvoiceSubmission | null;
  onClose: () => void;
  onSaved: (invoice: RechargeInvoice) => void;
}) {
  const source = invoice?.submission ?? defaults;
  const [draft, setDraft] = useState<Draft>({
    buyerType: source?.buyerType ?? "INDIVIDUAL",
    title: source?.title ?? "个人",
    taxNumber: source?.taxNumber ?? "",
    email: source?.email ?? "",
    confirmed: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<{ signature: string; requestId: string } | undefined>(
    undefined,
  );
  const editable = !invoice || invoice.status === "NEEDS_CORRECTION";
  const orderId = invoice?.rechargeOrderId ?? order?.id;
  const amountFen = invoice
    ? BigInt(invoice.amountFen)
    : BigInt(order?.amountYuan ?? 0) * 100n;

  async function submit() {
    if (!orderId || !editable) return;
    const body = {
      buyerType: draft.buyerType,
      title:
        draft.title.trim() || (draft.buyerType === "INDIVIDUAL" ? "个人" : ""),
      ...(draft.buyerType === "ENTERPRISE"
        ? { taxNumber: draft.taxNumber.trim().toUpperCase() }
        : {}),
      email: draft.email.trim(),
      confirmedAccurate: true as const,
    };
    const signature = JSON.stringify(body);
    if (!pending.current || pending.current.signature !== signature)
      pending.current = { signature, requestId: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const value = invoice
        ? await resubmitRechargeInvoice(base, accountId, invoice.id, {
            ...body,
            requestId: pending.current.requestId,
            expectedRevision: invoice.revision,
          })
        : await applyRechargeInvoice(base, accountId, orderId, {
            ...body,
            requestId: pending.current.requestId,
          } as RechargeInvoiceApplication);
      pending.current = undefined;
      onSaved(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "提交失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-dialog-title"
      >
        <header className={styles.dialogHeader}>
          <div>
            <p className="eyebrow">电子普通发票</p>
            <h2 id="invoice-dialog-title">
              {!invoice
                ? "申请发票"
                : invoice.status === "NEEDS_CORRECTION"
                  ? "修改开票资料"
                  : "开票详情"}
            </h2>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>

        <dl className={styles.invoiceFacts}>
          <div>
            <dt>关联订单</dt>
            <dd>
              {orderId && <RecordReference value={orderId} label="订单号" />}
            </dd>
          </div>
          <div>
            <dt>开票金额</dt>
            <dd>{money(amountFen)}</dd>
          </div>
          {order?.paidAt && (
            <div>
              <dt>支付时间</dt>
              <dd>{date(order.paidAt)}</dd>
            </div>
          )}
          <div>
            <dt>发票类型</dt>
            <dd>电子普通发票</dd>
          </div>
        </dl>

        {invoice?.correction && (
          <div className={styles.correctionNotice} role="status">
            <strong>{invoice.correction.summary}</strong>
            {invoice.correction.note && <p>{invoice.correction.note}</p>}
          </div>
        )}

        {editable ? (
          <form
            className={styles.invoiceForm}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <fieldset>
              <legend>抬头类型</legend>
              <div className={styles.buyerTypes}>
                {(["INDIVIDUAL", "ENTERPRISE"] as const).map((type) => (
                  <label key={type}>
                    <input
                      type="radio"
                      name="buyer-type"
                      checked={draft.buyerType === type}
                      onChange={() =>
                        setDraft({
                          ...draft,
                          buyerType: type,
                          title:
                            type === "INDIVIDUAL"
                              ? draft.buyerType === "ENTERPRISE"
                                ? "个人"
                                : draft.title.trim() || "个人"
                              : draft.buyerType === "INDIVIDUAL" &&
                                  draft.title.trim() === "个人"
                                ? ""
                                : draft.title,
                        })
                      }
                    />
                    {type === "INDIVIDUAL" ? "个人" : "企业"}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              {draft.buyerType === "INDIVIDUAL" ? "发票抬头" : "公司名称"}
              <input
                required
                maxLength={160}
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </label>
            {draft.buyerType === "ENTERPRISE" && (
              <label>
                统一社会信用代码 / 纳税人识别号
                <input
                  required
                  maxLength={20}
                  value={draft.taxNumber}
                  onChange={(event) =>
                    setDraft({ ...draft, taxNumber: event.target.value })
                  }
                />
              </label>
            )}
            <label>
              发票接收邮箱
              <input
                required
                type="email"
                maxLength={254}
                value={draft.email}
                onChange={(event) =>
                  setDraft({ ...draft, email: event.target.value })
                }
              />
            </label>
            <label className={styles.confirmation}>
              <input
                type="checkbox"
                checked={draft.confirmed}
                onChange={(event) =>
                  setDraft({ ...draft, confirmed: event.target.checked })
                }
              />
              我确认以上开票信息准确
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className={styles.dialogActions}>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                取消
              </button>
              <button
                className="primary-button"
                disabled={busy || !draft.confirmed}
              >
                {busy ? "正在提交…" : invoice ? "提交修改" : "提交申请"}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.invoiceDetail}>
            <dl>
              <div>
                <dt>申请号</dt>
                <dd># {invoice.number}</dd>
              </div>
              <div>
                <dt>抬头</dt>
                <dd>{invoice.submission.title}</dd>
              </div>
              <div>
                <dt>接收邮箱</dt>
                <dd>
                  {invoice.issued?.maskedEmail ?? invoice.submission.email}
                </dd>
              </div>
              {invoice.issued && (
                <>
                  <div>
                    <dt>发票号码</dt>
                    <dd>{invoice.issued.invoiceNumber}</dd>
                  </div>
                  <div>
                    <dt>开票日期</dt>
                    <dd>{invoice.issued.issuedOn}</dd>
                  </div>
                  <div>
                    <dt>确认发送</dt>
                    <dd>{date(invoice.issued.confirmedSentAt)}</dd>
                  </div>
                </>
              )}
            </dl>
            <p>
              {invoice.status === "ISSUED"
                ? "运营已确认通过外部渠道发送。未收到或信息有疑问，可提交工单。"
                : "申请已提交，运营处理后会更新状态。"}
            </p>
            <div className={styles.dialogActions}>
              {invoice.status === "ISSUED" && (
                <a
                  className="secondary-button"
                  href={`/support?rechargeOrderId=${encodeURIComponent(invoice.rechargeOrderId)}&invoice=${invoice.number}`}
                >
                  提交工单
                </a>
              )}
              <button
                className="primary-button"
                type="button"
                onClick={onClose}
              >
                完成
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function money(fen: bigint) {
  return `¥${fen / 100n}.${(fen % 100n).toString().padStart(2, "0")}`;
}

function date(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
