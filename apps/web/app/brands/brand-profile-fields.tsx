"use client";

import type { Brand, BrandMutation } from "@geoeval/api-client";

import { BrandReferenceFields } from "./brand-reference-fields.js";
import { StoreLocationPicker } from "./store-location-picker.js";

type Props = {
  apiBaseUrl: string;
  brand?: Brand;
  value: BrandMutation;
  onChange(value: BrandMutation): void;
};

const text = (value: string | null | undefined) => value ?? "";

export function BrandProfileFields({
  apiBaseUrl,
  brand,
  value,
  onChange,
}: Props) {
  const characteristics = withTwoCharacteristics(value.characteristics);

  function update(patch: Partial<BrandMutation>) {
    onChange({ ...value, ...patch });
  }

  function updateCharacteristic(index: number, nextValue: string) {
    const next = [...characteristics];
    next[index] = nextValue;
    update({ characteristics: next });
  }

  return (
    <>
      <label className="wide">
        公司或店铺名称 *
        <input
          value={text(value.companyName)}
          maxLength={200}
          onChange={(event) => update({ companyName: event.target.value })}
          placeholder="例如：星河咖啡"
        />
      </label>
      <BrandReferenceFields
        apiBaseUrl={apiBaseUrl}
        value={value}
        onChange={onChange}
      />
      <StoreLocationPicker
        apiBaseUrl={apiBaseUrl}
        {...(brand ? { brand } : {})}
        value={value}
        onChange={onChange}
      />
      <label className="wide">
        主打产品或服务 *
        <input
          value={text(value.flagshipProductOrService)}
          minLength={2}
          maxLength={80}
          onChange={(event) =>
            update({ flagshipProductOrService: event.target.value })
          }
          placeholder="例如：精品手冲咖啡"
        />
        <small className="field-help">
          填写最希望客户搜索和推荐的具体产品或服务，2–80 个字。
        </small>
      </label>
      <fieldset className="wide characteristic-fieldset">
        <legend>品牌特色 *</legend>
        <p className="field-help">
          至少两项、最多六项；各项地位相同，展示顺序不代表优先级。
        </p>
        <div className="characteristic-list">
          {characteristics.map((characteristic, index) => (
            <div key={index}>
              <label htmlFor={`characteristic-${index}`}>
                特色 {index + 1}
              </label>
              <input
                id={`characteristic-${index}`}
                value={characteristic}
                minLength={2}
                maxLength={120}
                onChange={(event) =>
                  updateCharacteristic(index, event.target.value)
                }
                placeholder={
                  index === 0 ? "例如：适合安静办公" : "例如：精品手冲"
                }
              />
              {characteristics.length > 2 && (
                <button
                  type="button"
                  className="icon-button characteristic-remove"
                  aria-label={`移除特色 ${index + 1}`}
                  onClick={() =>
                    update({
                      characteristics: characteristics.filter(
                        (_, candidateIndex) => candidateIndex !== index,
                      ),
                    })
                  }
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {characteristics.length < 6 && (
          <button
            type="button"
            className="text-button characteristic-add"
            onClick={() =>
              update({ characteristics: [...characteristics, ""] })
            }
          >
            ＋ 添加一项特色
          </button>
        )}
      </fieldset>
      <label>
        联系人 *
        <input
          value={text(value.contactName)}
          maxLength={100}
          onChange={(event) => update({ contactName: event.target.value })}
        />
      </label>
      <label>
        手机号 *
        <input
          inputMode="tel"
          value={text(value.contactMobile)}
          maxLength={20}
          onChange={(event) => update({ contactMobile: event.target.value })}
        />
      </label>
    </>
  );
}

function withTwoCharacteristics(values: string[] | undefined): string[] {
  const next = [...(values ?? [])];
  while (next.length < 2) next.push("");
  return next.slice(0, 6);
}
