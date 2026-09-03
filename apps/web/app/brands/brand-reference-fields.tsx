"use client";

import {
  getIndustryCatalog,
  type BrandMutation,
  type IndustryCatalog,
} from "@geoeval/api-client";
import { useEffect, useId, useMemo, useState } from "react";

type Props = {
  apiBaseUrl: string;
  value: BrandMutation;
  onChange(value: BrandMutation): void;
};

export function BrandReferenceFields({ apiBaseUrl, value, onChange }: Props) {
  const secondaryLabelId = useId();
  const otherHelpId = useId();
  const [industries, setIndustries] = useState<IndustryCatalog>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getIndustryCatalog(apiBaseUrl)
      .then((result) => {
        if (!active) return;
        setIndustries(result);
        setMessage("");
      })
      .catch(() => active && setMessage("暂时无法加载行业选项，请稍后重试"));
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  const primary = industries?.primaryIndustries.find(
    (candidate) => candidate.id === value.primaryIndustryId,
  );
  const secondary = primary?.secondaryIndustries.find(
    (candidate) => candidate.id === value.secondaryIndustryId,
  );
  const secondaryOptions = useMemo(
    () => primary?.secondaryIndustries ?? [],
    [primary],
  );

  function update(patch: Partial<BrandMutation>) {
    onChange({ ...value, ...patch });
  }

  function confirmOtherTextLoss(): boolean {
    if (!secondary?.isOther || !value.otherProductOrService?.trim())
      return true;
    return window.confirm("切换行业会清空已填写的具体产品或服务，是否继续？");
  }

  return (
    <>
      <label className="industry-field">
        一级行业 *
        <select
          className="industry-select"
          value={value.primaryIndustryId ?? ""}
          onChange={(event) => {
            if (!confirmOtherTextLoss()) return;
            update({
              primaryIndustryId: event.target.value || null,
              secondaryIndustryId: null,
              otherProductOrService: null,
            });
          }}
        >
          <option value="">请选择一级行业</option>
          {industries?.primaryIndustries.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div
        className="form-field industry-field secondary-industry-field"
        role="group"
        aria-labelledby={secondaryLabelId}
      >
        <span className="field-label" id={secondaryLabelId}>
          二级行业 *
        </span>
        <div
          className={`secondary-industry-control${secondary?.isOther ? " has-other-input" : ""}`}
        >
          <select
            className="industry-select secondary-industry-select"
            aria-labelledby={secondaryLabelId}
            value={value.secondaryIndustryId ?? ""}
            disabled={!value.primaryIndustryId}
            onChange={(event) => {
              const selected = secondaryOptions.find(
                (option) => option.id === event.target.value,
              );
              if (!selected?.isOther && !confirmOtherTextLoss()) return;
              update({
                secondaryIndustryId: event.target.value || null,
                ...(selected?.isOther ? {} : { otherProductOrService: null }),
              });
            }}
          >
            <option value="">请选择二级行业</option>
            {secondaryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.isOther ? "其他" : option.label}
              </option>
            ))}
          </select>
          {secondary?.isOther && (
            <>
              <input
                className="other-industry-input"
                aria-label="具体产品或服务"
                aria-describedby={otherHelpId}
                value={value.otherProductOrService ?? ""}
                minLength={2}
                maxLength={60}
                onChange={(event) =>
                  update({ otherProductOrService: event.target.value })
                }
                placeholder="填写具体产品或服务"
              />
              <small className="other-industry-count">
                {(value.otherProductOrService ?? "").length}/60
              </small>
            </>
          )}
        </div>
        {secondary?.isOther && (
          <small className="other-industry-help" id={otherHelpId}>
            请填写 2–60 个字，不能只填写“其他”
          </small>
        )}
      </div>
      {message && (
        <p className="reference-load-error wide" role="alert">
          {message}
        </p>
      )}
    </>
  );
}
