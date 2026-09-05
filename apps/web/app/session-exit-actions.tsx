"use client";

import { logout, logoutAllSessions } from "@geoeval/api-client";

export function SessionExitActions({ apiBaseUrl }: { apiBaseUrl: string }) {
  function exitCurrent() {
    void logout(apiBaseUrl).then(() => window.location.assign("/"));
  }

  function exitAll() {
    if (!window.confirm("确定要退出当前账号的全部设备吗？")) return;
    void logoutAllSessions(apiBaseUrl).then(() => window.location.assign("/"));
  }

  return (
    <footer className="session-exit-actions">
      <button type="button" onClick={exitCurrent}>
        退出
      </button>
      <button type="button" className="all-sessions" onClick={exitAll}>
        退出全部设备
      </button>
    </footer>
  );
}
