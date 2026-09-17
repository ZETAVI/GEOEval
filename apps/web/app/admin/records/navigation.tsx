export function BusinessRecordsNavigation({
  active,
  withdrawalEnabled = false,
}: {
  active:
    | "points"
    | "recharges"
    | "invoices"
    | "orders"
    | "support"
    | "commissions"
    | "withdrawals";
  withdrawalEnabled?: boolean;
}) {
  const items = [
    ["points", "积分流水", "/admin/records"],
    ["recharges", "充值记录", "/admin/recharges"],
    ["invoices", "开票管理", "/admin/invoices"],
    ["orders", "发布订单", "/admin/delivery"],
    ["support", "客服工单", "/admin/support"],
    ["commissions", "佣金明细", "/admin/commissions"],
    ...(withdrawalEnabled || active === "withdrawals"
      ? [["withdrawals", "提现记录", "/admin/withdrawals"]]
      : []),
  ] as const;
  return (
    <nav className="commerce-actions" aria-label="业务记录视图">
      {items.map(([key, label, href]) => (
        <a
          key={key}
          className={key === active ? "primary-button" : "secondary-button"}
          href={href}
          aria-current={key === active ? "page" : undefined}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
