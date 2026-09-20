"use client";
import {
  getPointBalance,
  getRechargeOptions,
  type RechargeOptions,
  type PointBalance,
} from "@geoeval/api-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CustomerSidebar } from "../customer-sidebar.js";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../session-access.js";
import { NativeCheckout } from "./native-checkout.js";
import { nativeApiSource, rechargeApiBase } from "./native-api-source.js";
import { rechargeReturnKey, readReturnBrand } from "./recharge-intent.js";
import styles from "./recharge.module.css";
import { formatPoints } from "../point-format.js";
export function RechargeDetailWorkspace({ orderId }: { orderId: string }) {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" }),
    [options, setOptions] = useState<RechargeOptions>(),
    [balance, setBalance] = useState<PointBalance>(),
    [message, setMessage] = useState(""),
    [support, setSupport] = useState(false);
  const [creditReady, setCreditReady] = useState(false);
  const accountId = session.kind === "ready" ? session.account.id : null;
  const version = useRef(0),
    request = useRef<AbortController | null>(null),
    balanceVersion = useRef(0),
    balanceRequest = useRef<AbortController | null>(null),
    credited = useRef(false);
  async function load() {
    const token = ++version.current;
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    setSession({ kind: "loading" });
    credited.current = false;
    setCreditReady(false);
    balanceVersion.current++;
    balanceRequest.current?.abort();
    setBalance(undefined);
    setMessage("");
    const timeout = setTimeout(() => {
      abort.abort();
      if (token === version.current)
        setSession({
          kind: "error",
          message: "读取超时，请重新加载充值记录。",
        });
    }, 8000);
    try {
      const next = await loadRoleSession(rechargeApiBase, "TERMINAL_CUSTOMER");
      if (token !== version.current || abort.signal.aborted) return;
      if (next.kind !== "ready") {
        setSession(next);
        return;
      }
      const o = await getRechargeOptions(
        rechargeApiBase,
        next.account.id,
        abort.signal,
      );
      if (token !== version.current || abort.signal.aborted) return;
      setOptions(o);
      setSession(next);
    } catch (e) {
      if (token === version.current && !abort.signal.aborted)
        setSession(
          sessionFailureState(e) ?? {
            kind: "error",
            message: e instanceof Error ? e.message : "充值记录读取失败",
          },
        );
    } finally {
      clearTimeout(timeout);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      version.current++;
      balanceVersion.current++;
      request.current?.abort();
      balanceRequest.current?.abort();
    };
  }, [orderId]);
  const refreshBalance = useCallback(async () => {
    const token = ++balanceVersion.current;
    balanceRequest.current?.abort();
    const abort = new AbortController();
    balanceRequest.current = abort;
    setBalance(undefined);
    setMessage("");
    const timeout = setTimeout(() => abort.abort(), 8000);
    try {
      const b = await getPointBalance(
        rechargeApiBase,
        abort.signal,
        accountId ?? undefined,
      );
      if (token === balanceVersion.current && !abort.signal.aborted)
        setBalance(b);
    } catch {
      if (token === balanceVersion.current)
        setMessage("充值成功状态已保留，余额暂未刷新，请重试。");
    } finally {
      clearTimeout(timeout);
    }
  }, [accountId]);
  const source = useMemo(
    () =>
      nativeApiSource(rechargeApiBase, accountId ?? "", (read) => {
        if (
          read.order.id === orderId &&
          read.order.status === "SUCCESSFUL" &&
          !credited.current
        ) {
          credited.current = true;
          setCreditReady(true);
          void refreshBalance();
        }
      }),
    [accountId, orderId, refreshBalance],
  );
  function leave() {
    let brand: string | null = null;
    try {
      brand = readReturnBrand(
        sessionStorage.getItem(rechargeReturnKey(accountId!, orderId)),
      );
    } catch {
      /* history is always available */
    }
    window.location.assign(
      brand
        ? `/publishing?rechargeOrder=${encodeURIComponent(orderId)}`
        : "/recharges",
    );
  }
  if (session.kind !== "ready" || !options)
    return (
      <WorkspaceAccessPanel
        state={session.kind === "ready" ? { kind: "loading" } : session}
        expectedRole="TERMINAL_CUSTOMER"
        workspaceName="充值详情"
        loadingDetail="读取本人充值状态"
        apiBaseUrl={rechargeApiBase}
        onRetry={() => void load()}
      />
    );
  return (
    <div className="app-shell">
      <CustomerSidebar account={session.account} activePath="/account" />
      <main className="workspace commerce-workspace">
        <nav className={styles.detailNav} aria-label="充值导航">
          <span>账户充值 / 订单详情</span>
          <a href="/recharges" className="secondary-button">
            充值记录
          </a>
        </nav>
        {options.controlled && (
          <p className={styles.controlled}>受控测试环境 · 不会发生真实付款</p>
        )}
        <NativeCheckout
          accountId={session.account.id}
          orderId={orderId}
          source={source}
          onLeave={leave}
          onSupport={() => setSupport(true)}
        />
        {creditReady && (
          <section className={styles.balance} aria-label="最新积分余额">
            <p>
              当前可用积分：
              <strong>
                {balance ? formatPoints(balance.balance) : "正在读取…"}
              </strong>
            </p>
            {message && <p role="alert">{message}</p>}
            <button
              className="secondary-button"
              onClick={() => void refreshBalance()}
            >
              刷新余额
            </button>
            <a href="/account">积分与流水 →</a>
          </section>
        )}
        {support && (
          <section className="commerce-editor" role="status">
            <h2>订单协助</h2>
            <p>
              {options.supportMessage ??
                "在线充值暂未开放。请保留充值单号，通过已有服务渠道联系平台核查。"}
            </p>
            <p>充值单号 {orderId}</p>
            <button
              className="secondary-button"
              onClick={() => setSupport(false)}
            >
              收起
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
