import type { AgencyWithdrawal } from "@geoeval/api-client";
import styles from "../../agency/customer-service.module.css";
import { formatChinaDateTime } from "../../china-time.js";

export const withdrawalStatusLabels: Record<
  AgencyWithdrawal["status"],
  string
> = {
  PENDING_REVIEW: "待审核",
  PAYING: "付款中",
  COMPLETED: "已完成",
  REJECTED: "已驳回",
  PAYMENT_FAILED: "付款失败",
  WITHDRAWN: "已撤回",
};

export function money(fen: string) {
  const amount = BigInt(fen);
  return `¥${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
}

export function yuanToFen(value: string) {
  const match = value.trim().match(/^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("请输入最多两位小数的人民币金额");
  const result =
    BigInt(match[1]!) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  if (result <= 0n) throw new Error("提现金额必须大于零");
  return result.toString();
}

export function WithdrawalFacts({ value }: { value: AgencyWithdrawal }) {
  return (
    <section className={styles.card}>
      <h2>提现申请 #{value.number}</h2>
      <dl className={styles.facts}>
        <div>
          <dt>金额</dt>
          <dd>{money(value.amountFen)}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>{withdrawalStatusLabels[value.status]}</dd>
        </div>
        <div>
          <dt>提交时间</dt>
          <dd>{time(value.submittedAt)}</dd>
        </div>
        <div>
          <dt>收款户名</dt>
          <dd>{value.payout.accountName}</dd>
        </div>
        <div>
          <dt>银行账号</dt>
          <dd>{value.payout.maskedAccountNumber}</dd>
        </div>
        <div>
          <dt>银行及支行</dt>
          <dd>
            {value.payout.bankName} · {value.payout.openingBranch}
          </dd>
        </div>
        <div>
          <dt>联系电话</dt>
          <dd>{value.payout.contactMobile}</dd>
        </div>
        {value.approvedAt && (
          <div>
            <dt>批准时间</dt>
            <dd>{time(value.approvedAt)}</dd>
          </div>
        )}
        {value.resolvedAt && (
          <div>
            <dt>处理完成时间</dt>
            <dd>{time(value.resolvedAt)}</dd>
          </div>
        )}
        {value.resultReason && (
          <div>
            <dt>处理说明</dt>
            <dd>{value.resultReason}</dd>
          </div>
        )}
        {value.bankTransactionReference && (
          <div>
            <dt>银行流水号</dt>
            <dd>{value.bankTransactionReference}</dd>
          </div>
        )}
      </dl>
      {value.status === "PAYING" && (
        <p>转账结果尚未确定时，本申请继续保持付款中并占用金额。</p>
      )}
      {value.status === "WITHDRAWN" && (
        <p>本申请已结束。如需提现，请重新创建一条申请。</p>
      )}
    </section>
  );
}

export function time(value: string) {
  return formatChinaDateTime(value);
}
