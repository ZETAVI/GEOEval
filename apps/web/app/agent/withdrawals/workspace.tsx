"use client";

import { useCallback, useState, type FormEvent } from "react";
import {
  commandAgencyWithdrawal,
  getAdminWithdrawalPolicy,
  getAgencyPayoutProfile,
  getAgencyWithdrawal,
  getAgencyWithdrawalSummary,
  listAdminAgencyWithdrawals,
  listAgencyWithdrawals,
  revealAgencyWithdrawalPayout,
  saveAdminWithdrawalPolicy,
  saveAgencyPayoutProfile,
  submitAgencyWithdrawal,
  type AgencyPayoutProfile,
  type AgencyWithdrawal,
  type AgencyWithdrawalFilter,
  type AgencyWithdrawalPage,
  type AgencyWithdrawalPolicy,
  type AgencyWithdrawalSummary,
} from "@geoeval/api-client";
import {
  loadRoleSession,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../../session-access.js";
import { useAgencyRead } from "../../agency/use-agency-read.js";
import { AdminSidebar } from "../../admin/admin-sidebar.js";
import { BusinessRecordsNavigation } from "../../admin/records/navigation.js";
import styles from "../../agency/customer-service.module.css";
import {
  money,
  time,
  WithdrawalFacts,
  withdrawalStatusLabels,
  yuanToFen,
} from "./view.js";

const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
type Data = {
  session: RoleSessionState;
  summary?: AgencyWithdrawalSummary;
  profile?: AgencyPayoutProfile | null;
  policy?: AgencyWithdrawalPolicy | null;
  page?: AgencyWithdrawalPage;
  detail?: AgencyWithdrawal;
};

export function WithdrawalWorkspace({
  role,
  filter = {},
  id,
}: {
  role: "AGENT" | "ADMINISTRATOR";
  filter?: AgencyWithdrawalFilter;
  id?: string;
}) {
  const admin = role === "ADMINISTRATOR";
  const root = admin ? "/admin/withdrawals" : "/agent/withdrawals";
  const scope = JSON.stringify({ role, filter, id });
  const load = useCallback(async (): Promise<Data> => {
    const session = await loadRoleSession(base, role);
    if (session.kind !== "ready") return { session };
    if (admin) {
      const [policy, records] = await Promise.all([
        getAdminWithdrawalPolicy(base, session.account.id),
        id
          ? getAgencyWithdrawal(base, session.account.id, id, true)
          : listAdminAgencyWithdrawals(base, session.account.id, filter),
      ]);
      return id
        ? {
            session,
            policy: policy.policy,
            detail: records as AgencyWithdrawal,
          }
        : {
            session,
            policy: policy.policy,
            page: records as AgencyWithdrawalPage,
          };
    }
    const [summary, profile, records] = await Promise.all([
      getAgencyWithdrawalSummary(base, session.account.id),
      getAgencyPayoutProfile(base, session.account.id),
      id
        ? getAgencyWithdrawal(base, session.account.id, id)
        : listAgencyWithdrawals(base, session.account.id, filter),
    ]);
    return id
      ? {
          session,
          summary,
          profile: profile.profile,
          detail: records as AgencyWithdrawal,
        }
      : {
          session,
          summary,
          profile: profile.profile,
          page: records as AgencyWithdrawalPage,
        };
  }, [scope]);
  const { data, error, refresh } = useAgencyRead(scope, load);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [revealed, setRevealed] = useState<{
    accountName: string;
    accountNumber: string;
    bankName: string;
    openingBranch: string;
  }>();

  async function mutate(run: (accountId: string) => Promise<unknown>) {
    if (data?.session.kind !== "ready" || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await run(data.session.account.id);
      setRevealed(undefined);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  if (data && data.session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={data.session}
        expectedRole={role}
        workspaceName="提现管理"
        loadingDetail="正在核对提现访问权限"
        apiBaseUrl={base}
        onRetry={() => void refresh()}
      />
    );

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filter))
    if (value !== undefined && key !== "cursor") query.set(key, String(value));
  const next = new URLSearchParams(query);
  if (data?.page?.nextCursor) next.set("cursor", String(data.page.nextCursor));

  return (
    <div className={admin ? "app-shell" : undefined}>
      {admin && data?.session.kind === "ready" && (
        <AdminSidebar account={data.session.account} active="records" />
      )}
      <main className={admin ? "workspace" : styles.workspace}>
        <nav className="commerce-actions">
          <a href={admin ? "/admin/records" : "/agent"}>
            {admin ? "业务记录" : "代理商工作区"}
          </a>
          {id && <a href={root}>提现列表</a>}
        </nav>
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{admin ? "全量业务记录" : "佣金提现"}</p>
            <h1>{id ? "提现申请详情" : "提现管理"}</h1>
            <p>已入账佣金扣除处理中和已完成提现后形成可提现金额。</p>
          </div>
          <button className="secondary-button" onClick={() => void refresh()}>
            刷新
          </button>
        </header>
        {admin && <BusinessRecordsNavigation active="withdrawals" />}
        {(error || actionError) && <p role="alert">{actionError || error}</p>}
        {!data && !error && <p role="status">正在读取提现资料…</p>}
        {!admin && !id && data?.summary && (
          <AgentSummary value={data.summary} />
        )}
        {!admin && !id && data?.session.kind === "ready" && (
          <ProfileForm
            profile={data.profile ?? null}
            busy={busy}
            onSave={(input) =>
              mutate((accountId) =>
                saveAgencyPayoutProfile(base, accountId, input),
              )
            }
          />
        )}
        {!admin && !id && data?.summary && (
          <WithdrawalForm
            summary={data.summary}
            busy={busy}
            onSubmit={(amountFen) =>
              mutate((accountId) =>
                submitAgencyWithdrawal(base, accountId, {
                  requestId: crypto.randomUUID(),
                  amountFen,
                }),
              )
            }
          />
        )}
        {admin && !id && data?.session.kind === "ready" && (
          <PolicyForm
            policy={data.policy ?? null}
            busy={busy}
            onSave={(input) =>
              mutate((accountId) =>
                saveAdminWithdrawalPolicy(base, accountId, input),
              )
            }
          />
        )}
        {admin && !id && <FilterForm root={root} filter={filter} />}
        {data?.page && (
          <WithdrawalTable
            root={root}
            page={data.page}
            filter={filter}
            query={query}
            next={next}
          />
        )}
        {data?.detail && (
          <>
            <WithdrawalFacts value={data.detail} />
            {!admin && data.detail.status === "PENDING_REVIEW" && (
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "撤回后本申请不能恢复；再次提现会创建新申请。",
                    )
                  )
                    void mutate((accountId) =>
                      commandAgencyWithdrawal(
                        base,
                        accountId,
                        data.detail!.id,
                        {
                          action: "WITHDRAW",
                          expectedRevision: data.detail!.revision,
                          requestId: crypto.randomUUID(),
                        },
                      ),
                    );
                }}
              >
                撤回申请
              </button>
            )}
            {admin &&
              (data.detail.status === "PENDING_REVIEW" ||
                data.detail.status === "PAYING") && (
                <AdminActions
                  value={data.detail}
                  busy={busy}
                  {...(revealed ? { revealed } : {})}
                  onAction={(input) =>
                    mutate((accountId) =>
                      commandAgencyWithdrawal(
                        base,
                        accountId,
                        data.detail!.id,
                        input,
                        true,
                      ),
                    )
                  }
                  onReveal={(reason) => {
                    if (data.session.kind !== "ready") return;
                    setBusy(true);
                    setActionError("");
                    revealAgencyWithdrawalPayout(
                      base,
                      data.session.account.id,
                      data.detail!.id,
                      { requestId: crypto.randomUUID(), reason },
                    )
                      .then(setRevealed)
                      .catch((e) =>
                        setActionError(
                          e instanceof Error ? e.message : "查看失败",
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                />
              )}
          </>
        )}
      </main>
    </div>
  );
}

function AgentSummary({ value }: { value: AgencyWithdrawalSummary }) {
  return (
    <section className={styles.card}>
      <h2>收益概览</h2>
      <dl className={styles.facts}>
        <div>
          <dt>可提现</dt>
          <dd>{money(value.availableFen)}</dd>
        </div>
        <div>
          <dt>处理中</dt>
          <dd>{money(value.processingFen)}</dd>
        </div>
        <div>
          <dt>累计已入账</dt>
          <dd>{money(value.bookedFen)}</dd>
        </div>
        <div>
          <dt>累计已提现</dt>
          <dd>{money(value.withdrawnFen)}</dd>
        </div>
      </dl>
      {value.minimumFen ? (
        <p>单笔最低提现 {money(value.minimumFen)}。</p>
      ) : (
        <p>管理员尚未设置最低提现金额。</p>
      )}
      {!value.enabled && <p>提现申请当前尚未开放。</p>}
    </section>
  );
}

function ProfileForm({
  profile,
  busy,
  onSave,
}: {
  profile: AgencyPayoutProfile | null;
  busy: boolean;
  onSave: (input: Parameters<typeof saveAgencyPayoutProfile>[2]) => void;
}) {
  return (
    <section className={styles.card}>
      <h2>当前收款资料</h2>
      {profile && (
        <p>
          已保存账号：{profile.maskedAccountNumber}
          。修改时需要重新输入完整账号。
        </p>
      )}
      <form
        className={styles.controls}
        key={profile?.revision ?? 0}
        onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          onSave({
            expectedRevision: profile?.revision ?? 0,
            requestId: crypto.randomUUID(),
            recipientType: String(f.get("recipientType")) as
              "INDIVIDUAL" | "ENTERPRISE",
            accountName: String(f.get("accountName")),
            accountNumber: String(f.get("accountNumber")),
            bankName: String(f.get("bankName")),
            openingBranch: String(f.get("openingBranch")),
            contactMobile: String(f.get("contactMobile")),
            consentVersion: "agency-payout-v1",
            sensitiveDataConsent: true,
          });
        }}
      >
        <label>
          收款主体
          <select
            name="recipientType"
            defaultValue={profile?.recipientType ?? "INDIVIDUAL"}
          >
            <option value="INDIVIDUAL">个人</option>
            <option value="ENTERPRISE">企业</option>
          </select>
        </label>
        <label>
          收款户名
          <input
            name="accountName"
            required
            defaultValue={profile?.accountName ?? ""}
          />
        </label>
        <label>
          完整银行账号
          <input
            name="accountNumber"
            required
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
        <label>
          银行名称
          <input
            name="bankName"
            required
            defaultValue={profile?.bankName ?? ""}
          />
        </label>
        <label>
          开户支行
          <input
            name="openingBranch"
            required
            defaultValue={profile?.openingBranch ?? ""}
          />
        </label>
        <label>
          联系手机号
          <input
            name="contactMobile"
            required
            defaultValue={profile?.contactMobile ?? ""}
          />
        </label>
        <label>
          <input name="consent" type="checkbox" required />
          我已了解银行账号仅用于提现付款，并同意按说明处理该敏感信息。
        </label>
        <button className="primary-button" disabled={busy}>
          保存收款资料
        </button>
      </form>
    </section>
  );
}

function WithdrawalForm({
  summary,
  busy,
  onSubmit,
}: {
  summary: AgencyWithdrawalSummary;
  busy: boolean;
  onSubmit: (amountFen: string) => void;
}) {
  const usable =
    summary.enabled &&
    summary.profileConfigured &&
    summary.minimumFen !== null &&
    BigInt(summary.availableFen) >= BigInt(summary.minimumFen);
  return (
    <section className={styles.card}>
      <h2>申请提现</h2>
      <form
        className={styles.controls}
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const amount = yuanToFen(
              String(new FormData(event.currentTarget).get("amount")),
            );
            if (window.confirm(`确认申请提现 ${money(amount)}？`))
              onSubmit(amount);
          } catch (e) {
            window.alert(e instanceof Error ? e.message : "金额不正确");
          }
        }}
      >
        <label>
          提现金额（元）
          <input
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            required
          />
        </label>
        <button
          type="button"
          className="secondary-button"
          disabled={!usable || busy}
          onClick={(event) => {
            const form = event.currentTarget.form;
            const input = form?.elements.namedItem(
              "amount",
            ) as HTMLInputElement | null;
            if (input) input.value = money(summary.availableFen).slice(1);
          }}
        >
          全部提现
        </button>
        <button className="primary-button" disabled={!usable || busy}>
          提交申请
        </button>
      </form>
    </section>
  );
}

function PolicyForm({
  policy,
  busy,
  onSave,
}: {
  policy: AgencyWithdrawalPolicy | null;
  busy: boolean;
  onSave: (input: Parameters<typeof saveAdminWithdrawalPolicy>[2]) => void;
}) {
  return (
    <section className={styles.card}>
      <h2>最低提现规则</h2>
      <form
        className={styles.controls}
        onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          try {
            onSave({
              expectedRevision: policy?.revision ?? 0,
              requestId: crypto.randomUUID(),
              minimumFen: yuanToFen(String(f.get("minimum"))),
              reason: String(f.get("reason")),
            });
          } catch (e) {
            window.alert(e instanceof Error ? e.message : "金额不正确");
          }
        }}
      >
        <label>
          最低金额（元）
          <input
            name="minimum"
            required
            defaultValue={policy ? money(policy.minimumFen).slice(1) : ""}
          />
        </label>
        <label>
          调整原因
          <input name="reason" required />
        </label>
        <button className="primary-button" disabled={busy}>
          保存规则
        </button>
      </form>
    </section>
  );
}

function FilterForm({
  root,
  filter,
}: {
  root: string;
  filter: AgencyWithdrawalFilter;
}) {
  return (
    <form className={styles.controls} action={root}>
      <label>
        代理商账号ID
        <input name="agentId" defaultValue={filter.agentId ?? ""} />
      </label>
      <label>
        状态
        <select name="status" defaultValue={filter.status ?? ""}>
          <option value="">全部</option>
          {Object.entries(withdrawalStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button className="primary-button">查询</button>
    </form>
  );
}

function WithdrawalTable({
  root,
  page,
  filter,
  query,
  next,
}: {
  root: string;
  page: AgencyWithdrawalPage;
  filter: AgencyWithdrawalFilter;
  query: URLSearchParams;
  next: URLSearchParams;
}) {
  return (
    <section className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>申请</th>
            <th>金额</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          {page.items.map((item) => (
            <tr key={item.id}>
              <td>#{item.number}</td>
              <td>{money(item.amountFen)}</td>
              <td>{withdrawalStatusLabels[item.status]}</td>
              <td>{time(item.submittedAt)}</td>
              <td>
                <a href={`${root}/${item.id}`}>查看</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!page.items.length && <p>暂无提现记录。</p>}
      <nav className="commerce-actions">
        {filter.cursor && <a href={`${root}?${query}`}>返回首页</a>}
        {page.nextCursor && <a href={`${root}?${next}`}>下一页</a>}
      </nav>
    </section>
  );
}

function AdminActions({
  value,
  busy,
  revealed,
  onAction,
  onReveal,
}: {
  value: AgencyWithdrawal;
  busy: boolean;
  revealed?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    openingBranch: string;
  };
  onAction: (input: Parameters<typeof commandAgencyWithdrawal>[3]) => void;
  onReveal: (reason: string) => void;
}) {
  return (
    <section className={styles.card}>
      <h2>管理员处理</h2>
      {value.status === "PENDING_REVIEW" && (
        <div className="commerce-actions">
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("批准后申请进入付款中，金额继续冻结。"))
                onAction({
                  action: "APPROVE",
                  expectedRevision: value.revision,
                  requestId: crypto.randomUUID(),
                });
            }}
          >
            批准并进入付款中
          </button>
          <ReasonForm
            label="驳回申请"
            busy={busy}
            onSubmit={(reason) =>
              onAction({
                action: "REJECT",
                expectedRevision: value.revision,
                requestId: crypto.randomUUID(),
                reason,
              })
            }
          />
        </div>
      )}
      {value.status === "PAYING" && (
        <>
          <form
            className={styles.controls}
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              if (window.confirm("确认已经完成线下转账？"))
                onAction({
                  action: "COMPLETE",
                  expectedRevision: value.revision,
                  requestId: crypto.randomUUID(),
                  bankTransactionReference: String(f.get("reference")),
                  ...(f.get("paidAt")
                    ? {
                        externalPaidAt: new Date(
                          String(f.get("paidAt")),
                        ).toISOString(),
                      }
                    : {}),
                  ...(f.get("note") ? { note: String(f.get("note")) } : {}),
                });
            }}
          >
            <label>
              银行流水号
              <input name="reference" required />
            </label>
            <label>
              银行实际付款时间（可选）
              <input name="paidAt" type="datetime-local" />
            </label>
            <label>
              内部备注（可选）
              <input name="note" />
            </label>
            <button className="primary-button" disabled={busy}>
              确认已完成转账
            </button>
          </form>
          <ReasonForm
            label="记录明确付款失败"
            busy={busy}
            onSubmit={(reason) =>
              onAction({
                action: "PAYMENT_FAILED",
                expectedRevision: value.revision,
                requestId: crypto.randomUUID(),
                reason,
              })
            }
          />
        </>
      )}
      {(value.status === "PENDING_REVIEW" || value.status === "PAYING") && (
        <ReasonForm label="查看完整收款账号" busy={busy} onSubmit={onReveal} />
      )}{" "}
      {revealed && (
        <div role="status">
          <b>{revealed.accountName}</b>
          <p>{revealed.accountNumber}</p>
          <p>
            {revealed.bankName} · {revealed.openingBranch}
          </p>
        </div>
      )}
    </section>
  );
}

function ReasonForm({
  label,
  busy,
  onSubmit,
}: {
  label: string;
  busy: boolean;
  onSubmit: (reason: string) => void;
}) {
  return (
    <form
      className={styles.controls}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const reason = String(new FormData(event.currentTarget).get("reason"));
        if (reason.trim()) onSubmit(reason);
      }}
    >
      <label>
        {label}原因
        <input name="reason" required />
      </label>
      <button className="secondary-button" disabled={busy}>
        {label}
      </button>
    </form>
  );
}
