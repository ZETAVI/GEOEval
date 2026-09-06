import type { PublishingQuote } from "@geoeval/api-client";
const problems: Record<string, string> = {
  ARTICLE_CHANGED: "文章已更新，请确认当前文章后重新保存发布选择。",
  ARTICLE_UNCONFIRMED:
    "文章尚未确认；原发布选择已保留，可返回优化页面继续编辑和确认。",
  OFFER_UNAVAILABLE: "部分套餐或媒体已不可用，请调整选择后重新保存。",
  TOTAL_OUT_OF_RANGE: "数量或积分总额超出支持范围，请减少数量。",
};
export function QuoteSummary({
  quote,
  balance,
  dirty,
}: {
  quote: PublishingQuote | null;
  balance: number;
  dirty: boolean;
}) {
  return (
    <section
      className="commerce-editor publishing-quote"
      aria-label="已保存方案报价"
    >
      <h2>已保存方案报价</h2>
      {quote ? (
        <>
          <p>
            {quote.mode === "RANDOM"
              ? `随机套餐 · ${quote.packageName ?? "已不可用套餐"}`
              : "精确发布 · 按所选媒体安排"}
          </p>
          {quote.mode === "RANDOM" ? (
            <p>
              媒体范围：
              {quote.scope.map((item) => item.displayName).join("、") ||
                "暂无可用范围"}
              。不指定单个平台或账号。
            </p>
          ) : (
            <ul className="point-history">
              {quote.lines.map((line) => (
                <li key={line.platformId}>
                  <strong>{line.displayName}</strong>
                  <span>
                    {line.quantity} 篇 ×{" "}
                    {line.unitPoints?.toLocaleString() ?? "—"} 积分
                  </span>
                  <span>
                    {line.totalPoints?.toLocaleString() ?? "—"} 积分
                    {!line.available && " · 已不可用"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="publishing-totals">
            <span>
              发布数量<strong>{quote.quantity.toLocaleString()} 篇</strong>
            </span>
            <span>
              需要积分
              <strong>
                {quote.totalPoints?.toLocaleString() ?? "暂无法报价"}
              </strong>
            </span>
            <span>
              可用余额<strong>{balance.toLocaleString()}</strong>
            </span>
            <span>
              积分差额
              <strong>{quote.shortfall?.toLocaleString() ?? "—"}</strong>
            </span>
          </div>
          {!!quote.shortfall && (
            <p>
              还差 {quote.shortfall.toLocaleString()} 积分，按 10
              积分/元约需充值 {quote.suggestedRechargeYuan}{" "}
              元。在线充值尚未接入。
            </p>
          )}
          {quote.problems.map((problem) => (
            <p className="form-error" key={problem}>
              {problems[problem] ?? "请重新核对方案"}
            </p>
          ))}
          {dirty && (
            <p className="commerce-notice">
              上方有未保存修改；此处仍是已保存方案的报价。
            </p>
          )}
          <p className="commerce-muted">
            基于文章版本 {quote.articleRevision} · 选择版本{" "}
            {quote.selectionRevision}
            。报价不保留价格或媒体名额；购买前仍须复核并明确确认。
          </p>
        </>
      ) : (
        <p>
          明确保存发布选择后，在这里查看服务端报价。当前可用{" "}
          {balance.toLocaleString()} 积分。
        </p>
      )}
      <button className="primary-button" disabled>
        提交购买（下一步接入）
      </button>
      <p>
        <a href="/account">查看积分与流水 →</a>
      </p>
    </section>
  );
}
