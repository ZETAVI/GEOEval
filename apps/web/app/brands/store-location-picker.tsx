"use client";

import {
  verifyStoreLocation,
  type Brand,
  type BrandMutation,
  type StoreLocationVerification,
} from "@geoeval/api-client";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  apiBaseUrl: string;
  brand?: Brand;
  value: BrandMutation;
  onChange(value: BrandMutation): void;
};

type AmapRuntime = {
  Map: new (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => AmapMap;
  PlaceSearch: new (options: Record<string, unknown>) => AmapPlaceSearch;
  AutoComplete: new (options: Record<string, unknown>) => AmapAutoComplete;
};

type AmapMap = {
  destroy(): void;
};

type AmapPlaceSearch = {
  clear(): void;
  search(
    keyword: string,
    callback: (status: string, result: unknown) => void,
  ): void;
  on(
    event: "selectChanged",
    listener: (event: { id?: unknown; data?: unknown }) => void,
  ): void;
};

type AmapAutoComplete = {
  on(event: "select", listener: (event: { poi?: unknown }) => void): void;
};

declare global {
  interface Window {
    _AMapSecurityConfig?: { serviceHost: string };
  }
}

const amapJsKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY?.trim() ?? "";

export function StoreLocationPicker({
  apiBaseUrl,
  brand,
  value,
  onChange,
}: Props) {
  const inputId = `store-location-${useId().replace(/:/g, "")}`;
  const panelId = `${inputId}-amap-panel`;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<AmapMap | undefined>(undefined);
  const placeSearch = useRef<AmapPlaceSearch | undefined>(undefined);
  const loadingPromise = useRef<Promise<void> | undefined>(undefined);
  const disposed = useRef(false);
  const latestValue = useRef(value);
  const latestOnChange = useRef(onChange);
  const latestBrandId = useRef(brand?.id);
  const latestQuery = useRef("");
  const activeSearchInput = useRef("");
  const verificationSequence = useRef(0);
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState<StoreLocationVerification>();
  const [busy, setBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [message, setMessage] = useState("");

  latestValue.current = value;
  latestOnChange.current = onChange;
  latestBrandId.current = brand?.id;
  latestQuery.current = query;

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      verificationSequence.current += 1;
      map.current?.destroy();
      map.current = undefined;
      placeSearch.current = undefined;
    };
  }, []);

  async function ensureMap(): Promise<void> {
    if (mapReady) return;
    if (!amapJsKey) throw new Error("地图服务尚未配置，可先保存其他资料");
    if (loadingPromise.current) return loadingPromise.current;
    loadingPromise.current = (async () => {
      if (!mapContainer.current) throw new Error("地图容器尚未准备好");
      window._AMapSecurityConfig = {
        serviceHost: `${window.location.origin}/_AMapService`,
      };
      const { load } = await import("@amap/amap-jsapi-loader");
      const AMap = (await load({
        key: amapJsKey,
        version: "2.0",
        plugins: ["AMap.AutoComplete", "AMap.PlaceSearch"],
      })) as AmapRuntime;
      if (disposed.current || !mapContainer.current) return;
      map.current = new AMap.Map(mapContainer.current, {
        zoom: 4,
        center: [104.195397, 35.86166],
        viewMode: "2D",
      });
      placeSearch.current = new AMap.PlaceSearch({
        city: "全国",
        citylimit: false,
        pageSize: 10,
        pageIndex: 1,
        extensions: "all",
        map: map.current,
        panel: panelId,
        autoFitView: true,
      });
      placeSearch.current.on("selectChanged", (event) => {
        const providerPlaceId = selectedPlaceId(event);
        if (!providerPlaceId) return;
        void verifySelectedPlace(
          providerPlaceId,
          selectedPlaceName(event.data),
        );
      });
      const autocomplete = new AMap.AutoComplete({
        city: "全国",
        citylimit: false,
        input: inputId,
      });
      autocomplete.on("select", (event) => {
        const keyword =
          latestQuery.current.trim() || selectedPlaceName(event.poi);
        if (!keyword) return;
        latestQuery.current = keyword;
        setQuery(keyword);
        void searchPlaces(keyword);
      });
      setMapReady(true);
    })().catch((error) => {
      map.current?.destroy();
      map.current = undefined;
      placeSearch.current = undefined;
      loadingPromise.current = undefined;
      throw error;
    });
    return loadingPromise.current;
  }

  async function search() {
    await searchPlaces(latestQuery.current);
  }

  async function initializeMap() {
    try {
      await ensureMap();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "地图搜索暂时不可用");
    }
  }

  async function searchPlaces(rawInput: string) {
    const searchInput = rawInput.trim();
    if (searchInput.length < 2) {
      setMessage("请至少输入 2 个字，并尽量带上城市、地址或地标");
      return;
    }
    const sequence = ++verificationSequence.current;
    setBusy(true);
    setMessage("");
    setVerification(undefined);
    clearPendingReplacement();
    try {
      await ensureMap();
      const service = placeSearch.current;
      if (!service) throw new Error("地图搜索尚未准备好");
      activeSearchInput.current = searchInput;
      service.clear();
      const status = await new Promise<"complete" | "no_data">(
        (resolve, reject) => {
          service.search(searchInput, (status) => {
            if (status === "complete") resolve("complete");
            else if (status === "no_data") resolve("no_data");
            else reject(new Error("地图搜索暂时不可用，请稍后重试"));
          });
        },
      );
      if (sequence !== verificationSequence.current) return;
      setMessage(
        status === "complete"
          ? "请直接在高德结果列表或地图标记中选择具体门店"
          : "没有找到候选，请补充城市、地址或附近地标后重试",
      );
    } catch (error) {
      if (sequence !== verificationSequence.current) return;
      setMessage(error instanceof Error ? error.message : "地图搜索暂时不可用");
    } finally {
      if (sequence === verificationSequence.current) setBusy(false);
    }
  }

  async function verifySelectedPlace(
    providerPlaceId: string,
    placeName: string,
  ) {
    const sequence = ++verificationSequence.current;
    setBusy(true);
    setMessage("正在由服务端复核门店地址与行政地区…");
    setVerification(undefined);
    clearPendingReplacement();
    try {
      const result = await verifyStoreLocation(apiBaseUrl, {
        ...(latestBrandId.current ? { brandId: latestBrandId.current } : {}),
        searchInput: activeSearchInput.current || placeName,
        providerPlaceId,
      });
      if (sequence !== verificationSequence.current) return;
      setVerification(result);
      emitChange({
        ...latestValue.current,
        locationChange: {
          action: "REPLACE",
          verificationReceipt: result.verificationReceipt,
        },
      });
      setMessage("门店已复核，评测位置范围已根据高德地址自动确定");
    } catch (error) {
      if (sequence !== verificationSequence.current) return;
      setMessage(error instanceof Error ? error.message : "门店复核失败");
    } finally {
      if (sequence === verificationSequence.current) setBusy(false);
    }
  }

  function emitChange(next: BrandMutation) {
    latestValue.current = next;
    latestOnChange.current(next);
  }

  function clearPendingReplacement() {
    if (latestValue.current.locationChange?.action !== "REPLACE") return;
    const { locationChange: _discarded, ...rest } = latestValue.current;
    emitChange(rest);
  }

  function removeCurrentLocation() {
    setVerification(undefined);
    emitChange({
      ...latestValue.current,
      locationChange: { action: "REMOVE" },
    });
  }

  function retainCurrentLocation() {
    const { locationChange: _discarded, ...rest } = latestValue.current;
    emitChange(rest);
  }

  const storedLocation = brand?.storeLocation;
  const removingStoredLocation = value.locationChange?.action === "REMOVE";
  return (
    <fieldset className="wide store-location-fieldset">
      <legend>具体门店 *</legend>
      <p className="field-help">
        直接搜索店名并带上城市、地址或地标。平台不会申请设备定位，也不使用 IP
        自动定位。
      </p>
      {storedLocation && !removingStoredLocation && (
        <div className="stored-location-card">
          <div>
            <strong>{storedLocation.placeName}</strong>
            <span>{storedLocation.formattedAddress}</span>
            <small>
              {storedLocation.officialRegion.city.label} ·{" "}
              {storedLocation.officialRegion.terminal.label} ·{" "}
              {storedLocation.queryLocality.kind === "BUSINESS_AREA"
                ? "商圈"
                : "门店地址范围"}
              ：{storedLocation.queryLocality.label}
            </small>
          </div>
          <button
            type="button"
            className="text-button danger"
            onClick={removeCurrentLocation}
          >
            移除门店
          </button>
        </div>
      )}
      {storedLocation && removingStoredLocation && (
        <div className="stored-location-card is-removed">
          <span>保存后将移除当前门店，品牌会暂时不能进入诊断。</span>
          <button
            type="button"
            className="text-button"
            onClick={retainCurrentLocation}
          >
            撤销移除
          </button>
        </div>
      )}
      <div className="location-search-row">
        <label htmlFor={inputId}>搜索或更换门店</label>
        <div>
          <input
            id={inputId}
            value={query}
            minLength={2}
            maxLength={200}
            autoComplete="off"
            placeholder="例如：广州 星河咖啡 珠江新城"
            onFocus={() => void initializeMap()}
            onChange={(event) => {
              latestQuery.current = event.target.value;
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
          />
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => void search()}
          >
            {busy ? "处理中…" : "在地图中搜索"}
          </button>
        </div>
      </div>
      <div className="amap-place-picker">
        <div
          className={`store-location-map${mapReady ? " is-ready" : ""}`}
          ref={mapContainer}
          aria-label="高德门店地图"
        >
          {!mapReady && (
            <span>{amapJsKey ? "输入门店后加载地图" : "地图服务尚未配置"}</span>
          )}
        </div>
        <div
          id={panelId}
          className="amap-place-search-panel"
          aria-label="高德门店搜索结果"
        />
      </div>
      {verification && (
        <section className="verified-location-card" aria-label="已复核门店">
          <div>
            <span className="verified-badge">已复核</span>
            <strong>{verification.locationPreview.placeName}</strong>
            <p>{verification.locationPreview.formattedAddress}</p>
            <small>
              {verification.locationPreview.officialRegion.province.label} ·{" "}
              {verification.locationPreview.officialRegion.city.label} ·{" "}
              {verification.locationPreview.officialRegion.terminal.label}
            </small>
            <small>
              {verification.queryLocality.kind === "BUSINESS_AREA"
                ? "商圈"
                : "门店地址范围"}
              ：{verification.queryLocality.label}（自动确定）
            </small>
          </div>
        </section>
      )}
      {message && (
        <p className="location-status" role="status">
          {message}
        </p>
      )}
    </fieldset>
  );
}

function selectedPlaceId(event: { id?: unknown; data?: unknown }): string {
  if (typeof event.id === "string") return event.id.trim();
  if (!isRecord(event.data)) return "";
  return typeof event.data.id === "string" ? event.data.id.trim() : "";
}

function selectedPlaceName(value: unknown): string {
  if (!isRecord(value)) return "";
  return typeof value.name === "string" ? value.name.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
