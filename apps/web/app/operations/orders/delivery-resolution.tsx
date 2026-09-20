"use client";
import { useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  recordDeliveryException,
  saveDeliveryResolution,
  type DeliveryException,
  type OperationalOrder,
  type SaveDeliveryResolution,
} from "@geoeval/api-client";
import { formatPoints } from "../../point-format.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
type Resolution = OperationalOrder["resolution"];
export type ResolutionForm = {
  mode: "CONTINUE" | "TERMINATE";
  points: string;
  reason: string;
};
export function resolutionForm(resolution: Resolution): ResolutionForm {
  return {
    mode: resolution.mode ?? "CONTINUE",
    points: String(resolution.points),
    reason: "", // Never copy a historical internal note into a customer-visible reply.
  };
}
export function resolutionRequest(
  form: ResolutionForm,
  revision: number,
  key: string,
  maximum: number,
): SaveDeliveryResolution {
  const points = Number(form.points);
  if (
    !/^\d+$/.test(form.points) ||
    !Number.isSafeInteger(points) ||
    points > maximum
  )
    throw new Error("退还积分须为不超过原订单消费积分的非负整数");
  if (!form.reason.trim()) throw new Error("请填写协商原因与处理约定");
  return {
    resolveTicket: false,
    mode: form.mode,
    points,
    reason: form.reason.trim(),
    expectedRevision: revision,
    idempotencyKey: key,
  };
}

export function DeliveryResolutionSummary({
  resolution,
}: {
  resolution: Resolution;
}) {
  return (
    <>
      {resolution.exceptionReason && (
        <p className="form-error">异常原因：{resolution.exceptionReason}</p>
      )}
      {resolution.mode === null ? (
        <p>尚未保存协商处理约定。</p>
      ) : (
        <>
          <p>
            {resolution.mode === "TERMINATE" ? "终止剩余发布" : "继续发布"} ·{" "}
            {resolution.reason}
          </p>
          {resolution.points === 0 ? (
            <p>无需退还积分。</p>
          ) : resolution.returnedPoints !== null ? (
            <p>已退回 {formatPoints(resolution.returnedPoints)}</p>
          ) : (
            <p>已约定退回 {formatPoints(resolution.points)}，待订单结束结算</p>
          )}
        </>
      )}
      {resolution.stopped && (
        <p>剩余发布已停止，已发布结果保留；已安排的外部发布需人工协调。</p>
      )}
    </>
  );
}

export function DeliveryResolutionPanel({
  order,
  canWrite,
  onChanged,
  admin,
  ticket,
}: {
  ticket?: { id: string; revision: number } | undefined;
  order: OperationalOrder;
  actorAccountId: string;
  admin: boolean;
  canWrite: boolean;
  onChanged: () => Promise<void>;
}) {
  const resolution = order.resolution;
  const [form, setForm] = useState(() => resolutionForm(resolution));
  const [exceptionReason, setExceptionReason] = useState(
    resolution.exceptionReason ?? "",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const pending = useRef<
    | { kind: "resolution"; input: SaveDeliveryResolution }
    | { kind: "exception"; input: DeliveryException }
    | null
  >(null);
  useEffect(() => {
    setForm(resolutionForm(resolution));
  }, [order.id, resolution.agreementRevision]);
  useEffect(() => {
    setExceptionReason(resolution.exceptionReason ?? "");
  }, [order.id, resolution.exceptionReason]);
  const canEdit =
    canWrite && !resolution.finalized && resolution.returnedPoints === null;
  const canHandleException =
    canWrite &&
    !resolution.stopped &&
    order.status !== "CLOSED" &&
    order.status !== "COMPLETED";
  async function save(
    kind: "resolution" | "exception",
    clear = false,
    resolveTicket = false,
  ) {
    if (
      lock.current ||
      (kind === "resolution" ? !canEdit : !canHandleException)
    )
      return;
    setError("");
    setNotice("");
    try {
      const request =
        pending.current ??
        (kind === "resolution"
          ? {
              kind,
              input: {
                ...resolutionRequest(
                  form,
                  order.delivery.revision,
                  crypto.randomUUID(),
                  order.agreement.totalPoints,
                ),
                resolveTicket,
                ...(ticket
                  ? {
                      ticketId: ticket.id,
                      expectedTicketRevision: ticket.revision,
                    }
                  : {}),
              },
            }
          : {
              kind,
              input: {
                expectedRevision: order.delivery.revision,
                idempotencyKey: crypto.randomUUID(),
                reason: clear ? null : exceptionReason.trim(),
              },
            });
      if (request.kind === "exception" && request.input.reason === "")
        throw new Error("请填写异常原因");
      pending.current = request;
      lock.current = true;
      setBusy(true);
      if (request.kind === "resolution")
        await saveDeliveryResolution(apiBaseUrl, order.id, request.input);
      else await recordDeliveryException(apiBaseUrl, order.id, request.input);
      pending.current = null;
      setUncertain(false);
      setNotice(
        request.kind === "resolution"
          ? "处理结果已保存，约定退点将在订单结束后满足结算条件时自动退回。"
          : "异常记录已保存。",
      );
      await onChanged();
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.status >= 400 &&
        error.status < 500
      )
        pending.current = null;
      setUncertain(pending.current !== null);
      setError(
        error instanceof Error
          ? error.message
          : "操作结果未确认，请重试同一次操作。",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const disabled = busy || uncertain;
  return (
    <section
      className="commerce-editor"
      aria-label="异常与协商处理"
      aria-busy={busy}
    >
      <h2>订单处理</h2>
      <DeliveryResolutionSummary resolution={resolution} />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {uncertain && (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => pending.current && void save(pending.current.kind)}
        >
          重试同一次处理
        </button>
      )}
      {canHandleException && (
        <details>
          <summary>
            {resolution.exceptionReason ? "更新或解除异常" : "记录发布异常"}
          </summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save("exception");
            }}
          >
            <label>
              异常原因
              <textarea
                required
                maxLength={320}
                value={exceptionReason}
                disabled={disabled}
                onChange={(event) => setExceptionReason(event.target.value)}
              />
            </label>
            <div className="commerce-actions">
              <button className="secondary-button" disabled={disabled}>
                保存异常
              </button>
              {resolution.exceptionReason && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={disabled}
                  onClick={() => void save("exception", true)}
                >
                  解除异常，继续处理
                </button>
              )}
            </div>
          </form>
        </details>
      )}
      {canEdit && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save("resolution");
          }}
        >
          <h3>与客户确认处理结果</h3>
          <p>填写本单累计约定退回的积分总额；本次保存不会立即退积分。</p>
          <label>
            后续发布
            <select
              value={form.mode}
              disabled={disabled}
              onChange={(event) =>
                setForm({
                  ...form,
                  mode: event.target.value as ResolutionForm["mode"],
                })
              }
            >
              <option value="CONTINUE" disabled={resolution.stopped}>
                继续完成发布
              </option>
              <option value="TERMINATE" disabled={order.status === "COMPLETED"}>
                终止所有剩余发布
              </option>
            </select>
          </label>
          <label>
            约定退回积分总额
            <input
              type="number"
              min={0}
              max={order.agreement.totalPoints}
              step={1}
              required
              value={form.points}
              disabled={disabled}
              onChange={(event) =>
                setForm({ ...form, points: event.target.value })
              }
            />
          </label>
          <label>
            处理说明（客户可见）
            <textarea
              required
              maxLength={320}
              value={form.reason}
              disabled={disabled}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
            />
          </label>
          <p className="purchase-context">
            订单完成或关闭满 72 小时、相关问题处理完后，系统自动一次性退回。
          </p>
          <button className="primary-button" disabled={disabled}>
            保存并继续跟进
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={disabled}
            onClick={() => void save("resolution", false, true)}
          >
            确认处理完成
          </button>
        </form>
      )}
      <p>
        <a
          href={`${admin ? "/admin" : "/operations"}/support?orderId=${order.id}`}
        >
          查看订单工单与沟通记录
        </a>
      </p>
    </section>
  );
}
