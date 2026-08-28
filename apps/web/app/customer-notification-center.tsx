"use client";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectCurrentBrand,
  type Notification,
} from "@geoeval/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function CustomerNotificationCenter({
  accountId,
}: {
  accountId: string | undefined;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!accountId) return;
    const result = await listNotifications(apiBaseUrl, { limit: 10 });
    setItems(result.items);
    setUnreadCount(result.unreadCount);
  }, [accountId]);

  useEffect(() => {
    if (!accountId) return;
    void refresh().catch(() => undefined);
    const events = new EventSource(`${apiBaseUrl}/notifications/events`, {
      withCredentials: true,
    });
    const refreshFromHint = () => void refresh().catch(() => undefined);
    events.addEventListener("refresh", refreshFromHint);
    events.onopen = refreshFromHint;
    const onFocus = () => refreshFromHint();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      events.removeEventListener("refresh", refreshFromHint);
      events.close();
    };
  }, [accountId, refresh]);

  useEffect(() => {
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
    document.title =
      unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount]);

  const newestUnread = useMemo(
    () => items.find((item) => item.readAt === null),
    [items],
  );

  async function openNotification(notification: Notification) {
    setMessage("");
    try {
      if (notification.readAt === null) {
        await markNotificationRead(apiBaseUrl, notification.id);
      }
      await selectCurrentBrand(apiBaseUrl, notification.target.brandId);
      if (notification.target.kind === "EVALUATION_REPORT") {
        window.location.assign(
          `/diagnosis/reports/${notification.target.reportId}?brandId=${notification.target.brandId}`,
        );
      } else {
        window.location.assign("/diagnosis");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暂时无法打开通知");
    }
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead(apiBaseUrl);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请重试");
    }
  }

  return (
    <>
      <div className="notification-entry">
        <button
          type="button"
          className="notification-trigger"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span>通知</span>
          {unreadCount > 0 && <b>{unreadCount > 99 ? "99+" : unreadCount}</b>}
        </button>
        {open && (
          <section className="notification-panel" aria-label="通知中心">
            <header>
              <strong>通知中心</strong>
              {unreadCount > 0 && (
                <button type="button" onClick={() => void markAllRead()}>
                  全部已读
                </button>
              )}
            </header>
            {message && <p className="notification-error">{message}</p>}
            {items.length === 0 ? (
              <p className="notification-empty">暂无通知</p>
            ) : (
              <div className="notification-list">
                {items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={item.readAt ? "read" : "unread"}
                    onClick={() => void openNotification(item)}
                  >
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.summary}</small>
                    </span>
                    <time>{formatTime(item.occurredAt)}</time>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      {newestUnread && !open && (
        <button
          type="button"
          className="notification-prompt"
          onClick={() => void openNotification(newestUnread)}
        >
          <strong>{newestUnread.title}</strong>
          <span>{newestUnread.summary}</span>
        </button>
      )}
    </>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
