"use client";

import {
  createAdminMediaPlatform,
  createAdminMediaResource,
  createAdminMediaSource,
  getAdminMediaPlatform,
  saveAdminMediaListing,
  updateAdminMediaPlatform,
  updateAdminMediaResource,
  updateAdminMediaSource,
  type MediaListingMutation,
  type MediaPlatformAdmin,
  type MediaPlatformCreate,
  type MediaResourceAdmin,
  type MediaResourceCreate,
  type MediaSupplySource,
  type MediaSupplySourceCreate,
} from "@geoeval/api-client";
import { useMemo, useState, type ReactNode } from "react";

import {
  allowedListingStatuses,
  buildListingMutation,
  categoryLabels,
  isListingRevisionConflict,
  isSupportedUrlReference,
  listingStatusLabels,
  mediaCategoryOptions,
  parseNullableWholeNumber,
  platformStatusLabels,
  publicationModeLabels,
  qualityLabels,
  resourceStatusLabels,
  sourceStatusLabels,
  visibilityLabels,
} from "./media-ui.js";

type SaveResult<T> = (value: T, message: string) => Promise<void> | void;
type FieldErrors = Record<string, string>;

function optionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function splitAliases(value: string): string[] {
  return [...new Set(value.split(/[\n,，]/).map((item) => item.trim()))].filter(
    Boolean,
  );
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function EditorFrame({
  eyebrow,
  title,
  description,
  children,
  onClose,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="editor-backdrop" role="presentation">
      <section
        className="media-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-editor-title"
      >
        <header className="media-editor-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id="media-editor-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button
            className="editor-close"
            type="button"
            onClick={onClose}
            aria-label="关闭编辑器"
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function FieldError({ value }: { value: string | undefined }) {
  return value ? <small className="field-error">{value}</small> : null;
}

function MutationFooter({
  busy,
  submitLabel,
  error,
  onClose,
}: {
  busy: boolean;
  submitLabel: string;
  error: string;
  onClose: () => void;
}) {
  return (
    <>
      {error && (
        <p className="form-error media-form-error" role="alert">
          {error}
        </p>
      )}
      <footer className="media-editor-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={onClose}
          disabled={busy}
        >
          取消
        </button>
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "正在保存…" : submitLabel}
        </button>
      </footer>
    </>
  );
}

export function PlatformEditor({
  apiBaseUrl,
  platform,
  onClose,
  onSaved,
}: {
  apiBaseUrl: string;
  platform?: MediaPlatformAdmin;
  onClose: () => void;
  onSaved: SaveResult<MediaPlatformAdmin>;
}) {
  const [displayName, setDisplayName] = useState(platform?.displayName ?? "");
  const [aliases, setAliases] = useState(platform?.aliases.join("，") ?? "");
  const [description, setDescription] = useState(platform?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(platform?.logoUrl ?? "");
  const [regionScope, setRegionScope] = useState<
    MediaPlatformCreate["regionScope"]
  >(platform?.regionScope ?? "DOMESTIC");
  const [status, setStatus] = useState<MediaPlatformCreate["status"]>(
    platform?.status ?? "ACTIVE",
  );
  const [categories, setCategories] = useState<
    MediaPlatformCreate["categories"]
  >(platform?.categories ?? []);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleCategory(category: MediaPlatformCreate["categories"][number]) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  async function submit() {
    const nextErrors: FieldErrors = {};
    if (!displayName.trim()) nextErrors.displayName = "请填写平台展示名称";
    if (categories.length === 0) nextErrors.categories = "至少选择一个媒体分类";
    if (!isSupportedUrlReference(logoUrl))
      nextErrors.logoUrl = "仅支持 HTTPS 或以 / 开头的项目资源路径";
    if (!reason.trim()) nextErrors.reason = "请填写本次变更原因";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: MediaPlatformCreate = {
      displayName: displayName.trim(),
      aliases: splitAliases(aliases),
      description: optionalText(description),
      logoUrl: optionalText(logoUrl),
      regionScope,
      status,
      categories,
      reason: reason.trim(),
    };
    setBusy(true);
    setError("");
    try {
      const saved = platform
        ? await updateAdminMediaPlatform(apiBaseUrl, platform.id, input)
        : await createAdminMediaPlatform(apiBaseUrl, input);
      await onSaved(
        saved,
        platform ? "平台事实已更新" : `已创建「${saved.displayName}」`,
      );
      onClose();
    } catch (caught) {
      setError(messageFor(caught, "平台未保存，请稍后重试"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorFrame
      eyebrow="平台事实"
      title={platform ? "编辑媒体平台" : "创建媒体平台"}
      description="维护客户认识的平台身份与分类；价格和上下架在独立销售配置中处理。"
      onClose={onClose}
    >
      <form
        className="media-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="media-form-grid">
          <label>
            平台展示名称 <em>必填</em>
            <input
              autoFocus
              value={displayName}
              maxLength={160}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例如：人民网"
              aria-invalid={Boolean(errors.displayName)}
            />
            <FieldError value={errors.displayName} />
          </label>
          <label>
            区域范围
            <select
              value={regionScope}
              onChange={(event) =>
                setRegionScope(
                  event.target.value as MediaPlatformCreate["regionScope"],
                )
              }
            >
              <option value="DOMESTIC">国内</option>
              <option value="OVERSEAS">海外</option>
            </select>
          </label>
          <label className="wide">
            别名
            <input
              value={aliases}
              onChange={(event) => setAliases(event.target.value)}
              placeholder="多个别名用逗号分隔，用于管理员检索"
            />
          </label>
          <label className="wide">
            Logo 引用
            <input
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://… 或 /assets/…"
              aria-invalid={Boolean(errors.logoUrl)}
            />
            <FieldError value={errors.logoUrl} />
          </label>
          <label className="wide">
            客户简介
            <textarea
              value={description}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="一句话说明平台定位，不填写未经支持的效果承诺"
            />
          </label>
          <label>
            平台状态
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as MediaPlatformCreate["status"])
              }
            >
              {Object.entries(platformStatusLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="wide media-checkbox-field">
            <legend>
              媒体分类 <em>至少一项</em>
            </legend>
            <div>
              {mediaCategoryOptions.map(([value, label]) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    checked={categories.includes(value)}
                    onChange={() => toggleCategory(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <FieldError value={errors.categories} />
          </fieldset>
          <label className="wide reason-field">
            变更原因 <em>必填 · 写入审计</em>
            <input
              value={reason}
              maxLength={320}
              onChange={(event) => setReason(event.target.value)}
              placeholder="例如：根据最新平台资料修正分类"
              aria-invalid={Boolean(errors.reason)}
            />
            <FieldError value={errors.reason} />
          </label>
        </div>
        <MutationFooter
          busy={busy}
          submitLabel={platform ? "保存平台事实" : "创建平台"}
          error={error}
          onClose={onClose}
        />
      </form>
    </EditorFrame>
  );
}

export function ListingEditor({
  apiBaseUrl,
  platform,
  onClose,
  onSaved,
}: {
  apiBaseUrl: string;
  platform: MediaPlatformAdmin;
  onClose: () => void;
  onSaved: SaveResult<MediaPlatformAdmin>;
}) {
  const [current, setCurrent] = useState(platform);
  const [status, setStatus] = useState<MediaListingMutation["status"]>(
    platform.listing?.status ?? "DRAFT",
  );
  const [pointPrice, setPointPrice] = useState(
    platform.listing?.pointPrice?.toString() ?? "",
  );
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const allowedStatuses = allowedListingStatuses(current.listing);

  async function submit() {
    const built = buildListingMutation({
      status,
      pointPriceInput: pointPrice,
      reason,
      ...(current.listing ? { currentRevision: current.listing.revision } : {}),
    });
    if (status === "ON_SHELF" && current.status !== "ACTIVE") {
      built.errors.status = "归档平台不能上架，请先恢复平台";
    }
    setErrors(built.errors);
    if (!built.value || Object.keys(built.errors).length > 0) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveAdminMediaListing(
        apiBaseUrl,
        current.id,
        built.value,
      );
      await onSaved(saved, "销售配置已保存，商业 revision 已更新");
      onClose();
    } catch (caught) {
      if (isListingRevisionConflict(caught)) {
        setConflict(true);
        setError(
          "销售配置已在其他页面变化。请刷新到最新 revision，重新核对价格和状态后再保存。",
        );
      } else {
        setError(messageFor(caught, "销售配置未保存，请稍后重试"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const refreshed = await getAdminMediaPlatform(apiBaseUrl, current.id);
      setCurrent(refreshed);
      setStatus(refreshed.listing?.status ?? "DRAFT");
      setPointPrice(refreshed.listing?.pointPrice?.toString() ?? "");
      setConflict(false);
      setNotice(
        refreshed.listing
          ? `已刷新到 revision ${refreshed.listing.revision}，请重新确认后保存。`
          : "已刷新，当前尚无销售配置，请重新确认后保存。",
      );
      setErrors({});
    } catch (caught) {
      setError(messageFor(caught, "暂时无法刷新销售配置"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorFrame
      eyebrow="销售配置"
      title={`维护「${platform.displayName}」Listing`}
      description="客户按平台和单次积分价购买。资源数量不会自动决定平台是否可售。"
      onClose={onClose}
    >
      <form
        className="media-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="listing-revision-callout">
          <span>当前商业 revision</span>
          <b>{current.listing?.revision ?? "尚未建立"}</b>
          <small>保存现有 Listing 时会携带此 revision，防止静默覆盖。</small>
        </div>
        <div className="media-form-grid">
          <label>
            Listing 状态
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as MediaListingMutation["status"])
              }
              aria-invalid={Boolean(errors.status)}
            >
              {allowedStatuses.map((value) => (
                <option key={value} value={value}>
                  {listingStatusLabels[value]}
                </option>
              ))}
            </select>
            <FieldError value={errors.status} />
          </label>
          <label>
            单次积分价
            <input
              inputMode="numeric"
              value={pointPrice}
              onChange={(event) => setPointPrice(event.target.value)}
              placeholder="上架时必须为正整数"
              aria-invalid={Boolean(errors.pointPrice)}
            />
            <FieldError value={errors.pointPrice} />
          </label>
          <div className="wide listing-state-guide">
            <span>
              <b>草稿</b> 尚未销售
            </span>
            <span>
              <b>已上架</b> 可供新选择
            </span>
            <span>
              <b>已暂停</b> 暂停新选择
            </span>
            <span>
              <b>已下架</b> 退出当前销售
            </span>
          </div>
          <label className="wide reason-field">
            调整原因 <em>必填 · 写入审计</em>
            <input
              value={reason}
              maxLength={320}
              onChange={(event) => setReason(event.target.value)}
              placeholder="例如：渠道维护，暂时停止新订单"
              aria-invalid={Boolean(errors.reason)}
            />
            <FieldError value={errors.reason} />
          </label>
        </div>
        {notice && (
          <p className="media-inline-notice" role="status">
            {notice}
          </p>
        )}
        {conflict && (
          <button
            type="button"
            className="conflict-refresh"
            disabled={busy}
            onClick={() => void refresh()}
          >
            刷新最新销售配置
          </button>
        )}
        <MutationFooter
          busy={busy}
          submitLabel="保存销售配置"
          error={error}
          onClose={onClose}
        />
      </form>
    </EditorFrame>
  );
}

export function SourceEditor({
  apiBaseUrl,
  source,
  onClose,
  onSaved,
}: {
  apiBaseUrl: string;
  source?: MediaSupplySource;
  onClose: () => void;
  onSaved: SaveResult<MediaSupplySource>;
}) {
  const [name, setName] = useState(source?.name ?? "");
  const [contactName, setContactName] = useState(source?.contactName ?? "");
  const [contactMethod, setContactMethod] = useState(
    source?.contactMethod ?? "",
  );
  const [status, setStatus] = useState<MediaSupplySourceCreate["status"]>(
    source?.status ?? "ACTIVE",
  );
  const [notes, setNotes] = useState(source?.notes ?? "");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = "请填写内部来源名称";
    if (!reason.trim()) nextErrors.reason = "请填写本次变更原因";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const input: MediaSupplySourceCreate = {
      name: name.trim(),
      contactName: optionalText(contactName),
      contactMethod: optionalText(contactMethod),
      status,
      notes: optionalText(notes),
      reason: reason.trim(),
    };
    setBusy(true);
    setError("");
    try {
      const saved = source
        ? await updateAdminMediaSource(apiBaseUrl, source.id, input)
        : await createAdminMediaSource(apiBaseUrl, input);
      await onSaved(
        saved,
        source ? "内部供给来源已更新" : `已创建来源「${saved.name}」`,
      );
      onClose();
    } catch (caught) {
      setError(messageFor(caught, "来源未保存，请稍后重试"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorFrame
      eyebrow="内部供给"
      title={source ? "编辑供给来源" : "创建供给来源"}
      description="来源、联系方式和备注只供内部维护，不会进入客户媒体库。"
      onClose={onClose}
    >
      <form
        className="media-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="media-form-grid">
          <label>
            来源名称 <em>必填</em>
            <input
              autoFocus
              value={name}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：渠道 A"
              aria-invalid={Boolean(errors.name)}
            />
            <FieldError value={errors.name} />
          </label>
          <label>
            有效状态
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as MediaSupplySourceCreate["status"],
                )
              }
            >
              {Object.entries(sourceStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            联系人
            <input
              value={contactName}
              maxLength={160}
              onChange={(event) => setContactName(event.target.value)}
            />
          </label>
          <label>
            联系方式
            <input
              value={contactMethod}
              maxLength={320}
              onChange={(event) => setContactMethod(event.target.value)}
              placeholder="手机号、微信或其他内部方式"
            />
          </label>
          <label className="wide">
            内部备注
            <textarea
              value={notes}
              maxLength={4000}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <label className="wide reason-field">
            变更原因 <em>必填 · 写入审计</em>
            <input
              value={reason}
              maxLength={320}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={Boolean(errors.reason)}
            />
            <FieldError value={errors.reason} />
          </label>
        </div>
        <MutationFooter
          busy={busy}
          submitLabel={source ? "保存来源" : "创建来源"}
          error={error}
          onClose={onClose}
        />
      </form>
    </EditorFrame>
  );
}

export function ResourceEditor({
  apiBaseUrl,
  platform,
  sources,
  resource,
  onClose,
  onSaved,
}: {
  apiBaseUrl: string;
  platform: MediaPlatformAdmin;
  sources: MediaSupplySource[];
  resource?: MediaResourceAdmin;
  onClose: () => void;
  onSaved: SaveResult<MediaResourceAdmin>;
}) {
  const defaultSource = useMemo(
    () => sources.find((item) => item.status === "ACTIVE") ?? sources[0],
    [sources],
  );
  const [resourceName, setResourceName] = useState(
    resource?.resourceName ?? "",
  );
  const [supplySourceId, setSupplySourceId] = useState(
    resource?.supplySourceId ?? defaultSource?.id ?? "",
  );
  const [accountIdentifier, setAccountIdentifier] = useState(
    resource?.accountIdentifier ?? "",
  );
  const [accountUrl, setAccountUrl] = useState(resource?.accountUrl ?? "");
  const [publicationMode, setPublicationMode] = useState<
    MediaResourceCreate["publicationMode"]
  >(resource?.publicationMode ?? "FIRST_PUBLISH");
  const [status, setStatus] = useState<MediaResourceCreate["status"]>(
    resource?.status ?? "ACTIVE",
  );
  const [publicVisibility, setPublicVisibility] = useState<
    MediaResourceCreate["publicVisibility"]
  >(resource?.publicVisibility ?? "HIDDEN");
  const [publicAlias, setPublicAlias] = useState(resource?.publicAlias ?? "");
  const [qualityTier, setQualityTier] = useState<
    MediaResourceCreate["qualityTier"]
  >(resource?.qualityTier ?? "MEDIUM");
  const [procurementCostFen, setProcurementCostFen] = useState(
    resource?.procurementCostFen?.toString() ?? "",
  );
  const [caseUrl, setCaseUrl] = useState(resource?.caseUrl ?? "");
  const [publicationNotes, setPublicationNotes] = useState(
    resource?.publicationNotes ?? "",
  );
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const nextErrors: FieldErrors = {};
    if (!resourceName.trim()) nextErrors.resourceName = "请填写资源名称";
    if (!supplySourceId) nextErrors.supplySourceId = "请选择当前供给来源";
    if (!isSupportedUrlReference(accountUrl))
      nextErrors.accountUrl = "仅支持 HTTPS 或项目资源路径";
    if (!isSupportedUrlReference(caseUrl))
      nextErrors.caseUrl = "仅支持 HTTPS 或项目资源路径";
    if (publicVisibility === "MASKED" && !publicAlias.trim()) {
      nextErrors.publicAlias = "脱敏展示必须填写客户展示名称";
    }
    const cost = parseNullableWholeNumber(procurementCostFen, {
      allowZero: true,
    });
    if (cost.error) nextErrors.procurementCostFen = cost.error;
    if (!reason.trim()) nextErrors.reason = "请填写本次变更原因";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const input: MediaResourceCreate = {
      platformId: platform.id,
      supplySourceId,
      resourceName: resourceName.trim(),
      accountIdentifier: optionalText(accountIdentifier),
      accountUrl: optionalText(accountUrl),
      publicationMode,
      status,
      publicVisibility,
      publicAlias:
        publicVisibility === "MASKED" ? optionalText(publicAlias) : null,
      qualityTier,
      procurementCostFen: cost.value,
      caseUrl: optionalText(caseUrl),
      publicationNotes: optionalText(publicationNotes),
      reason: reason.trim(),
    };
    setBusy(true);
    setError("");
    try {
      const saved = resource
        ? await updateAdminMediaResource(apiBaseUrl, resource.id, input)
        : await createAdminMediaResource(apiBaseUrl, input);
      await onSaved(
        saved,
        resource ? "媒体资源已更新" : `已创建资源「${saved.resourceName}」`,
      );
      onClose();
    } catch (caught) {
      setError(messageFor(caught, "资源未保存，请稍后重试"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorFrame
      eyebrow="具体资源"
      title={
        resource ? "编辑媒体资源" : `为「${platform.displayName}」添加资源`
      }
      description="资源是不可供客户选择的示例与运营参考；当前来源、采购成本和备注保持内部可见。"
      onClose={onClose}
    >
      {sources.length === 0 ? (
        <div className="media-editor-blocked">
          <h3>请先建立供给来源</h3>
          <p>
            每个资源必须关联一个当前内部来源。关闭后在“供给来源”区域创建来源。
          </p>
          <button className="secondary-button" type="button" onClick={onClose}>
            返回工作区
          </button>
        </div>
      ) : (
        <form
          className="media-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="media-form-grid">
            <label>
              资源名称 <em>必填</em>
              <input
                autoFocus
                value={resourceName}
                maxLength={240}
                onChange={(event) => setResourceName(event.target.value)}
                placeholder="例如：六安新周报"
                aria-invalid={Boolean(errors.resourceName)}
              />
              <FieldError value={errors.resourceName} />
            </label>
            <label>
              当前供给来源 <em>内部</em>
              <select
                value={supplySourceId}
                onChange={(event) => setSupplySourceId(event.target.value)}
                aria-invalid={Boolean(errors.supplySourceId)}
              >
                <option value="">请选择来源</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} · {sourceStatusLabels[source.status]}
                  </option>
                ))}
              </select>
              <FieldError value={errors.supplySourceId} />
            </label>
            <label>
              发布方式
              <select
                value={publicationMode}
                onChange={(event) =>
                  setPublicationMode(
                    event.target
                      .value as MediaResourceCreate["publicationMode"],
                  )
                }
              >
                {Object.entries(publicationModeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              资源状态
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as MediaResourceCreate["status"])
                }
              >
                {Object.entries(resourceStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              客户展示
              <select
                value={publicVisibility}
                onChange={(event) =>
                  setPublicVisibility(
                    event.target
                      .value as MediaResourceCreate["publicVisibility"],
                  )
                }
              >
                {Object.entries(visibilityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {publicVisibility === "MASKED" && (
              <label>
                客户展示名称 <em>必填</em>
                <input
                  value={publicAlias}
                  maxLength={240}
                  onChange={(event) => setPublicAlias(event.target.value)}
                  placeholder="经过批准的脱敏名称"
                  aria-invalid={Boolean(errors.publicAlias)}
                />
                <FieldError value={errors.publicAlias} />
              </label>
            )}
            <label>
              内部质量档次
              <select
                value={qualityTier}
                onChange={(event) =>
                  setQualityTier(
                    event.target.value as MediaResourceCreate["qualityTier"],
                  )
                }
              >
                {Object.entries(qualityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              采购成本（人民币分） <em>可空</em>
              <input
                inputMode="numeric"
                value={procurementCostFen}
                onChange={(event) => setProcurementCostFen(event.target.value)}
                placeholder="例如：12500 表示 ¥125.00"
                aria-invalid={Boolean(errors.procurementCostFen)}
              />
              <FieldError value={errors.procurementCostFen} />
            </label>
            <label>
              内部账号标识
              <input
                value={accountIdentifier}
                maxLength={240}
                onChange={(event) => setAccountIdentifier(event.target.value)}
              />
            </label>
            <label>
              内部账号链接
              <input
                value={accountUrl}
                onChange={(event) => setAccountUrl(event.target.value)}
                placeholder="https://…"
                aria-invalid={Boolean(errors.accountUrl)}
              />
              <FieldError value={errors.accountUrl} />
            </label>
            <label className="wide">
              案例链接 <em>内部</em>
              <input
                value={caseUrl}
                onChange={(event) => setCaseUrl(event.target.value)}
                placeholder="https://…"
                aria-invalid={Boolean(errors.caseUrl)}
              />
              <FieldError value={errors.caseUrl} />
            </label>
            <label className="wide">
              发文与内容备注 <em>内部</em>
              <textarea
                value={publicationNotes}
                maxLength={8000}
                onChange={(event) => setPublicationNotes(event.target.value)}
                placeholder="记录速度、收录、修改或内容约束；不要写成客户保证"
              />
            </label>
            <label className="wide reason-field">
              变更原因 <em>必填 · 写入审计</em>
              <input
                value={reason}
                maxLength={320}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={Boolean(errors.reason)}
              />
              <FieldError value={errors.reason} />
            </label>
          </div>
          <MutationFooter
            busy={busy}
            submitLabel={resource ? "保存资源" : "创建资源"}
            error={error}
            onClose={onClose}
          />
        </form>
      )}
    </EditorFrame>
  );
}
