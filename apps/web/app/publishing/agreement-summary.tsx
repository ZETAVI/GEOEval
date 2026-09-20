import type { PurchasedTerms } from "@geoeval/api-client";
import { formatPoints } from "../point-format.js";
export function AgreementSummary({ terms }: { terms: PurchasedTerms }) {
  return (
    <section className="commerce-editor" aria-label="购买服务约定">
      <h2>
        {terms.mode === "RANDOM"
          ? `随机套餐 · ${terms.packageName}`
          : "精确媒体发布"}
      </h2>
      {terms.mode === "RANDOM" ? (
        <p>
          媒体范围：{terms.scope.map((s) => s.displayName).join("、")}
          。在约定范围内安排成功发布数量，不指定单个平台或账号。
        </p>
      ) : (
        <ul className="point-history purchased-media">
          {terms.lines.map((l) => (
            <li key={l.platformId}>
              <strong>{l.displayName}</strong>
              <span>
                {l.quantity} 篇 × {formatPoints(l.unitPoints)} ={" "}
                {formatPoints(l.totalPoints)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="publishing-totals">
        <span>
          发布数量<strong>{terms.quantity} 篇</strong>
        </span>
        <span>
          购买积分<strong>{formatPoints(terms.totalPoints)}</strong>
        </span>
      </div>
    </section>
  );
}
