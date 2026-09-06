"use client";

import type {
  BrandMutation,
  GeoOptimizationWorkspace,
} from "@geoeval/api-client";
import { BrandIdentityFields } from "../brands/brand-profile-fields.js";

export type WritingBrandForm = Pick<
  BrandMutation,
  | "companyName"
  | "primaryIndustryId"
  | "secondaryIndustryId"
  | "otherProductOrService"
  | "locationChange"
  | "flagshipProductOrService"
  | "characteristics"
  | "articleInformation"
>;

type Brand = NonNullable<GeoOptimizationWorkspace["brand"]>;

export function writingBrandForm(brand: Brand): WritingBrandForm {
  return {
    companyName: brand.companyName,
    primaryIndustryId: brand.primaryIndustryId,
    secondaryIndustryId: brand.secondaryIndustryId,
    otherProductOrService: brand.otherProductOrService,
    flagshipProductOrService: brand.flagshipProductOrService ?? null,
    characteristics: brand.characteristics.map((item) => ({ ...item })),
    articleInformation: {
      ...brand.articleInformation,
      suitableAudienceContexts: [
        ...brand.articleInformation.suitableAudienceContexts,
      ],
      desiredPositioning: [...brand.articleInformation.desiredPositioning],
    },
  };
}

export function writingBrandMutation(form: WritingBrandForm): WritingBrandForm {
  const articleInformation =
    form.articleInformation ?? emptyArticleInformation();
  return {
    ...form,
    flagshipProductOrService: form.flagshipProductOrService ?? null,
    characteristics: (form.characteristics ?? []).filter(
      (item) => item.title.trim() || item.detail?.trim(),
    ),
    articleInformation: {
      ...articleInformation,
      suitableAudienceContexts:
        articleInformation.suitableAudienceContexts.filter((item) =>
          item.trim(),
        ),
      desiredPositioning: articleInformation.desiredPositioning.filter((item) =>
        item.trim(),
      ),
    },
  };
}

export function BrandWritingFields({
  apiBaseUrl = "",
  brand,
  value,
  onChange,
}: {
  apiBaseUrl?: string;
  brand?: Brand;
  value: WritingBrandForm;
  onChange(value: WritingBrandForm): void;
}) {
  const characteristics = withTwoCharacteristics(value.characteristics);
  const articleInformation =
    value.articleInformation ?? emptyArticleInformation();
  const rangePrice =
    articleInformation.price?.mode === "RANGE"
      ? articleInformation.price
      : undefined;

  function update(patch: Partial<WritingBrandForm>) {
    onChange({ ...value, ...patch });
  }

  function updateCharacteristic(
    index: number,
    patch: Partial<(typeof characteristics)[number]>,
  ) {
    const next = [...characteristics];
    next[index] = { ...next[index]!, ...patch };
    update({ characteristics: next });
  }

  function updateArticle(
    patch: Partial<NonNullable<WritingBrandForm["articleInformation"]>>,
  ) {
    update({ articleInformation: { ...articleInformation, ...patch } });
  }

  return (
    <div className="optimization-brand-form form-grid">
      {brand && (
        <BrandIdentityFields
          apiBaseUrl={apiBaseUrl}
          brand={brand}
          value={value}
          onChange={onChange}
        />
      )}
      <label className="wide">
        当前主推产品或服务 *
        <input
          value={value.flagshipProductOrService ?? ""}
          minLength={2}
          maxLength={80}
          onChange={(event) =>
            update({ flagshipProductOrService: event.target.value })
          }
        />
        <small className="field-help">
          沿用诊断中的主推主题；修改后可按现有规则选择是否重新评测。
        </small>
      </label>

      <fieldset className="wide characteristic-fieldset">
        <legend>品牌特色与补充说明 *</legend>
        <p className="field-help">
          保留原来的特色短标题，并补充写作时可直接使用的具体说明；共 2–6 项。
        </p>
        <div className="optimization-characteristics">
          {characteristics.map((item, index) => (
            <article key={item.id ?? `new-${index}`}>
              <div>
                <label htmlFor={`optimization-characteristic-${index}`}>
                  特色 {index + 1}
                </label>
                {characteristics.length > 2 && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      update({
                        characteristics: characteristics.filter(
                          (_, candidate) => candidate !== index,
                        ),
                      })
                    }
                  >
                    删除
                  </button>
                )}
              </div>
              <input
                id={`optimization-characteristic-${index}`}
                value={item.title}
                minLength={2}
                maxLength={120}
                placeholder={index === 0 ? "例如：安静舒适" : "例如：精品手冲"}
                onChange={(event) =>
                  updateCharacteristic(index, { title: event.target.value })
                }
              />
              <textarea
                value={item.detail ?? ""}
                minLength={2}
                maxLength={1000}
                placeholder="可选：说明具体体验、做法或为什么值得客户选择"
                onChange={(event) =>
                  updateCharacteristic(index, {
                    detail: event.target.value || null,
                  })
                }
              />
            </article>
          ))}
        </div>
        {characteristics.length < 6 && (
          <button
            type="button"
            className="text-button characteristic-add"
            onClick={() =>
              update({ characteristics: [...characteristics, { title: "" }] })
            }
          >
            ＋ 添加一项特色
          </button>
        )}
      </fieldset>

      <fieldset className="wide price-fieldset">
        <legend>价格信息 *</legend>
        <div className="inline-options">
          <label>
            <input
              type="radio"
              name="price-mode"
              checked={!articleInformation.price}
              onChange={() => updateArticle({ price: null })}
            />
            暂不填写
          </label>
          <label>
            <input
              type="radio"
              name="price-mode"
              checked={articleInformation.price?.mode === "RANGE"}
              onChange={() =>
                updateArticle({
                  price: { mode: "RANGE", minimum: 0, maximum: 0 },
                })
              }
            />
            价格区间
          </label>
          <label>
            <input
              type="radio"
              name="price-mode"
              checked={articleInformation.price?.mode === "NEGOTIABLE"}
              onChange={() => updateArticle({ price: { mode: "NEGOTIABLE" } })}
            />
            面议
          </label>
        </div>
        {rangePrice && (
          <div className="price-range">
            <label>
              最低价（元）
              <input
                type="number"
                min={1}
                step={1}
                value={rangePrice.minimum || ""}
                onChange={(event) =>
                  updateArticle({
                    price: {
                      mode: "RANGE",
                      maximum: rangePrice.maximum,
                      minimum: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label>
              最高价（元）
              <input
                type="number"
                min={1}
                step={1}
                value={rangePrice.maximum || ""}
                onChange={(event) =>
                  updateArticle({
                    price: {
                      mode: "RANGE",
                      minimum: rangePrice.minimum,
                      maximum: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        )}
      </fieldset>

      <StringItemsField
        label="适用客户与场景 *"
        values={articleInformation.suitableAudienceContexts}
        placeholders={["例如：希望安静办公的自由职业者", "例如：周末朋友小聚"]}
        onChange={(suitableAudienceContexts) =>
          updateArticle({ suitableAudienceContexts })
        }
      />

      <label className="wide">
        品牌补充背景（选填）
        <textarea
          value={articleInformation.supplementalBackground ?? ""}
          maxLength={2000}
          placeholder="例如：成立经历、团队或技术背景、品牌由来、证书与资质；无需重复主推业务和特色。"
          onChange={(event) =>
            updateArticle({
              supplementalBackground: event.target.value || null,
            })
          }
        />
      </label>

      <StringItemsField
        label="希望重点建立的品牌认知（选填）"
        values={articleInformation.desiredPositioning}
        placeholders={[
          "从客户视角，例如：值得信赖的长期选择",
          "从品牌视角，例如：专注本地精品体验",
          "从竞品视角，例如：同价位中更专业",
        ]}
        onChange={(desiredPositioning) => updateArticle({ desiredPositioning })}
      />
    </div>
  );
}

function StringItemsField({
  label,
  values,
  placeholders,
  onChange,
}: {
  label: string;
  values: string[];
  placeholders: string[];
  onChange(values: string[]): void;
}) {
  const displayed = values.length > 0 ? values : [""];
  return (
    <fieldset className="wide string-items-field">
      <legend>{label}</legend>
      <div>
        {displayed.map((item, index) => (
          <label key={index}>
            <input
              value={item}
              minLength={2}
              maxLength={80}
              placeholder={placeholders[index % placeholders.length]}
              onChange={(event) => {
                const next = [...displayed];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            {displayed.length > 1 && (
              <button
                type="button"
                className="icon-button"
                aria-label={`删除${label} ${index + 1}`}
                onClick={() =>
                  onChange(displayed.filter((_, i) => i !== index))
                }
              >
                ×
              </button>
            )}
          </label>
        ))}
      </div>
      {displayed.length < 5 && (
        <button
          type="button"
          className="text-button characteristic-add"
          onClick={() => onChange([...displayed, ""])}
        >
          ＋ 新增一项
        </button>
      )}
    </fieldset>
  );
}

function withTwoCharacteristics(
  values: WritingBrandForm["characteristics"],
): NonNullable<WritingBrandForm["characteristics"]> {
  const next = [...(values ?? [])];
  while (next.length < 2) next.push({ title: "" });
  return next.slice(0, 6);
}

function emptyArticleInformation(): NonNullable<
  WritingBrandForm["articleInformation"]
> {
  return {
    price: null,
    suitableAudienceContexts: [],
    supplementalBackground: null,
    desiredPositioning: [],
  };
}
