"use client";
import { useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  getPublicationWork,
  getPublicationWorkHistory,
  savePublicationWork,
  type OperationalOrder,
  type PublicationWorkPage,
  type PublicationWorkItem,
  type PublicationWorkCommand,
  type PublicationWorkHistory,
} from "@geoeval/api-client";
import { deliveryStatusLabel } from "../../orders/publication-results.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
const itemLabels = {
  PENDING: "待处理",
  PUBLISHING: "发布中",
  PUBLISHED: "已发布",
};
const actionLabels: Record<string, string> = {
  BEGIN: "确认处理",
  PREPARE_MOCK: "Mock 准备",
  SAVE_DRAFT: "保存人工内容",
  RECORD_RESULT: "记录发布",
  CORRECT_RESULT: "纠正结果",
};
function localDate(value = new Date().toISOString()) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

type WorkHistoryKey = { orderId: string; slot: number; epoch: number };
export function acceptsWorkHistory(
  request: WorkHistoryKey,
  current: WorkHistoryKey,
) {
  return (
    request.orderId === current.orderId &&
    request.slot === current.slot &&
    request.epoch === current.epoch
  );
}

export function needsPreparationReplacementConfirmation(
  saved: { title: string; bodyMarkdown: string } | null,
  current: { title: string; bodyMarkdown: string },
  original: { title: string; bodyMarkdown: string },
) {
  return (
    saved !== null ||
    current.title !== original.title ||
    current.bodyMarkdown !== original.bodyMarkdown
  );
}

export function PublicationWorkPanel({
  order,
  canWrite,
  onChanged,
}: {
  order: OperationalOrder;
  canWrite: boolean;
  onChanged: () => Promise<void>;
}) {
  const [page, setPage] = useState<PublicationWorkPage>(),
    [after, setAfter] = useState(0);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<PublicationWorkItem>();
  const [tab, setTab] = useState<"result" | "prepare">("result");
  const [platform, setPlatform] = useState(""),
    [draftTitle, setDraftTitle] = useState(""),
    [body, setBody] = useState("");
  const [title, setTitle] = useState(""),
    [url, setUrl] = useState(""),
    [publishedAt, setPublishedAt] = useState(localDate());
  const [channel, setChannel] = useState(""),
    [note, setNote] = useState(""),
    [reason, setReason] = useState("");
  const [history, setHistory] = useState<PublicationWorkHistory>();
  const [uncertain, setUncertain] = useState(false);
  const historyKey = useRef<WorkHistoryKey>({
    orderId: order.id,
    slot: 0,
    epoch: 0,
  });
  function invalidateHistory(slot = 0) {
    historyKey.current = {
      orderId: order.id,
      slot,
      epoch: historyKey.current.epoch + 1,
    };
    setHistory(undefined);
  }
  function clearSelection() {
    setSelected(undefined);
    invalidateHistory();
  }
  const epoch = useRef(0),
    lock = useRef(false),
    dirty = useRef(false);
  const pending = useRef<{
    slot: number;
    command: PublicationWorkCommand;
  } | null>(null);
  async function load() {
    const request = ++epoch.current;
    setLoading(true);
    try {
      const next = await getPublicationWork(apiBaseUrl, order.id, after);
      if (request === epoch.current) setPage(next);
    } catch (error) {
      if (request === epoch.current)
        setError(error instanceof Error ? error.message : "发布工作读取失败");
    } finally {
      if (request === epoch.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      epoch.current += 1;
      historyKey.current = {
        ...historyKey.current,
        epoch: historyKey.current.epoch + 1,
      };
    };
  }, [order.id, order.delivery.revision, after]);
  function discardEdits() {
    return (
      !dirty.current || window.confirm("还有未保存的内容，是否放弃这些修改？")
    );
  }
  function choose(item: PublicationWorkItem) {
    if (busy || uncertain || !discardEdits()) return;
    setSelected(item);
    setTab("result");
    invalidateHistory(item.slot);
    setReason("");
    setPlatform(item.platformId ?? "");
    setDraftTitle(item.preparation?.title ?? order.title);
    setBody(item.preparation?.bodyMarkdown ?? order.bodyMarkdown);
    setTitle(item.result?.title ?? item.preparation?.title ?? order.title);
    setUrl(item.result?.url ?? "");
    setPublishedAt(localDate(item.result?.publishedAt));
    setChannel(item.result?.internalChannel ?? "");
    setNote(item.result?.internalNote ?? "");
    dirty.current = false;
    setError("");
    setNotice("");
  }
  async function act(action: PublicationWorkCommand["action"]) {
    if (!page || !selected || lock.current || loading || !canWrite) return;
    if (!platform) {
      setError("请选择本次处理的媒体平台");
      return;
    }
    const common = {
      expectedRevision: page.orderRevision,
      expectedItemRevision: selected.revision,
      platformId: platform,
      idempotencyKey: crypto.randomUUID(),
    };
    let command: PublicationWorkCommand;
    if (action === "RECORD_RESULT" || action === "CORRECT_RESULT") {
      if (!publishedAt || !Number.isFinite(new Date(publishedAt).getTime())) {
        setError("请填写有效发布时间");
        return;
      }
      const result = {
        title,
        url,
        publishedAt: new Date(publishedAt).toISOString(),
        internalChannel: channel,
        internalNote: note,
      };
      command =
        action === "CORRECT_RESULT"
          ? { ...common, action, result, reason }
          : { ...common, action, result };
    } else if (action === "SAVE_DRAFT")
      command = { ...common, action, title: draftTitle, bodyMarkdown: body };
    else command = { ...common, action };
    const request = pending.current ?? { slot: selected.slot, command };
    pending.current = request;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await savePublicationWork(
        apiBaseUrl,
        order.id,
        request.slot,
        request.command,
      );
      pending.current = null;
      setUncertain(false);
      dirty.current = false;
      clearSelection();
      setNotice(
        action === "PREPARE_MOCK"
          ? "Mock 内容已保存，不代表真实生成或发布。选择该条目可查看、继续编辑。"
          : "操作已保存，进度已按实际发布结果更新。",
      );
      await load();
      await onChanged();
    } catch (error) {
      const definitive =
        error instanceof ApiRequestError &&
        error.status >= 400 &&
        error.status < 500;
      if (definitive) pending.current = null;
      setUncertain(pending.current !== null);
      setError(
        error instanceof Error ? error.message : "操作未确认，请重试同一次操作",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function showHistory() {
    if (!selected || busy) return;
    const slot = selected.slot;
    const request = {
      orderId: order.id,
      slot,
      epoch: historyKey.current.epoch + 1,
    };
    historyKey.current = request;
    try {
      const items = await getPublicationWorkHistory(apiBaseUrl, order.id, slot);
      if (acceptsWorkHistory(request, historyKey.current)) setHistory(items);
    } catch (error) {
      if (acceptsWorkHistory(request, historyKey.current))
        setError(error instanceof Error ? error.message : "处理记录读取失败");
    }
  }
  function turnPage(cursor: number) {
    if (busy || uncertain || loading || !discardEdits()) return;
    dirty.current = false;
    clearSelection();
    setAfter(cursor);
  }
  const disabled = busy || loading || uncertain || !canWrite;
  return (
    <section
      className="commerce-editor"
      aria-label="逐项发布处理"
      aria-busy={busy || loading}
    >
      <div className="commerce-card-heading">
        <h2>逐项发布处理</h2>
        {page && (
          <span className="current-badge">
            {deliveryStatusLabel[page.status]}
          </span>
        )}
      </div>
      {page && (
        <>
          <p>
            实际已发布 {page.publishedQuantity} / {page.quantity} 篇
          </p>
          <progress
            aria-label="实际发布进度"
            value={page.publishedQuantity}
            max={page.quantity}
          />
        </>
      )}
      <p>
        每一项对应一篇已购发布。已有可访问的发布结果可直接录入，不必先生成内容。
      </p>
      {loading && <p role="status">正在读取发布条目…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="commerce-notice" role="status">
          {notice}
        </p>
      )}
      {uncertain && (
        <button
          className="primary-button"
          disabled={busy}
          onClick={() =>
            pending.current && void act(pending.current.command.action)
          }
        >
          重试同一次发布操作
        </button>
      )}
      <div className="publication-item-list">
        {page?.items.map((item) => (
          <button
            key={item.slot}
            className="publication-item-button"
            aria-pressed={selected?.slot === item.slot}
            disabled={busy || uncertain || loading}
            onClick={() => choose(item)}
          >
            <span>
              第 {item.slot} 篇 ·{" "}
              {page.targets.find(
                (target) => target.platformId === item.platformId,
              )?.displayName ?? "待选择媒体"}
            </span>
            <span>{itemLabels[item.state]}</span>
          </button>
        ))}
      </div>
      <div className="commerce-actions">
        {after > 0 && (
          <button
            className="secondary-button"
            disabled={busy || loading || uncertain}
            onClick={() => turnPage(Math.max(0, after - 20))}
          >
            上一批
          </button>
        )}
        {page?.nextAfterSlot != null && (
          <button
            className="secondary-button"
            disabled={busy || loading || uncertain}
            onClick={() => turnPage(page.nextAfterSlot!)}
          >
            下一批
          </button>
        )}
        <button
          className="secondary-button"
          disabled={busy || loading || uncertain}
          onClick={() => {
            if (discardEdits()) {
              dirty.current = false;
              clearSelection();
              void load();
            }
          }}
        >
          刷新条目
        </button>
      </div>
      {selected && page && (
        <div
          className="publication-item-editor"
          onChange={() => {
            dirty.current = true;
          }}
        >
          <h3>
            第 {selected.slot} 篇 · {itemLabels[selected.state]}
          </h3>
          <label>
            媒体平台
            <select
              value={platform}
              disabled={
                disabled || !!selected.purchasedPlatformId || !!selected.result
              }
              onChange={(event) => setPlatform(event.target.value)}
            >
              <option value="">请选择媒体平台</option>
              {page.targets.map((target) => (
                <option key={target.platformId} value={target.platformId}>
                  {target.displayName}
                </option>
              ))}
            </select>
          </label>
          {!!selected.purchasedPlatformId && (
            <p className="purchase-context">
              此媒体由原购买约定确定，不能通过普通编辑替换。
            </p>
          )}
          {!selected.result && page.status !== "COMPLETED" && (
            <div className="commerce-actions">
              <button
                className={
                  tab === "result" ? "primary-button" : "secondary-button"
                }
                disabled={busy || uncertain}
                onClick={() => setTab("result")}
              >
                记录发布结果
              </button>
              <button
                className={
                  tab === "prepare" ? "primary-button" : "secondary-button"
                }
                disabled={busy || uncertain}
                onClick={() => setTab("prepare")}
              >
                准备发布内容
              </button>
            </div>
          )}
          {tab === "prepare" && !selected.result ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void act("SAVE_DRAFT");
              }}
            >
              <p>
                内容准备不会增加发布数量。
                {selected.preparation?.mode === "MOCK"
                  ? "当前内容来自确定性 Mock。"
                  : "可人工填写或调整内容。"}
              </p>
              <label>
                发布内容标题
                <input
                  required
                  maxLength={200}
                  value={draftTitle}
                  disabled={disabled}
                  onChange={(event) => setDraftTitle(event.target.value)}
                />
              </label>
              <label>
                发布内容正文
                <textarea
                  required
                  maxLength={100000}
                  rows={12}
                  value={body}
                  disabled={disabled}
                  onChange={(event) => setBody(event.target.value)}
                />
              </label>
              {canWrite && (
                <div className="commerce-actions">
                  <button className="primary-button" disabled={disabled}>
                    保存人工内容
                  </button>
                  {page.preparationMode === "MOCK" && (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={disabled}
                      onClick={() => {
                        if (
                          !needsPreparationReplacementConfirmation(
                            selected.preparation,
                            { title: draftTitle, bodyMarkdown: body },
                            order,
                          ) ||
                          window.confirm(
                            "将用确定性 Mock 内容替换当前准备内容及未保存的修改。它不代表真实生成或发布，是否继续？",
                          )
                        )
                          void act("PREPARE_MOCK");
                      }}
                    >
                      使用 Mock 准备
                    </button>
                  )}
                </div>
              )}
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void act(selected.result ? "CORRECT_RESULT" : "RECORD_RESULT");
              }}
            >
              <p>
                请先打开实际发布链接确认可访问。这里记录的是已发布事实，不会自动向媒体发布。
              </p>
              <label>
                已发布文章标题
                <input
                  required
                  maxLength={200}
                  value={title}
                  disabled={disabled}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label>
                发布链接
                <input
                  required
                  type="url"
                  maxLength={2048}
                  value={url}
                  disabled={disabled}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label>
                发布时间
                <input
                  required
                  type="datetime-local"
                  value={publishedAt}
                  disabled={disabled}
                  onChange={(event) => setPublishedAt(event.target.value)}
                />
              </label>
              <label>
                实际发布账号或渠道（选填，仅内部可见）
                <input
                  maxLength={160}
                  value={channel}
                  disabled={disabled}
                  onChange={(event) => setChannel(event.target.value)}
                />
              </label>
              <label>
                内部备注（选填）
                <textarea
                  maxLength={320}
                  value={note}
                  disabled={disabled}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              {selected.result && (
                <label>
                  纠正原因
                  <textarea
                    required
                    maxLength={320}
                    value={reason}
                    disabled={disabled}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
              )}
              {canWrite && (
                <div className="commerce-actions">
                  <button className="primary-button" disabled={disabled}>
                    {selected.result ? "保存结果纠正" : "确认已发布并保存"}
                  </button>
                  {selected.state === "PENDING" && (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={disabled}
                      onClick={() => void act("BEGIN")}
                    >
                      确认开始该项处理
                    </button>
                  )}
                </div>
              )}
            </form>
          )}
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void showHistory()}
          >
            查看此项处理记录
          </button>
          {history && (
            <ol>
              {history.map((entry) => (
                <li key={entry.revision}>
                  {new Date(entry.createdAt).toLocaleString()} ·{" "}
                  {actionLabels[String(entry.request.action)] ?? "处理记录"}
                  {typeof entry.request.reason === "string"
                    ? ` · ${entry.request.reason}`
                    : ""}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
