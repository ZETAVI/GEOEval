"use client";

import {
  getIndustryCatalog,
  listCityRegions,
  listProvinceRegions,
  listTerminalRegions,
  type BrandMutation,
  type CityRegionOptionList,
  type IndustryCatalog,
  type RegionOptionList,
  type TerminalRegionOptionList,
} from "@geoeval/api-client";
import { useEffect, useMemo, useState } from "react";

type Props = {
  apiBaseUrl: string;
  value: BrandMutation;
  onChange(value: BrandMutation): void;
};

export function BrandReferenceFields({ apiBaseUrl, value, onChange }: Props) {
  const [industries, setIndustries] = useState<IndustryCatalog>();
  const [provinces, setProvinces] = useState<RegionOptionList>();
  const [cities, setCities] = useState<CityRegionOptionList>();
  const [terminals, setTerminals] = useState<TerminalRegionOptionList>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      getIndustryCatalog(apiBaseUrl),
      listProvinceRegions(apiBaseUrl),
    ])
      .then(([nextIndustries, nextProvinces]) => {
        if (!active) return;
        setIndustries(nextIndustries);
        setProvinces(nextProvinces);
      })
      .catch(
        () => active && setMessage("暂时无法加载行业或地区选项，请稍后重试"),
      );
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!value.provinceRegionId) {
      setCities(undefined);
      return;
    }
    let active = true;
    setCities(undefined);
    setMessage("");
    void listCityRegions(apiBaseUrl, value.provinceRegionId)
      .then((result) => {
        if (!active) return;
        setCities(result);
        setMessage("");
      })
      .catch(() => active && setMessage("暂时无法加载城市选项"));
    return () => {
      active = false;
    };
  }, [apiBaseUrl, value.provinceRegionId]);

  useEffect(() => {
    if (!value.provinceRegionId || !value.cityRegionId) {
      setTerminals(undefined);
      return;
    }
    let active = true;
    setTerminals(undefined);
    setMessage("");
    void listTerminalRegions(
      apiBaseUrl,
      value.provinceRegionId,
      value.cityRegionId,
    )
      .then((result) => {
        if (!active) return;
        setTerminals(result);
        setMessage("");
      })
      .catch(() => active && setMessage("暂时无法加载终端地区选项"));
    return () => {
      active = false;
    };
  }, [apiBaseUrl, value.provinceRegionId, value.cityRegionId]);

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
      <label className="industry-field secondary-industry-field">
        二级行业 *
        <div
          className={`secondary-industry-control${secondary?.isOther ? " has-other-input" : ""}`}
        >
          <select
            className="industry-select secondary-industry-select"
            aria-label="二级行业"
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
          <small className="other-industry-help">
            请填写 2–60 个字，不能只填写“其他”
          </small>
        )}
      </label>
      <fieldset className="wide">
        <legend>所在地区 *</legend>
        <div className="triple-fields">
          <label>
            省级地区
            <select
              aria-label="省级地区"
              value={value.provinceRegionId ?? ""}
              onChange={(event) =>
                update({
                  provinceRegionId: event.target.value || null,
                  cityRegionId: null,
                  terminalRegionId: null,
                })
              }
            >
              <option value="">请选择省级地区</option>
              {provinces?.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            城市
            <select
              aria-label="城市"
              value={value.cityRegionId ?? ""}
              disabled={!value.provinceRegionId || !cities}
              onChange={(event) =>
                update({
                  cityRegionId: event.target.value || null,
                  terminalRegionId: null,
                })
              }
            >
              <option value="">
                {value.provinceRegionId && !cities
                  ? "正在加载城市…"
                  : "请选择城市"}
              </option>
              {cities?.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            终端地区
            <select
              aria-label="终端地区"
              value={value.terminalRegionId ?? ""}
              disabled={!value.cityRegionId || !terminals}
              onChange={(event) =>
                update({ terminalRegionId: event.target.value || null })
              }
            >
              <option value="">
                {value.cityRegionId && !terminals
                  ? "正在加载区县／镇街…"
                  : "请选择区县／镇街"}
              </option>
              {terminals?.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>
      {message && (
        <p className="reference-load-error wide" role="alert">
          {message}
        </p>
      )}
    </>
  );
}
