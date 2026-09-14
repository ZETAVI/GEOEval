"use client";

import styles from "./link-card.module.css";
import { useEffect, useRef, useState } from "react";
import { getOwnAgencyEntry, issueAgencyEntry } from "@geoeval/api-client";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function AgencyLinkCard({
  agentAccountId,
}: {
  agentAccountId?: string;
}) {
  const [href, setHref] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    ++generation.current;
    setHref("");
    setMessage("");
    setBusy(false);
    return () => {
      ++generation.current;
    };
  }, [agentAccountId]);

  async function load() {
    const current = ++generation.current;
    setBusy(true);
    setMessage("");
    setHref("");
    try {
      const result = agentAccountId
        ? await issueAgencyEntry(apiBaseUrl, agentAccountId)
        : await getOwnAgencyEntry(apiBaseUrl);
      if (current !== generation.current) return;
      if (result.entryKey && /^[A-Za-z0-9_-]{32}$/.test(result.entryKey))
        setHref(new URL(`/e/${result.entryKey}`, window.location.origin).href);
      else setMessage("获客入口尚未开通，请联系平台工作人员");
    } catch (error) {
      if (current === generation.current)
        setMessage(error instanceof Error ? error.message : "入口暂时无法读取");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <section className={styles.card}>
      <h2>获客入口</h2>
      <p>
        {agentAccountId
          ? "该入口用于关联这位代理商开发的新客户。"
          : "把链接发送给新客户，客户注册后会自动关联到你名下。"}
      </p>
      <button
        type="button"
        className="secondary-button"
        disabled={busy}
        onClick={() => void load()}
      >
        {busy
          ? "正在读取…"
          : agentAccountId
            ? "开通或查看入口"
            : "查看我的入口"}
      </button>
      {href && (
        <div className={styles.link}>
          <label>
            分享链接
            <input
              readOnly
              value={href}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(href);
                setMessage("链接已复制");
              } catch {
                setMessage("请选中链接后手动复制");
              }
            }}
          >
            复制链接
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
