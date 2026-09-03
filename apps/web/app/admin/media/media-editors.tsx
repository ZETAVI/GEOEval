"use client";

import {
  createAdminMediaPlatform,
  createAdminMediaResource,
  createAdminMediaSupplier,
  getAdminMediaPlatform,
  updateAdminMediaPlatform,
  updateAdminMediaResource,
  updateAdminMediaSupplier,
  type MediaPlatformAdmin,
  type MediaPlatformCreate,
  type MediaPlatformUpdate,
  type MediaResourceAdmin,
  type MediaResourceCreate,
  type MediaSupplier,
  type MediaSupplierCreate,
} from "@geoeval/api-client";
import { useMemo, useState, type ReactNode } from "react";

import {
  categoryLabels,
  isPlatformRevisionConflict,
  isSupportedUrlReference,
  mediaCategoryOptions,
  parsePlatformPointPrice,
  parseNullableWholeNumber,
  platformStatusLabels,
  publicationModeLabels,
  qualityLabels,
  resourceStatusLabels,
  supplierStatusLabels,
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
  const [current, setCurrent] = useState(platform);
  const [displayName, setDisplayName] = useState(platform?.displayName ?? "");
  const [aliases, setAliases] = useState(platform?.aliases.join("，") ?? "");
  const [description, setDescription] = useState(platform?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(platform?.logoUrl ?? "");
  const [regionScope, setRegionScope] = useState<
    MediaPlatformCreate["regionScope"]
  >(platform?.regionScope ?? "DOMESTIC");
  const [status, setStatus] = useState<MediaPlatformCreate["status"]>(
    platform?.status ?? "INACTIVE",
  );
  const [pointPrice, setPointPrice] = useState(
    platform?.pointPrice?.toString() ?? "",
  );
  const [categories, setCategories] = useState<
    MediaPlatformCreate["categories"]
  >(platform?.categories ?? []);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
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
    const price = parsePlatformPointPrice(status!, pointPrice);
    if (price.error) nextErrors.pointPrice = price.error;
    if (platform && !reason.trim()) nextErrors.reason = "请填写修改说明";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const values = {
      displayName: displayName.trim(),
      aliases: splitAliases(aliases),
      description: optionalText(description),
      logoUrl: optionalText(logoUrl),
      regionScope,
      status,
      pointPrice: price.value,
      categories,
    };
    setBusy(true);
    setError("");
    try {
      const saved = platform
        ? await updateAdminMediaPlatform(apiBaseUrl, platform.id, {
            ...values,
            expectedRevision: current!.revision,
            reason: reason.trim(),
          } satisfies MediaPlatformUpdate)
        : await createAdminMediaPlatform(apiBaseUrl, {
            ...values,
          } satisfies MediaPlatformCreate);
      await onSaved(
        saved,
        platform ? "平台已更新" : `已创建「${saved.displayName}」`,
      );
      onClose();
    } catch (caught) {
      if (isPlatformRevisionConflict(caught)) {
        setConflict(true);
        setError(
          "平台已在其他页面发生变化。请刷新最新内容，重新核对后再保存。",
        );
      } else {
        setError(messageFor(caught, "平台未保存，请稍后重试"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      const refreshed = await getAdminMediaPlatform(apiBaseUrl, current.id);
      setCurrent(refreshed);
      setDisplayName(refreshed.displayName);
      setAliases(refreshed.aliases.join("，"));
      setDescription(refreshed.description ?? "");
      setLogoUrl(refreshed.logoUrl ?? "");
      setRegionScope(refreshed.regionScope);
      setStatus(refreshed.status);
      setPointPrice(refreshed.pointPrice?.toString() ?? "");
      setCategories(refreshed.categories);
      setReason("");
      setConflict(false);
      setNotice("已获取最新平台内容，请重新确认后保存。");
      setErrors({});
    } catch (caught) {
      setError(messageFor(caught, "暂时无法刷新平台内容"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorFrame
      eyebrow="媒体平台"
      title={platform ? "编辑媒体平台" : "创建媒体平台"}
      description="平台就是客户购买的媒体单位。新建默认停用，启用前必须设置有效积分价。"
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
          <div className="wide media-form-section-label">
            <b>价格与状态</b>
            <span>停用后客户不能购买；启用时必须填写积分价。</span>
          </div>
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
          <label>
            单次积分价
            <input
              inputMode="numeric"
              value={pointPrice}
              onChange={(event) => setPointPrice(event.target.value)}
              placeholder="启用时必须为正整数"
              aria-invalid={Boolean(errors.pointPrice)}
            />
            <FieldError value={errors.pointPrice} />
          </label>
          {platform && (
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
            刷新最新平台内容
          </button>
        )}
        <MutationFooter
          busy={busy}
          submitLabel={platform ? "保存平台" : "创建平台"}
          error={error}
          onClose={onClose}
        />
      </form>
    </EditorFrame>
  );
}

export function SupplierEditor({
  apiBaseUrl,
  supplier,
  onClose,
  onSaved,
}: {
  apiBaseUrl: string;
  supplier?: MediaSupplier;
  onClose: () => void;
  onSaved: SaveResult<MediaSupplier>;
}) {
  const [displayName, setDisplayName] = useState(supplier?.displayName ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [contactMethod, setContactMethod] = useState(
    supplier?.contactMethod ?? "",
  );
  const [status, setStatus] = useState<MediaSupplierCreate["status"]>(
    supplier?.status ?? "INACTIVE",
  );
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const nextErrors: FieldErrors = {};
    if (!displayName.trim()) nextErrors.displayName = "请填写供应商名称";
    if (supplier && !reason.trim()) nextErrors.reason = "请填写修改说明";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const input: MediaSupplierCreate = {
      displayName: displayName.trim(),
      contactName: optionalText(contactName),
      contactMethod: optionalText(contactMethod),
      status,
      notes: optionalText(notes),
    };
    setBusy(true);
    setError("");
    try {
      const saved = supplier
        ? await updateAdminMediaSupplier(apiBaseUrl, supplier.id, {
            ...input,
            expectedRevision: supplier.revision,
            reason: reason.trim(),
          })
        : await createAdminMediaSupplier(apiBaseUrl, input);
      await onSaved(
        saved,
        supplier ? "供应商已更新" : `已创建供应商「${saved.displayName}」`,
      );
      onClose();
    } catch (caught) {
      setError(messageFor(caught, "供应商未保存，请稍后重试"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorFrame
      eyebrow="供应商"
      title={supplier ? "编辑供应商" : "创建供应商"}
      description="新建后默认停用；联系人和备注只供内部使用，不会展示给客户。"
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
          <label className={supplier ? undefined : "wide"}>
            供应商名称 <em>必填</em>
            <input
              autoFocus
              value={displayName}
              maxLength={160}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例如：渠道甲"
              aria-invalid={Boolean(errors.displayName)}
            />
            <FieldError value={errors.displayName} />
          </label>
          {supplier && (
            <label>
              供应商状态
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as MediaSupplierCreate["status"])
                }
              >
                {Object.entries(supplierStatusLabels).map(([value, label]) => (
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
          {supplier && (
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
          submitLabel={supplier ? "保存供应商" : "创建供应商"}
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
  suppliers,
  resource,
  onClose,
  onSaved,
}: {
  apiBaseUrl: string;
  platform: MediaPlatformAdmin;
  suppliers: MediaSupplier[];
  resource?: MediaResourceAdmin;
  onClose: () => void;
  onSaved: SaveResult<MediaResourceAdmin>;
}) {
  const defaultSupplier = useMemo(
    () => suppliers.find((item) => item.status === "ACTIVE") ?? suppliers[0],
    [suppliers],
  );
  const [resourceName, setResourceName] = useState(
    resource?.resourceName ?? "",
  );
  const [supplierId, setSupplierId] = useState(
    resource?.supplierId ?? defaultSupplier?.id ?? "",
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
    resource?.procurementCostYuan === null ||
      resource?.procurementCostYuan === undefined
      ? ""
      : String(resource.procurementCostYuan),
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
    if (!supplierId) nextErrors.supplierId = "请选择供应商";
    if (!isSupportedUrlReference(accountUrl))
      nextErrors.accountUrl = "仅支持 HTTPS 或项目资源路径";
    if (!isSupportedUrlReference(caseUrl))
      nextErrors.caseUrl = "仅支持 HTTPS 或项目资源路径";
    if (publicVisibility === "MASKED" && !publicAlias.trim()) {
      nextErrors.publicAlias = "脱敏展示必须填写客户展示名称";
    }
    const cost = parseNullableWholeNumber(procurementCostYuan, {
      allowZero: true,
    });
    if (cost.error) nextErrors.procurementCostYuan = cost.error;
    if (resource && !reason.trim()) nextErrors.reason = "请填写修改说明";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const input: MediaResourceCreate = {
      platformId: platform.id,
      supplierId,
      resourceName: resourceName.trim(),
      accountIdentifier: optionalText(accountIdentifier),
      accountUrl: optionalText(accountUrl),
      publicationMode,
      status,
      publicVisibility,
      publicAlias:
        publicVisibility === "MASKED" ? optionalText(publicAlias) : null,
      qualityTier,
      procurementCostYuan: cost.value,
      caseUrl: optionalText(caseUrl),
      publicationNotes: optionalText(publicationNotes),
    };
    setBusy(true);
    setError("");
    try {
      const saved = resource
        ? await updateAdminMediaResource(apiBaseUrl, resource.id, {
            ...input,
            expectedRevision: resource.revision,
            reason: reason.trim(),
          })
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
      description="记录实际可用的媒体账号或渠道。供应商、成本和备注只供内部使用。"
      onClose={onClose}
    >
      {suppliers.length === 0 ? (
        <div className="media-editor-blocked">
          <h3>请先建立供应商</h3>
          <p>每个资源必须关联一个供应商。关闭后在“供应商管理”中创建。</p>
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
              <span>先确认资源名称和当前供应商。</span>
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
              供应商 <em>内部</em>
              <select
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                aria-invalid={Boolean(errors.supplierId)}
              >
                <option value="">请选择供应商</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.displayName} ·{" "}
                    {supplierStatusLabels[supplier.status]}
                  </option>
                ))}
              </select>
              <FieldError value={errors.supplierId} />
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
              资源质量
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
                aria-invalid={Boolean(errors.procurementCostYuan)}
              />
              <FieldError value={errors.procurementCostYuan} />
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
            <label>
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
