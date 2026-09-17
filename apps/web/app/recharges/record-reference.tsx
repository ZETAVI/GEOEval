"use client";

import { useEffect, useState } from "react";
import styles from "./recharge.module.css";

export function shortReference(value: string) {
  return value.length <= 16 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function RecordReference({
  value,
  label = "编号",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);
  return (
    <span className={styles.reference}>
      <code aria-label={`${label} ${value}`}>{shortReference(value)}</code>
      <button
        type="button"
        aria-label={`复制完整${label}`}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        }}
      >
        {copied ? "已复制" : "复制"}
      </button>
    </span>
  );
}
