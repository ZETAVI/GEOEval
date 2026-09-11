"use client";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectCurrentBrand,
} from "@geoeval/api-client";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { NotificationCenterController } from "./notification-center-controller.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function CustomerNotificationCenter({
  accountId,
}: {
  accountId: string | undefined;
}) {
  // A→B→A creates a fresh mounted scope rather than reviving the first A.
  return accountId ? (
    <AccountNotificationCenter key={accountId} accountId={accountId} />
  ) : null;
}

function AccountNotificationCenter({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const controller = useMemo(
    () =>
      new NotificationCenterController(
        accountId,
        {
          list: (request) =>
            listNotifications(apiBaseUrl, { limit: 10 }, request),
          markRead: (id, request) =>
            markNotificationRead(apiBaseUrl, id, request),
          markAllRead: (request) =>
            markAllNotificationsRead(apiBaseUrl, request),
          selectBrand: (id, request) =>
            selectCurrentBrand(apiBaseUrl, id, request),
        },
        (path) => window.location.assign(path),
      ),
    [accountId],
  );
  const { items, unreadCount, refreshing, busy, accessLost, message } =
    useSyncExternalStore(
      controller.subscribe,
      controller.getSnapshot,
      controller.getServerSnapshot,
    );

  useLayoutEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);

  useEffect(() => {
    if (accessLost) return;
    const events = new EventSource(
      `${apiBaseUrl}/notifications/events?expectedAccountId=${encodeURIComponent(accountId)}`,
      {
        withCredentials: true,
      },
    );
    const refreshFromHint = () => void controller.refresh();
    events.addEventListener("refresh", refreshFromHint);
    events.onopen = refreshFromHint;
    // EventSource does not expose HTTP status; the fenced read detects access loss.
    events.onerror = refreshFromHint;
    window.addEventListener("focus", refreshFromHint);
    return () => {
      window.removeEventListener("focus", refreshFromHint);
      events.removeEventListener("refresh", refreshFromHint);
      events.onopen = null;
      events.onerror = null;
      events.close();
    };
  }, [accountId, controller, accessLost]);

  useLayoutEffect(() => {
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
                <button
                  type="button"
                  disabled={busy || accessLost}
                  onClick={() => void controller.markAllRead()}
                >
                  全部已读
                </button>
              )}
            </header>
            {message && (
              <div className="notification-error" role="alert">
                <p>{message}</p>
                <button
                  type="button"
                  disabled={busy || refreshing}
                  onClick={() =>
                    accessLost
                      ? window.location.reload()
                      : void controller.retry()
                  }
                >
                  {accessLost ? "重新载入页面" : "重试"}
                </button>
              </div>
            )}
            {items.length === 0 ? (
              <p className="notification-empty">
                {refreshing
                  ? "正在读取通知…"
                  : accessLost || message
                    ? "通知暂不可用"
                    : "暂无通知"}
              </p>
            ) : (
              <div className="notification-list">
                {items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={item.readAt ? "read" : "unread"}
                    disabled={busy || accessLost}
                    onClick={() => void controller.openNotification(item.id)}
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
          disabled={busy || accessLost}
          onClick={() => {
            setOpen(true);
            void controller.openNotification(newestUnread.id);
          }}
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
