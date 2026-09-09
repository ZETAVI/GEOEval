"use client";
import { useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  recordDeliveryException,
  saveDeliveryResolution,
  settleDeliveryReturn,
  type DeliveryException,
  type DeliveryReturnReceipt,
  type OperationalOrder,
  type SaveDeliveryResolution,
  type SettleDeliveryReturn,
} from "@geoeval/api-client";

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
    reason: resolution.reason ?? "",
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
    mode: form.mode,
    points,
    reason: form.reason.trim(),
    expectedRevision: revision,
    idempotencyKey: key,
  };
}

export type PendingDeliveryReturn = {
  actorAccountId: string;
  orderId: string;
  points: number;
  request: SettleDeliveryReturn;
};
export const deliveryReturnStorageKey = (actor: string, order: string) =>
  `geoeval.pending-delivery-return.${actor}.${order}`;
export function decodeDeliveryReturn(
  raw: string | null,
  actor: string,
  orderId: string,
): PendingDeliveryReturn | null {
  if (raw === null) return null;
  const value = JSON.parse(raw) as PendingDeliveryReturn;
  if (
    value?.actorAccountId !== actor ||
    value?.orderId !== orderId ||
    !Number.isSafeInteger(value?.points) ||
    value.points <= 0 ||
    !Number.isSafeInteger(value?.request?.expectedAgreementRevision) ||
    value.request.expectedAgreementRevision < 1 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.request.idempotencyKey,
    )
  )
    throw new Error(
      "上次退点凭据无法读取，请保留记录并核查本订单，勿另行调整积分。",
    );
  return value;
}

// Keep the actor, order, agreement and key together before making any money request.
export async function executeDeliveryReturn(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  actor: string,
  order: Pick<OperationalOrder, "id" | "resolution">,
  send: (
    orderId: string,
    request: SettleDeliveryReturn,
  ) => Promise<DeliveryReturnReceipt>,
  onPending: (pending: PendingDeliveryReturn) => void = () => {},
): Promise<DeliveryReturnReceipt> {
  const storageKey = deliveryReturnStorageKey(actor, order.id);
  let intent = decodeDeliveryReturn(
    storage.getItem(storageKey),
    actor,
    order.id,
  );
  if (!intent) {
    if (
      !order.resolution.eligible ||
      order.resolution.points <= 0 ||
      order.resolution.returnedPoints !== null
    )
      throw new Error("当前协商尚不可退点，请刷新订单核对。");
    intent = {
      actorAccountId: actor,
      orderId: order.id,
      points: order.resolution.points,
      request: {
        expectedAgreementRevision: order.resolution.agreementRevision,
        idempotencyKey: crypto.randomUUID(),
      },
    };
    storage.setItem(storageKey, JSON.stringify(intent));
  }
  onPending(intent);
  try {
    const receipt = await send(intent.orderId, intent.request);
    storage.removeItem(storageKey);
    return receipt;
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      [400, 404, 422].includes(error.status)
    )
      storage.removeItem(storageKey);
    throw error;
  }
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
            <p>已退还 {resolution.returnedPoints} 积分。</p>
          ) : (
            <p>
              待退还 {resolution.points} 积分 ·{" "}
              {resolution.eligible
                ? "可由管理员执行"
                : "等待剩余发布完成或停止，暂不可执行"}
            </p>
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
  actorAccountId,
  admin,
  canWrite,
  onChanged,
}: {
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
  const [pendingReturn, setPendingReturn] =
    useState<PendingDeliveryReturn | null>(null);
  const [confirmedReturn, setConfirmedReturn] = useState<number | null>(null);
  const [storageReady, setStorageReady] = useState(false);
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
  function recoverReturn() {
    setStorageReady(false);
    try {
      setPendingReturn(
        decodeDeliveryReturn(
          sessionStorage.getItem(
            deliveryReturnStorageKey(actorAccountId, order.id),
          ),
          actorAccountId,
          order.id,
        ),
      );
      setStorageReady(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "浏览器无法读取退点凭据，本次未提交。",
      );
    }
  }
  useEffect(() => {
    if (admin) recoverReturn();
  }, [admin, actorAccountId, order.id]);
  const canEdit =
    canWrite && order.status !== "CLOSED" && resolution.returnedPoints === null;
  const canHandleException =
    canWrite &&
    !resolution.stopped &&
    order.status !== "CLOSED" &&
    order.status !== "COMPLETED";
  async function save(kind: "resolution" | "exception", clear = false) {
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
              input: resolutionRequest(
                form,
                order.delivery.revision,
                crypto.randomUUID(),
                order.agreement.totalPoints,
              ),
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
      setNotice("处理约定已保存。");
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
  async function settle() {
    if (
      lock.current ||
      !admin ||
      !storageReady ||
      (confirmedReturn !== null && !pendingReturn)
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const receipt = await executeDeliveryReturn(
        sessionStorage,
        actorAccountId,
        order,
        (id, request) => settleDeliveryReturn(apiBaseUrl, id, request),
        setPendingReturn,
      );
      setPendingReturn(null);
      setConfirmedReturn(receipt.points);
      setNotice(`已退还 ${receipt.points} 积分；重复核对不会再次记账。`);
      await onChanged();
    } catch (error) {
      recoverReturn();
      setError(
        error instanceof Error
          ? error.message
          : "退点结果尚未确认，请核对同一次退点。",
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
      <h2>异常与协商处理</h2>
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
          <h3>保存已协商的处理约定</h3>
          <p>先与客户确认处理方式，再明确保存。退还金额不由系统自动计算。</p>
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
            协商退还积分
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
            协商原因与处理约定（内部记录）
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
            {form.mode === "TERMINATE"
              ? Number(form.points) === 0
                ? "保存后立即停止剩余发布并关闭订单；无需退点，不产生积分流水，也无需管理员操作。"
                : "保存后立即停止剩余发布，等待管理员退点成功后关闭订单。"
              : "继续完成已购发布；约定退点不阻塞发布。若有退点，发布完成后由管理员执行。"}
          </p>
          <button className="primary-button" disabled={disabled}>
            保存协商处理
          </button>
        </form>
      )}
      {admin && (
        <>
          {pendingReturn && (
            <div className="commerce-notice">
              <p>
                本订单有一笔待核对退点：{pendingReturn.points}{" "}
                积分。刷新后仍沿用原请求核对，避免重复记账。
              </p>
              <button
                className="primary-button"
                disabled={busy || !storageReady}
                onClick={() => void settle()}
              >
                核对或重试同一次退点
              </button>
              {resolution.returnedPoints === null &&
                pendingReturn.request.expectedAgreementRevision !==
                  resolution.agreementRevision && (
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => {
                      try {
                        sessionStorage.removeItem(
                          deliveryReturnStorageKey(actorAccountId, order.id),
                        );
                        setPendingReturn(null);
                        setNotice(
                          "协商已变更且尚未退点，请核对当前约定后执行。",
                        );
                      } catch {
                        setError("无法清理旧凭据，请保留并核查。");
                      }
                    }}
                  >
                    按已更新的协商重新核对
                  </button>
                )}
            </div>
          )}
          {!pendingReturn &&
            resolution.points > 0 &&
            resolution.returnedPoints === null && (
              <button
                className="primary-button"
                disabled={
                  busy ||
                  !storageReady ||
                  !resolution.eligible ||
                  confirmedReturn !== null
                }
                onClick={() => void settle()}
              >
                确认退还 {resolution.points} 积分
              </button>
            )}
          {!storageReady && (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={recoverReturn}
            >
              重新读取退点凭据
            </button>
          )}
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() =>
              void onChanged().catch((error: unknown) =>
                setError(
                  error instanceof Error ? error.message : "订单刷新失败",
                ),
              )
            }
          >
            刷新协商与退点状态
          </button>
        </>
      )}
    </section>
  );
}
