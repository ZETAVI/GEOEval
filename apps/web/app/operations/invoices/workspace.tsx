"use client";

import {
  commandAdminRechargeInvoice,
  commandOperationsRechargeInvoice,
  getAdminRechargeInvoice,
  getOperationsRechargeInvoice,
  listAdminAccounts,
  listAdminRechargeInvoices,
  listOperationsRechargeInvoices,
  type AccountSummary,
  type InternalRechargeInvoice,
  type InternalRechargeInvoicePage,
  type InternalRechargeInvoiceSummary,
  type RechargeInvoiceCommand,
} from "@geoeval/api-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminSidebar } from "../../admin/admin-sidebar.js";
import { BusinessRecordsNavigation } from "../../admin/records/navigation.js";
import { RecordReference } from "../../recharges/record-reference.js";
import { formatChinaDateTime } from "../../china-time.js";
import { SessionExitActions } from "../../session-exit-actions.js";
import {
  loadRoleSession,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../../session-access.js";
import styles from "./invoice-operations.module.css";

const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function InvoiceOperationsWorkspace({
  role,
}: {
  role: "OPERATIONS" | "ADMINISTRATOR";
}) {
  const admin = role === "ADMINISTRATOR";
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [items, setItems] = useState<InternalRechargeInvoiceSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [scope, setScope] = useState<"UNASSIGNED" | "MINE">("UNASSIGNED");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<InternalRechargeInvoice>();
  const [operations, setOperations] = useState<AccountSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [claimingId, setClaimingId] = useState("");
  const [error, setError] = useState("");
  const request = useRef<AbortController | undefined>(undefined);

  const load = useCallback(
    async (cursor?: number) => {
      request.current?.abort();
      const abort = new AbortController();
      request.current = abort;
      setBusy(true);
      setError("");
      try {
        const next = await loadRoleSession(base, role);
        if (abort.signal.aborted) return;
        setSession(next);
        if (next.kind !== "ready") {
          setItems([]);
          setNextCursor(null);
          return;
        }
        const page = admin
          ? await listAdminRechargeInvoices(
              base,
              next.account.id,
              {
                ...(status
                  ? {
                      status:
                        status as InternalRechargeInvoiceSummary["status"],
                    }
                  : {}),
                ...(cursor ? { cursor } : {}),
              },
              abort.signal,
            )
          : await listOperationsRechargeInvoices(
              base,
              next.account.id,
              {
                scope,
                ...(status
                  ? {
                      status:
                        status as InternalRechargeInvoiceSummary["status"],
                    }
                  : {}),
                ...(cursor ? { cursor } : {}),
              },
              abort.signal,
            );
        if (!abort.signal.aborted) {
          setItems((old) =>
            mergeInternalInvoicePage(old, page, cursor !== undefined),
          );
          setNextCursor(page.nextCursor);
        }
        if (admin && cursor === undefined) {
          const accounts = await listAllOperations(abort.signal);
          if (!abort.signal.aborted) setOperations(accounts);
        }
      } catch (cause) {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : "开票任务读取失败");
      } finally {
        if (!abort.signal.aborted) setBusy(false);
      }
    },
    [admin, role, scope, status],
  );

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  async function open(item: InternalRechargeInvoiceSummary) {
    if (session.kind !== "ready") return;
    setError("");
    try {
      const detail = admin
        ? await getAdminRechargeInvoice(base, session.account.id, item.id)
        : await getOperationsRechargeInvoice(base, session.account.id, item.id);
      setSelected(detail);
    } catch (cause) {
      setSelected(undefined);
      setError(cause instanceof Error ? cause.message : "开票详情读取失败");
    }
  }

  async function claim(item: InternalRechargeInvoiceSummary) {
    if (session.kind !== "ready" || admin) return;
    setClaimingId(item.id);
    setError("");
    try {
      const detail = await commandOperationsRechargeInvoice(
        base,
        session.account.id,
        item.id,
        {
          action: "CLAIM",
          requestId: crypto.randomUUID(),
          expectedRevision: item.revision,
        },
      );
      setSelected(detail);
      void load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "领取失败，请刷新后重试",
      );
    } finally {
      setClaimingId("");
    }
  }

  if (session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole={role}
        workspaceName="发票处理"
        loadingDetail="核验角色并读取开票任务"
        apiBaseUrl={base}
        onRetry={() => void load()}
      />
    );

  return (
    <div className="app-shell admin-app-shell">
      {admin ? (
        <AdminSidebar account={session.account} active="invoices" />
      ) : (
        <OperationsSidebar account={session.account} active="invoices" />
      )}
      <main className={`workspace commerce-workspace ${styles.workspace}`}>
        <header className="workspace-header">
          <div>
            <p className="eyebrow">充值订单 · 人工开票</p>
            <h1>{admin ? "开票管理" : "发票处理"}</h1>
            <p>
              {admin
                ? "查看全部申请，分配、改派、收回或显式接管。"
                : "领取申请，核对资料，并在外部开具和发送后回填。"}
            </p>
          </div>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void load()}
          >
            刷新
          </button>
        </header>
        {admin && <BusinessRecordsNavigation active="invoices" />}
        <div className={styles.toolbar}>
          {!admin && (
            <>
              <button
                className={
                  scope === "UNASSIGNED" ? "primary-button" : "secondary-button"
                }
                onClick={() => setScope("UNASSIGNED")}
              >
                待领取
              </button>
              <button
                className={
                  scope === "MINE" ? "primary-button" : "secondary-button"
                }
                onClick={() => setScope("MINE")}
              >
                我负责
              </button>
            </>
          )}
          <label>
            状态{" "}
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">全部</option>
              <option value="PROCESSING">处理中</option>
              <option value="NEEDS_CORRECTION">需补正</option>
              <option value="ISSUED">已开票</option>
            </select>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {busy && !items.length ? (
          <p role="status">正在读取开票任务…</p>
        ) : !items.length ? (
          <p>当前范围内没有开票任务。</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>申请号</th>
                  <th>客户</th>
                  <th>抬头类型</th>
                  <th>金额</th>
                  <th>订单号</th>
                  <th>负责人</th>
                  <th>状态</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td># {item.number}</td>
                    <td>{item.customerReference}</td>
                    <td>{item.buyerType === "ENTERPRISE" ? "企业" : "个人"}</td>
                    <td>{money(item.amountFen)}</td>
                    <td>
                      <RecordReference
                        value={item.rechargeOrderId}
                        label="订单号"
                      />
                    </td>
                    <td>{item.assignee?.mobile ?? "待领取"}</td>
                    <td>
                      <InvoiceBadge status={item.status} />
                    </td>
                    <td>{date(item.submittedAt)}</td>
                    <td>
                      {!admin && !item.assignee ? (
                        <button
                          disabled={claimingId === item.id}
                          onClick={() => void claim(item)}
                        >
                          {claimingId === item.id ? "正在领取…" : "领取并处理"}
                        </button>
                      ) : (
                        <button onClick={() => void open(item)}>
                          查看处理
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {nextCursor && (
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void load(nextCursor)}
          >
            加载更多
          </button>
        )}
        {selected && (
          <InvoicePanel
            role={role}
            accountId={session.account.id}
            value={selected}
            operations={operations}
            onClose={() => setSelected(undefined)}
            onChanged={(value) => {
              setSelected(value);
              void load();
            }}
          />
        )}
      </main>
    </div>
  );
}

function InvoicePanel({
  role,
  accountId,
  value,
  operations,
  onClose,
  onChanged,
}: {
  role: "OPERATIONS" | "ADMINISTRATOR";
  accountId: string;
  value: InternalRechargeInvoice;
  operations: AccountSummary[];
  onClose: () => void;
  onChanged: (value: InternalRechargeInvoice) => void;
}) {
  const admin = role === "ADMINISTRATOR";
  const mine = value.assignee?.accountId === accountId;
  const [mode, setMode] = useState<"" | "correction" | "complete" | "assign">(
    "",
  );
  const [reasonCode, setReasonCode] = useState("NAME_TAX_MISMATCH");
  const [note, setNote] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [assignee, setAssignee] = useState(operations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function command(
    input: Omit<RechargeInvoiceCommand, "requestId" | "expectedRevision">,
  ) {
    setBusy(true);
    setError("");
    try {
      const body = {
        ...input,
        requestId: crypto.randomUUID(),
        expectedRevision: value.revision,
      } as RechargeInvoiceCommand;
      const result = admin
        ? await commandAdminRechargeInvoice(base, accountId, value.id, body)
        : await commandOperationsRechargeInvoice(
            base,
            accountId,
            value.id,
            body,
          );
      const detail = admin
        ? await getAdminRechargeInvoice(base, accountId, value.id)
        : result;
      onChanged(detail);
      setMode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "处理失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-task-title"
      >
        <header className={styles.panelHeader}>
          <div>
            <p className="eyebrow">申请 #{value.number}</p>
            <h2 id="invoice-task-title">开票处理</h2>
          </div>
          <button aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>
        <dl className={styles.facts}>
          <div>
            <dt>客户</dt>
            <dd>{value.customerMobile}</dd>
          </div>
          <div>
            <dt>金额</dt>
            <dd>{money(value.amountFen)}</dd>
          </div>
          <div>
            <dt>抬头类型</dt>
            <dd>
              {value.submission.buyerType === "ENTERPRISE" ? "企业" : "个人"}
            </dd>
          </div>
          <div>
            <dt>抬头</dt>
            <dd>{value.submission.title}</dd>
          </div>
          {value.submission.taxNumber && (
            <div>
              <dt>税号</dt>
              <dd>{value.submission.taxNumber}</dd>
            </div>
          )}
          <div>
            <dt>接收邮箱</dt>
            <dd>{value.submission.email}</dd>
          </div>
          <div>
            <dt>关联订单</dt>
            <dd>
              <RecordReference value={value.rechargeOrderId} label="订单号" />
            </dd>
          </div>
          <div>
            <dt>负责人</dt>
            <dd>{value.assignee?.mobile ?? "待领取"}</dd>
          </div>
        </dl>
        {value.correction && (
          <p className="commerce-notice">
            {value.correction.summary}
            {value.correction.note ? `：${value.correction.note}` : ""}
          </p>
        )}
        {value.issued && (
          <p className="commerce-notice">
            已开票：{value.issued.invoiceNumber} · {value.issued.issuedOn} ·
            已确认外部发送
          </p>
        )}
        {value.status !== "ISSUED" && (
          <div className={styles.actions}>
            {admin && (
              <button
                className="secondary-button"
                onClick={() => setMode("assign")}
              >
                分配 / 改派
              </button>
            )}
            {admin && value.assignee && (
              <button
                className="secondary-button"
                onClick={() => void command({ action: "RETURN_TO_POOL" })}
              >
                收回待领取
              </button>
            )}
            {admin && !mine && (
              <button
                className="secondary-button"
                onClick={() => void command({ action: "TAKE_OVER" })}
              >
                接管
              </button>
            )}
            {mine && value.status === "PROCESSING" && (
              <button
                className="secondary-button"
                onClick={() => setMode("correction")}
              >
                退回补正
              </button>
            )}
            {mine && value.status === "PROCESSING" && (
              <button
                className="primary-button"
                onClick={() => setMode("complete")}
              >
                确认已开票并发送
              </button>
            )}
          </div>
        )}
        {mode === "assign" && (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void command({ action: "ASSIGN", assigneeAccountId: assignee });
            }}
          >
            <label>
              运营负责人
              <select
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                required
              >
                {operations.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.mobile}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" disabled={busy || !assignee}>
              确认分配
            </button>
          </form>
        )}
        {mode === "correction" && (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void command({
                action: "REQUEST_CORRECTION",
                reasonCode: reasonCode as "NAME_TAX_MISMATCH",
                ...(note.trim() ? { note: note.trim() } : {}),
              });
            }}
          >
            <label>
              补正原因
              <select
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value)}
              >
                <option value="NAME_TAX_MISMATCH">企业名称与税号不匹配</option>
                <option value="TAX_NUMBER_INVALID">税号格式或内容有误</option>
                <option value="EMAIL_INVALID">接收邮箱无法使用</option>
                <option value="OTHER">其他</option>
              </select>
            </label>
            <label>
              补充说明
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={320}
              />
            </label>
            <button
              className="primary-button"
              disabled={busy || (reasonCode === "OTHER" && !note.trim())}
            >
              通知客户修改
            </button>
          </form>
        )}
        {mode === "complete" && (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void command({
                action: "COMPLETE",
                invoiceNumber: invoiceNumber.trim(),
                issuedOn,
                confirmedSent: true,
              });
            }}
          >
            <label>
              发票号码
              <input
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label>
              开票日期
              <input
                type="date"
                value={issuedOn}
                onChange={(event) => setIssuedOn(event.target.value)}
                required
              />
            </label>
            <p>仅在已通过外部渠道发送后确认。</p>
            <button
              className="primary-button"
              disabled={busy || !invoiceNumber.trim()}
            >
              确认完成
            </button>
          </form>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {admin && value.audit && (
          <ul className={styles.audit} aria-label="处理记录">
            {value.audit.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{auditLabel(entry.action)}</strong>
                  <span>{date(entry.createdAt)}</span>
                </div>
                <RecordReference
                  value={entry.actorAccountId}
                  label="操作账号"
                />
                {entry.reason && <p>{entry.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function OperationsSidebar({
  account,
  active,
}: {
  account: { id: string; mobile: string };
  active: "invoices";
}) {
  return (
    <aside className="sidebar admin-sidebar">
      <a className="brand-mark inverse" href="/operations">
        <strong>GEO 运营台</strong>
      </a>
      <nav aria-label="运营功能">
        <a className="side-link" href="/operations">
          <i>工</i>
          <span>
            <b>工作台</b>
            <small>任务入口</small>
          </span>
        </a>
        <a className="side-link" href="/operations/orders">
          <i>单</i>
          <span>
            <b>履约订单</b>
            <small>领取与处理</small>
          </span>
        </a>
        <a className="side-link" href="/operations/support">
          <i>客</i>
          <span>
            <b>客服工单</b>
            <small>问题与处理</small>
          </span>
        </a>
        <a
          className={active === "invoices" ? "side-link active" : "side-link"}
          href="/operations/invoices"
          aria-current="page"
        >
          <i>票</i>
          <span>
            <b>发票处理</b>
            <small>领取、补正与完成</small>
          </span>
        </a>
      </nav>
      <div className="sidebar-account">
        <span>{account.mobile.slice(-4)}</span>
        <div>
          <b>运营账号</b>
          <small>{account.mobile}</small>
        </div>
        <SessionExitActions apiBaseUrl={base} />
      </div>
    </aside>
  );
}

function InvoiceBadge({
  status,
}: {
  status: InternalRechargeInvoice["status"];
}) {
  const label =
    status === "ISSUED"
      ? "已开票"
      : status === "NEEDS_CORRECTION"
        ? "需补正"
        : "处理中";
  return (
    <span
      className={`${styles.badge} ${status === "ISSUED" ? styles.issued : status === "NEEDS_CORRECTION" ? styles.correction : ""}`}
    >
      {label}
    </span>
  );
}
function money(value: string) {
  const fen = BigInt(value);
  return `¥${fen / 100n}.${(fen % 100n).toString().padStart(2, "0")}`;
}
function date(value: string) {
  return formatChinaDateTime(value);
}
function auditLabel(action: string) {
  return (
    (
      {
        APPLICATION_SUBMITTED: "客户提交",
        REQUEST_CLAIMED: "运营领取",
        CORRECTION_REQUESTED: "要求补正",
        CORRECTION_RESUBMITTED: "客户重提",
        REQUEST_ASSIGNED: "管理员分配",
        REQUEST_REASSIGNED: "管理员改派",
        REQUEST_RETURNED: "收回待领取",
        REQUEST_TAKEN_OVER: "管理员接管",
        REQUEST_ISSUED: "确认已开票",
      } as Record<string, string>
    )[action] ?? action
  );
}

export function mergeInternalInvoicePage(
  current: InternalRechargeInvoiceSummary[],
  page: InternalRechargeInvoicePage,
  append: boolean,
) {
  if (!append) return page.items;
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of page.items) byId.set(item.id, item);
  return [...byId.values()];
}

async function listAllOperations(signal: AbortSignal) {
  const accounts = new Map<string, AccountSummary>();
  let cursor: string | undefined;
  do {
    const page = await listAdminAccounts(base, {
      role: "OPERATIONS",
      status: "ACTIVE",
      limit: 50,
      ...(cursor ? { cursor } : {}),
    });
    if (signal.aborted) return [];
    for (const account of page.items) accounts.set(account.id, account);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return [...accounts.values()];
}
