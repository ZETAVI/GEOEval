import type { PointAdminChange, PointChange } from "@geoeval/api-client";

export function PointHistoryList({
  items,
  showInternal = false,
}: {
  items: Array<PointChange | PointAdminChange>;
  showInternal?: boolean;
}) {
  if (!items.length)
    return (
      <section className="commerce-empty">
        <h3>还没有积分变动</h3>
        <p>积分发生变化后，这里会保留对应记录。</p>
      </section>
    );
  return (
    <ol className="point-history">
      {items.map((item) => (
        <li key={item.id}>
          <div className="commerce-card-heading">
            <div>
              <strong>
                {item.kind === "PUBLISHING_ORDER" ? "发布服务购买" : "积分调整"}
              </strong>
              <p>{item.reason}</p>
            </div>
            <b
              className={item.amount > 0 ? "point-increase" : "point-decrease"}
            >
              {item.amount > 0 ? "+" : ""}
              {item.amount.toLocaleString()}
            </b>
          </div>
          <p className="commerce-muted">
            {new Date(item.createdAt).toLocaleString()} · 记账后余额{" "}
            {item.balanceAfter.toLocaleString()} · 流水 {item.sequence}
          </p>
          {!showInternal && item.publishingOrderId && (
            <a href={`/orders/${item.publishingOrderId}`}>查看对应订单 →</a>
          )}
          {showInternal && "actorAccountId" in item && (
            <details>
              <summary>内部处理记录</summary>
              <p>操作账号：{item.actorAccountId}</p>
              <p>
                赠送变动 {item.grantedDelta} / 充值变动 {item.fundedDelta}
              </p>
              {item.internalNote && <p>内部备注：{item.internalNote}</p>}
              {item.businessReference && (
                <p>业务关联：{item.businessReference}</p>
              )}
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}
