import styles from "../../agency/customer-service.module.css";
import type { Commission } from "@geoeval/api-client";
import { formatChinaDateTime } from "../../china-time.js";
import { formatPoints } from "../../point-format.js";
export function commissionMoney(fen: string) {
  const n = BigInt(fen);
  return `¥${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
}
export function CommissionFacts({
  record: r,
  admin = false,
}: {
  record: Commission;
  admin?: boolean;
}) {
  return (
    <section className={styles.card}>
      <h2>
        订单 #{r.number} · {r.title}
      </h2>
      <dl className={styles.facts}>
        {admin && (
          <div>
            <dt>代理商账号</dt>
            <dd>
              <a href={`/admin/commissions?agentId=${r.agentId}`}>
                {r.agentId}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt>下单时间</dt>
          <dd>{formatChinaDateTime(r.createdAt)}</dd>
        </div>
        <div>
          <dt>佣金</dt>
          <dd>
            {commissionMoney(r.amountFen)} ·{" "}
            {r.state === "BOOKED" ? "已入账" : "预计"}
          </dd>
        </div>
        <div>
          <dt>下单费率</dt>
          <dd>{r.rateBps / 100}%</dd>
        </div>
        <div>
          <dt>原消费</dt>
          <dd>
            实付 {formatPoints(r.originalFundedPoints)} / 赠送{" "}
            {formatPoints(r.originalGrantedPoints)}
          </dd>
        </div>
        <div>
          <dt>{r.returnConfirmed ? "实际退回" : "约定退回"}</dt>
          <dd>
            实付 {formatPoints(r.returnFundedPoints)} / 赠送{" "}
            {formatPoints(r.returnGrantedPoints)}
          </dd>
        </div>
        <div>
          <dt>计佣消费</dt>
          <dd>{formatPoints(r.eligibleFundedPoints)} 实付积分</dd>
        </div>
        <div>
          <dt>订单进度</dt>
          <dd>
            {(
              {
                PENDING_HANDLING: "待处理",
                PUBLISHING: "发布中",
                EXCEPTION_HANDLING: "异常处理中",
                COMPLETED: "已完成",
                CLOSED: "已关闭",
              } as Record<string, string>
            )[r.status] ?? "处理中"}
          </dd>
        </div>
        {r.bookedAt && (
          <div>
            <dt>入账时间</dt>
            <dd>{formatChinaDateTime(r.bookedAt)}</dd>
          </div>
        )}
      </dl>
      {r.state === "PENDING" && (
        <p>
          {r.returnConfirmed
            ? "订单已结算，佣金待入账。"
            : "佣金按最终保留的实付消费计算；订单结束满 72 小时且相关问题处理完后结算。"}
        </p>
      )}
      {admin && (
        <nav className="commerce-actions">
          <a href={`/admin/delivery/${r.orderId}`}>查看订单</a>
          <a href={`/admin/records?referenceId=${r.orderId}`}>积分流水</a>
        </nav>
      )}
    </section>
  );
}
