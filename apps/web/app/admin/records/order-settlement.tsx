"use client";
import { useEffect, useState } from "react";
import {
  getAdminOrderSettlement,
  type AdminOrderSettlement,
} from "@geoeval/api-client";
import { formatChinaDateTime } from "../../china-time.js";
import { formatPoints } from "../../point-format.js";
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
export function settlementExplanation(value: AdminOrderSettlement) {
  if (value.settledAt) return "结算已完成";
  if (!value.endedAt) return "等待订单结束";
  if (!value.windowElapsed) return "等待订单结束满 72 小时";
  if (value.hasOpenIssue) return "等待关联工单处理完成";
  return "已满足业务条件，尚无结算记录；如持续未完成，请核查系统执行情况。";
}
export function AdminOrderSettlementPanel({
  orderId,
  actorId,
  revision,
}: {
  orderId: string;
  actorId: string;
  revision: number;
}) {
  const [value, setValue] = useState<AdminOrderSettlement>(),
    [error, setError] = useState("");
  useEffect(() => {
    let generation = 0;
    let request: AbortController | undefined;
    const refresh = async () => {
      const n = ++generation;
      request?.abort();
      request = new AbortController();
      setValue(undefined);
      setError("");
      try {
        const next = await getAdminOrderSettlement(
          base,
          actorId,
          orderId,
          request.signal,
        );
        if (n === generation) setValue(next);
      } catch (e) {
        if (n === generation)
          setError(e instanceof Error ? e.message : "无法读取结算信息");
      }
    };
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
      else {
        ++generation;
        request?.abort();
        setValue(undefined);
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      ++generation;
      request?.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [orderId, actorId, revision]);
  if (error) return <p role="alert">{error}</p>;
  if (!value) return <p role="status">正在读取结算依据…</p>;
  return <OrderSettlementDetails value={value} />;
}
export function OrderSettlementDetails({
  value,
}: {
  value: AdminOrderSettlement;
}) {
  const time = (s: string | null) => (s ? formatChinaDateTime(s) : "—");
  return (
    <section className="commerce-card">
      <h2>订单结算</h2>
      <p>{settlementExplanation(value)}</p>
      <p>
        首次结束：{time(value.endedAt)} · 售后截止：{time(value.appealUntil)}
      </p>
      <p>
        约定退回 {formatPoints(value.agreedPoints)} · 实际退回{" "}
        {value.returnedPoints === null
          ? "尚未发生"
          : formatPoints(value.returnedPoints)}
      </p>
      <p>
        处理中工单：{value.hasOpenIssue ? "有" : "无"} · 结算时间：
        {time(value.settledAt)}
      </p>
      <div className="commerce-actions">
        <a
          className="secondary-button"
          href={`/admin/records?referenceId=${value.orderId}`}
        >
          查看本单积分流水
        </a>
        <a
          className="secondary-button"
          href={`/admin/support?orderId=${value.orderId}`}
        >
          查看关联工单
        </a>
        <a
          className="secondary-button"
          href={`/admin/records?accountId=${value.accountId}`}
        >
          查看客户积分流水
        </a>
      </div>
    </section>
  );
}
