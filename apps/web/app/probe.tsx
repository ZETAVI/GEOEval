"use client";

import {
  createFoundationRecord,
  getFoundationRecord,
  type FoundationRecord,
} from "@geoeval/api-client";
import { useEffect, useRef, useState } from "react";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function FoundationProbe() {
  const [record, setRecord] = useState<FoundationRecord>();
  const [message, setMessage] = useState("尚未创建验证记录");
  const [busy, setBusy] = useState(false);
  const source = useRef<EventSource | undefined>(undefined);

  useEffect(() => () => source.current?.close(), []);

  async function refresh(id: string) {
    const durable = await getFoundationRecord(apiBaseUrl, id);
    setRecord(durable);
    setMessage(
      durable.status === "PROCESSED"
        ? "已从持久状态确认任务完成"
        : "已读取持久状态，等待后台处理",
    );
  }

  function connect(id: string) {
    source.current?.close();
    const nextSource = new EventSource(
      `${apiBaseUrl}/foundation/records/${id}/events`,
    );
    nextSource.addEventListener("refresh", () => void refresh(id));
    nextSource.onerror = () => setMessage("实时连接中断，可通过持久状态恢复");
    source.current = nextSource;
  }

  async function create() {
    setBusy(true);
    setMessage("正在提交事务与后台任务…");
    try {
      const created = await createFoundationRecord(
        apiBaseUrl,
        `browser-probe-${new Date().toISOString()}`,
      );
      setRecord(created);
      setMessage("事务已提交，等待后台任务");
      connect(created.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  async function simulateReconnect() {
    if (!record) return;
    source.current?.close();
    setMessage("已主动断开实时连接，正在通过普通读取恢复…");
    await new Promise((resolve) => setTimeout(resolve, 750));
    await refresh(record.id);
    connect(record.id);
  }

  return (
    <section className="probe" aria-live="polite">
      <div className="actions">
        <button type="button" onClick={() => void create()} disabled={busy}>
          {busy ? "提交中…" : "创建验证记录"}
        </button>
        <button
          className="secondary"
          type="button"
          onClick={() => void simulateReconnect()}
          disabled={!record}
        >
          模拟断线并恢复
        </button>
      </div>
      <p className="message">{message}</p>
      <dl>
        <div>
          <dt>持久状态</dt>
          <dd>{record?.status ?? "—"}</dd>
        </div>
        <div>
          <dt>业务效果数</dt>
          <dd>{record?.effects.length ?? 0}</dd>
        </div>
        <div>
          <dt>关联标识</dt>
          <dd className="mono">{record?.correlationId ?? "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
