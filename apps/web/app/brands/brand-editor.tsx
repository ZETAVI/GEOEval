"use client";

import type { Brand, BrandMutation } from "@geoeval/api-client";
import { useState } from "react";
import { BrandProfileFields } from "./brand-profile-fields.js";

type Props = {
  apiBaseUrl: string;
  brand?: Brand;
  busy: boolean;
  onCancel(): void;
  onSave(input: BrandMutation): Promise<void>;
};
const text = (value: string | null | undefined) => value ?? "";

export function BrandEditor({
  apiBaseUrl,
  brand,
  busy,
  onCancel,
  onSave,
}: Props) {
  const [form, setForm] = useState<BrandMutation>({
    companyName: text(brand?.companyName),
    primaryIndustryId: brand?.primaryIndustryId ?? null,
    secondaryIndustryId: brand?.secondaryIndustryId ?? null,
    otherProductOrService: brand?.otherProductOrService ?? null,
    flagshipProductOrService: brand?.flagshipProductOrService ?? null,
    characteristics:
      brand?.characteristics && brand.characteristics.length > 0
        ? brand.characteristics
        : ["", ""],
    contactName: text(brand?.contactName),
    contactMobile: text(brand?.contactMobile),
  });

  return (
    <div className="editor-backdrop" role="presentation">
      <section
        className="brand-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="editor-header">
          <div>
            <p className="step-label">品牌基础资料</p>
            <h2 id="editor-title">{brand ? "编辑品牌" : "创建品牌"}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onCancel}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <p className="editor-intro">
          这份资料会在诊断与后续优化中全局共用。带 *
          的内容齐全后即可进入免费诊断。
        </p>
        <div className="form-grid">
          <BrandProfileFields
            apiBaseUrl={apiBaseUrl}
            {...(brand ? { brand } : {})}
            value={form}
            onChange={setForm}
          />
        </div>
        <div className="editor-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            取消
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={busy || !text(form.companyName).trim()}
            onClick={() => void onSave(form)}
          >
            {busy ? "保存中…" : "保存品牌资料"}
          </button>
        </div>
      </section>
    </div>
  );
}
