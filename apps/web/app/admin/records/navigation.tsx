export function BusinessRecordsNavigation({
  active,
}: {
  active: "points" | "recharges" | "orders" | "support";
}) {
  return (
    <nav className="commerce-actions" aria-label="业务记录视图">
      {[
        ["points", "积分流水", "/admin/records"],
        ["recharges", "充值记录", "/admin/recharges"],
        ["orders", "发布订单", "/admin/delivery"],
        ["support", "客服工单", "/admin/support"],
      ].map(([key, label, href]) => (
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
