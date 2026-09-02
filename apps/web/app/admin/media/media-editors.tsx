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
  formatFenAsYuan,
  isListingRevisionConflict,
  isSupportedUrlReference,
  listingStatusLabels,
  mediaCategoryOptions,
  parseNullableWholeYuanToFen,
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
    if (platform && !reason.trim()) nextErrors.reason = "请填写修改说明";
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
      reason: platform ? reason.trim() : "创建媒体平台",
    };
    setBusy(true);
    setError("");
    try {
      const saved = platform
        ? await updateAdminMediaPlatform(apiBaseUrl, platform.id, input)
        : await createAdminMediaPlatform(apiBaseUrl, input);
      await onSaved(
        saved,
        platform ? "平台资料已更新" : `已创建「${saved.displayName}」`,
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
      eyebrow="媒体平台"
      title={platform ? "编辑媒体平台" : "创建媒体平台"}
      description="先填写平台基本资料和分类。价格与销售状态可以稍后单独设置。"
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
          <div className="wide media-form-section-label">
            <b>基本资料</b>
            <span>用于平台列表、搜索和客户展示。</span>
          </div>
          <label>
            平台名称 <em>必填</em>
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
            覆盖地区
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
            平台简介
            <textarea
              value={description}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="一句话说明平台定位，不填写未经支持的效果承诺"
            />
          </label>
          <div className="wide media-form-section-label">
            <b>展示与分类</b>
            <span>填写图标地址后会立即显示预览。</span>
          </div>
          <div className="wide logo-field-row">
            <label>
              平台图标地址
              <input
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://… 或 /assets/…"
                aria-invalid={Boolean(errors.logoUrl)}
              />
              <FieldError value={errors.logoUrl} />
            </label>
            <div className="logo-input-preview" aria-label="平台图标预览">
              {logoUrl.trim() && isSupportedUrlReference(logoUrl) ? (
                <img
                  src={logoUrl.trim()}
                  alt="平台图标预览"
                  onLoad={(event) => {
                    event.currentTarget.style.display = "block";
                  }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span aria-hidden="true">图</span>
              )}
              <small>图标预览</small>
            </div>
          </div>
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
          {platform && (
            <>
              <label>
                资料状态
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as MediaPlatformCreate["status"],
                    )
                  }
                >
                  {Object.entries(platformStatusLabels).map(
                    ([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="wide reason-field">
                修改说明 <em>必填 · 保留在操作记录中</em>
                <input
                  value={reason}
                  maxLength={320}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="例如：根据最新资料修正分类"
                  aria-invalid={Boolean(errors.reason)}
                />
                <FieldError value={errors.reason} />
              </label>
            </>
          )}
        </div>
        <MutationFooter
          busy={busy}
          submitLabel={platform ? "保存平台资料" : "创建平台"}
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
      reason: current.listing ? reason : "设置初始销售状态",
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
      await onSaved(saved, "销售设置已保存");
      onClose();
    } catch (caught) {
      if (isListingRevisionConflict(caught)) {
        setConflict(true);
        setError(
          "销售设置已在其他页面发生变化。请刷新最新内容，重新核对价格和状态后再保存。",
        );
      } else {
        setError(messageFor(caught, "销售设置未保存，请稍后重试"));
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
          ? "已获取最新销售设置，请重新确认后保存。"
          : "已刷新，当前尚未设置销售，请重新确认后保存。",
      );
      setErrors({});
    } catch (caught) {
      setError(messageFor(caught, "暂时无法刷新销售设置"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorFrame
      eyebrow="销售设置"
      title={`设置「${platform.displayName}」的价格与销售状态`}
      description="只有处于销售中且设置了有效积分价的平台，客户才能购买。"
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
          <div className="wide media-form-section-label">
            <b>价格与销售状态</b>
            <span>系统会自动检查是否有其他人刚刚修改过这项设置。</span>
          </div>
          <label>
            销售状态
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
          {current.listing && (
            <label className="wide reason-field">
              修改说明 <em>必填 · 保留在操作记录中</em>
              <input
                value={reason}
                maxLength={320}
                onChange={(event) => setReason(event.target.value)}
                placeholder="例如：渠道维护，暂时停止新订单"
                aria-invalid={Boolean(errors.reason)}
              />
              <FieldError value={errors.reason} />
            </label>
          )}
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
            刷新最新销售设置
          </button>
        )}
        <MutationFooter
          busy={busy}
          submitLabel="保存销售设置"
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
    if (!name.trim()) nextErrors.name = "请填写合作来源名称";
    if (source && !reason.trim()) nextErrors.reason = "请填写修改说明";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const input: MediaSupplySourceCreate = {
      name: name.trim(),
      contactName: optionalText(contactName),
      contactMethod: optionalText(contactMethod),
      status,
      notes: optionalText(notes),
      reason: source ? reason.trim() : "创建合作来源",
    };
    setBusy(true);
    setError("");
    try {
      const saved = source
        ? await updateAdminMediaSource(apiBaseUrl, source.id, input)
        : await createAdminMediaSource(apiBaseUrl, input);
      await onSaved(
        saved,
        source ? "合作来源已更新" : `已创建来源「${saved.name}」`,
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
      eyebrow="合作来源"
      title={source ? "编辑合作来源" : "创建合作来源"}
      description="联系人和备注只供内部使用，不会展示给客户。"
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
          <div className="wide media-form-section-label">
            <b>基本信息</b>
            <span>记录资源来自哪个合作方以及如何联系。</span>
          </div>
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
          {source && (
            <label>
              来源状态
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
          )}
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
          {source && (
            <label className="wide reason-field">
              修改说明 <em>必填 · 保留在操作记录中</em>
              <input
                value={reason}
                maxLength={320}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={Boolean(errors.reason)}
              />
              <FieldError value={errors.reason} />
            </label>
          )}
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
  const [procurementCostYuan, setProcurementCostYuan] = useState(
    resource?.procurementCostFen === null ||
      resource?.procurementCostFen === undefined
      ? ""
      : formatFenAsYuan(resource.procurementCostFen).replaceAll(",", ""),
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
    if (!supplySourceId) nextErrors.supplySourceId = "请选择合作来源";
    if (!isSupportedUrlReference(accountUrl))
      nextErrors.accountUrl = "仅支持 HTTPS 或项目资源路径";
    if (!isSupportedUrlReference(caseUrl))
      nextErrors.caseUrl = "仅支持 HTTPS 或项目资源路径";
    if (publicVisibility === "MASKED" && !publicAlias.trim()) {
      nextErrors.publicAlias = "脱敏展示必须填写客户展示名称";
    }
    const cost = parseNullableWholeYuanToFen(procurementCostYuan);
    if (cost.error) nextErrors.procurementCostFen = cost.error;
    if (resource && !reason.trim()) nextErrors.reason = "请填写修改说明";
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
      reason: resource ? reason.trim() : "创建媒体资源",
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
      eyebrow="媒体资源"
      title={
        resource ? "编辑媒体资源" : `为「${platform.displayName}」添加资源`
      }
      description="记录实际可用的媒体账号或渠道。合作来源、成本和备注只供内部使用。"
      onClose={onClose}
    >
      {sources.length === 0 ? (
        <div className="media-editor-blocked">
          <h3>请先建立合作来源</h3>
          <p>每个资源必须关联一个合作来源。关闭后在“合作来源”区域创建来源。</p>
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
            <div className="wide media-form-section-label">
              <b>基本资料</b>
              <span>先确认资源名称和当前合作来源。</span>
            </div>
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
              合作来源 <em>内部</em>
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
            <div className="wide media-form-section-label">
              <b>发布与客户展示</b>
              <span>决定资源如何使用，以及客户能看到多少信息。</span>
            </div>
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
              客户是否可见
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
              资源优先级
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
            <div className="wide media-form-section-label">
              <b>内部成本与链接</b>
              <span>以下内容不会展示给客户。</span>
            </div>
            <label>
              采购成本（元） <em>可空 · 填整数</em>
              <input
                inputMode="numeric"
                value={procurementCostYuan}
                onChange={(event) => setProcurementCostYuan(event.target.value)}
                placeholder="例如：125"
                aria-invalid={Boolean(errors.procurementCostFen)}
              />
              <FieldError value={errors.procurementCostFen} />
            </label>
            <label>
              账号名称或编号
              <input
                value={accountIdentifier}
                maxLength={240}
                onChange={(event) => setAccountIdentifier(event.target.value)}
              />
            </label>
            <label>
              账号链接
              <input
                value={accountUrl}
                onChange={(event) => setAccountUrl(event.target.value)}
                placeholder="https://…"
                aria-invalid={Boolean(errors.accountUrl)}
              />
              <FieldError value={errors.accountUrl} />
            </label>
            <label className="wide">
              参考案例链接 <em>内部</em>
              <input
                value={caseUrl}
                onChange={(event) => setCaseUrl(event.target.value)}
                placeholder="https://…"
                aria-invalid={Boolean(errors.caseUrl)}
              />
              <FieldError value={errors.caseUrl} />
            </label>
            <label className="wide">
              发布说明 <em>内部</em>
              <textarea
                value={publicationNotes}
                maxLength={8000}
                onChange={(event) => setPublicationNotes(event.target.value)}
                placeholder="记录速度、收录、修改或内容约束；不要写成客户保证"
              />
            </label>
            {resource && (
              <label className="wide reason-field">
                修改说明 <em>必填 · 保留在操作记录中</em>
                <input
                  value={reason}
                  maxLength={320}
                  onChange={(event) => setReason(event.target.value)}
                  aria-invalid={Boolean(errors.reason)}
                />
                <FieldError value={errors.reason} />
              </label>
            )}
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
