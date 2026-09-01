"use client";

import type { Brand, BrandMutation } from "@geoeval/api-client";
import { useState } from "react";
import { BrandReferenceFields } from "./brand-reference-fields.js";

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
    characteristicOne: text(brand?.characteristicOne),
    characteristicTwo: text(brand?.characteristicTwo),
    provinceRegionId: brand?.provinceRegionId ?? null,
    cityRegionId: brand?.cityRegionId ?? null,
    terminalRegionId: brand?.terminalRegionId ?? null,
    contactName: text(brand?.contactName),
    contactMobile: text(brand?.contactMobile),
  });
  function field(name: keyof BrandMutation, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

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
          <label className="wide">
            公司或店铺名称 *
            <input
              value={text(form.companyName)}
              onChange={(e) => field("companyName", e.target.value)}
            />
          </label>
          <BrandReferenceFields
            apiBaseUrl={apiBaseUrl}
            value={form}
            onChange={setForm}
          />
          <label>
            品牌特色一 *
            <input
              value={text(form.characteristicOne)}
              onChange={(e) => field("characteristicOne", e.target.value)}
              placeholder="例如：适合安静办公"
            />
          </label>
          <label>
            品牌特色二 *
            <input
              value={text(form.characteristicTwo)}
              onChange={(e) => field("characteristicTwo", e.target.value)}
              placeholder="例如：精品手冲"
            />
          </label>
          <label>
            联系人 *
            <input
              value={text(form.contactName)}
              onChange={(e) => field("contactName", e.target.value)}
            />
          </label>
          <label>
            手机号 *
            <input
              inputMode="tel"
              value={text(form.contactMobile)}
              onChange={(e) => field("contactMobile", e.target.value)}
            />
          </label>
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
