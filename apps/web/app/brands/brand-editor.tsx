"use client";

import type { Brand, BrandMutation } from "@geoeval/api-client";
import { useState } from "react";

type Props = {
  brand?: Brand;
  busy: boolean;
  onCancel(): void;
  onSave(input: BrandMutation): Promise<void>;
};
const text = (value: string | null | undefined) => value ?? "";

export function BrandEditor({ brand, busy, onCancel, onSave }: Props) {
  const [form, setForm] = useState<Required<BrandMutation>>({
    companyName: text(brand?.companyName),
    primaryIndustry: text(brand?.primaryIndustry),
    secondaryIndustry: text(brand?.secondaryIndustry),
    characteristicOne: text(brand?.characteristicOne),
    characteristicTwo: text(brand?.characteristicTwo),
    province: text(brand?.province),
    city: text(brand?.city),
    district: text(brand?.district),
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
          <label>
            一级行业 *
            <input
              value={text(form.primaryIndustry)}
              onChange={(e) => field("primaryIndustry", e.target.value)}
              placeholder="例如：餐饮"
            />
          </label>
          <label>
            二级行业 *
            <input
              value={text(form.secondaryIndustry)}
              onChange={(e) => field("secondaryIndustry", e.target.value)}
              placeholder="例如：咖啡店"
            />
          </label>
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
          <fieldset className="wide">
            <legend>所在地区 *</legend>
            <div className="triple-fields">
              <input
                aria-label="省份"
                value={text(form.province)}
                onChange={(e) => field("province", e.target.value)}
                placeholder="省"
              />
              <input
                aria-label="城市"
                value={text(form.city)}
                onChange={(e) => field("city", e.target.value)}
                placeholder="市"
              />
              <input
                aria-label="区县"
                value={text(form.district)}
                onChange={(e) => field("district", e.target.value)}
                placeholder="区 / 镇"
              />
            </div>
          </fieldset>
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
