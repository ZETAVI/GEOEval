"use client";

import type { Account, AccountSummary } from "@geoeval/api-client";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { accountRoleLabels, type GovernanceErrorView } from "./account-ui.js";

export type InternalAccountRole = Exclude<Account["role"], "TERMINAL_CUSTOMER">;

export type DangerousGovernanceAction =
  | {
      kind: "status";
      target: AccountSummary;
      nextStatus: Account["status"];
    }
  | { kind: "role"; target: AccountSummary }
  | { kind: "sessions"; target: AccountSummary };

const internalRoles: InternalAccountRole[] = [
  "OPERATIONS",
  "ADMINISTRATOR",
  "AGENT",
];

function DialogError({
  error,
  onRefresh,
}: {
  error?: GovernanceErrorView;
  onRefresh: () => void;
}) {
  if (!error) return null;
  return (
    <div
      className="governance-dialog-error"
      data-error-code={error.code ?? "UNKNOWN"}
    >
      <b>{error.title}</b>
      <p>{error.message}</p>
      {error.refreshRequired && (
        <button className="text-button" type="button" onClick={onRefresh}>
          关闭并刷新账号
        </button>
      )}
    </div>
  );
}

export function CreateInternalAccountDialog({
  busy,
  error,
  onClose,
  onRefresh,
  onSubmit,
}: {
  busy: boolean;
  error?: GovernanceErrorView;
  onClose: () => void;
  onRefresh: () => void;
  onSubmit: (input: {
    mobile: string;
    role: InternalAccountRole;
    reason: string;
  }) => void;
}) {
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<InternalAccountRole>("OPERATIONS");
  const [reason, setReason] = useState("");
  const dialogRef = useModalDialog();
  const valid = mobile.trim().length > 0 && validReason(reason);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    onSubmit({ mobile: mobile.trim(), role, reason: reason.trim() });
  }

  return (
    <dialog
      ref={dialogRef}
      className="governance-dialog"
      aria-labelledby="create-account-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <div>
          <p className="eyebrow">内部账号</p>
          <h2 id="create-account-title">创建固定角色账号</h2>
        </div>
        <button
          className="dialog-close-button"
          type="button"
          tabIndex={-1}
          aria-label="关闭"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <p className="governance-dialog-intro">
        手机号创建后不可编辑；客户与内部账号不能互相转换。新账号首次通过验证码后才能建立会话。
      </p>
      <form onSubmit={submit}>
        <label>
          <span>手机号</span>
          <input
            autoFocus
            data-dialog-initial-focus
            value={mobile}
            placeholder="请输入未使用的手机号"
            disabled={busy}
            onChange={(event) => setMobile(event.target.value)}
          />
        </label>
        <label>
          <span>固定角色</span>
          <select
            data-dialog-initial-focus
            value={role}
            disabled={busy}
            onChange={(event) =>
              setRole(event.target.value as InternalAccountRole)
            }
          >
            {internalRoles.map((value) => (
              <option key={value} value={value}>
                {accountRoleLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <ReasonField value={reason} disabled={busy} onChange={setReason} />
        <DialogError {...(error ? { error } : {})} onRefresh={onRefresh} />
        <footer>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={!valid || busy}
          >
            {busy ? "正在创建…" : "创建账号"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export function GovernanceActionDialog({
  action,
  busy,
  error,
  onClose,
  onRefresh,
  onSubmit,
}: {
  action: DangerousGovernanceAction;
  busy: boolean;
  error?: GovernanceErrorView;
  onClose: () => void;
  onRefresh: () => void;
  onSubmit: (input: { reason: string; role?: InternalAccountRole }) => void;
}) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const dialogRef = useModalDialog();
  const [role, setRole] = useState<InternalAccountRole>(() =>
    nextInternalRole(action.target.role),
  );
  const token = confirmationToken(action.target.mobile);
  const valid =
    validReason(reason) &&
    confirmation === token &&
    (action.kind !== "role" || role !== action.target.role);
  const presentation = actionPresentation(action, role);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    onSubmit({
      reason: reason.trim(),
      ...(action.kind === "role" ? { role } : {}),
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="governance-dialog danger"
      aria-labelledby="governance-action-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <div>
          <p className="eyebrow">危险治理操作</p>
          <h2 id="governance-action-title">{presentation.title}</h2>
        </div>
        <button
          className="dialog-close-button"
          type="button"
          tabIndex={-1}
          aria-label="关闭"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="governance-target-summary">
        <span>{action.target.mobile}</span>
        <small>
          {accountRoleLabels[action.target.role]} · 当前修订{" "}
          {action.target.revision}
        </small>
      </div>
      <p className="governance-dialog-intro">{presentation.description}</p>
      <form onSubmit={submit}>
        {action.kind === "role" && (
          <label>
            <span>变更后的内部角色</span>
            <select
              value={role}
              disabled={busy}
              onChange={(event) =>
                setRole(event.target.value as InternalAccountRole)
              }
            >
              {internalRoles.map((value) => (
                <option
                  key={value}
                  value={value}
                  disabled={value === action.target.role}
                >
                  {accountRoleLabels[value]}
                  {value === action.target.role ? "（当前）" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <ReasonField value={reason} disabled={busy} onChange={setReason} />
        <label>
          <span>操作确认</span>
          <small className="field-help">
            请输入目标手机号后 4 位「{token}」以确认
          </small>
          <input
            value={confirmation}
            inputMode="numeric"
            maxLength={4}
            placeholder={token}
            disabled={busy}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        <DialogError {...(error ? { error } : {})} onRefresh={onRefresh} />
        <footer>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="danger-button"
            type="submit"
            disabled={!valid || busy}
          >
            {busy ? "正在提交…" : presentation.submitLabel}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function ReasonField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>操作原因</span>
      <textarea
        data-dialog-initial-focus
        value={value}
        minLength={3}
        maxLength={320}
        placeholder="请填写 3 到 320 个字符，提交后进入治理审计"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <small className="field-help">{value.trim().length}/320</small>
    </label>
  );
}

function actionPresentation(
  action: DangerousGovernanceAction,
  role: InternalAccountRole,
): { title: string; description: string; submitLabel: string } {
  if (action.kind === "role") {
    return {
      title: `变更为${accountRoleLabels[role]}`,
      description:
        "角色变更会递增账号修订、立即回收目标账号的全部会话并写入同一事务审计。",
      submitLabel: "确认变更角色",
    };
  }
  if (action.kind === "sessions") {
    return {
      title: "回收全部会话",
      description:
        "目标账号在所有设备上的现有会话会立即失效；账号状态、角色和修订保持不变。",
      submitLabel: "确认回收会话",
    };
  }
  const activating = action.nextStatus === "ACTIVE";
  return {
    title: activating ? "启用账号" : "停用账号",
    description: activating
      ? "账号恢复登录资格；历史会话不会恢复，仍需重新完成登录。"
      : "停用会递增账号修订，并在同一事务中立即回收目标账号的全部会话。",
    submitLabel: activating ? "确认启用账号" : "确认停用账号",
  };
}

function nextInternalRole(role: Account["role"]): InternalAccountRole {
  return internalRoles.find((candidate) => candidate !== role) ?? "OPERATIONS";
}

function validReason(reason: string): boolean {
  const length = reason.trim().length;
  return length >= 3 && length <= 320;
}

function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]")?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return dialogRef;
}

export function confirmationToken(mobile: string): string {
  return mobile.slice(-4);
}
