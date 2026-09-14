"use client";
import { useCallback, useEffect, useRef, useState } from "react";
/** Private, request-scoped data: refresh and invalidate on focus/bfcache restore. */
export function useAgencyRead<T>(scope: string, load: () => Promise<T>) {
  const generation = useRef(0);
  const [state, setState] = useState<{
    scope: string;
    data?: T;
    error?: string;
  }>({ scope });
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setState({ scope });
    try {
      const data = await load();
      if (current === generation.current) setState({ scope, data });
    } catch (error) {
      if (current === generation.current)
        setState({
          scope,
          error: error instanceof Error ? error.message : "资料暂时无法读取",
        });
    }
  }, [scope, load]);
  useEffect(() => {
    void refresh();
    const focus = () => {
      void refresh();
    };
    const visibility = () => {
      if (document.visibilityState === "visible") void refresh();
      else {
        ++generation.current;
        setState({ scope });
      }
    };
    window.addEventListener("focus", focus);
    window.addEventListener("pageshow", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      ++generation.current;
      window.removeEventListener("focus", focus);
      window.removeEventListener("pageshow", focus);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [refresh, scope]);
  return {
    data: state.scope === scope ? state.data : undefined,
    error: state.scope === scope ? state.error : undefined,
    refresh,
  };
}
