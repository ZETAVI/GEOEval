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

type Candidate = {
  id: string;
  name: string;
  address: string;
  position: [number, number] | null;
};

type AmapRuntime = {
  Map: new (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => AmapMap;
  Marker: new (options: Record<string, unknown>) => AmapMarker;
  PlaceSearch: new (options: Record<string, unknown>) => AmapPlaceSearch;
  AutoComplete: new (options: Record<string, unknown>) => AmapAutoComplete;
};

type AmapMap = {
  destroy(): void;
  setFitView(markers?: AmapMarker[]): void;
};

type AmapMarker = {
  on(event: "click", listener: () => void): void;
  setMap(map: AmapMap | null): void;
};

type AmapPlaceSearch = {
  search(
    keyword: string,
    callback: (status: string, result: unknown) => void,
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
  const mapContainer = useRef<HTMLDivElement>(null);
  const runtime = useRef<AmapRuntime | undefined>(undefined);
  const map = useRef<AmapMap | undefined>(undefined);
  const placeSearch = useRef<AmapPlaceSearch | undefined>(undefined);
  const markers = useRef<AmapMarker[]>([]);
  const loadingPromise = useRef<Promise<void> | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [verification, setVerification] = useState<StoreLocationVerification>();
  const [busy, setBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(
    () => () => {
      clearMarkers(markers.current);
      map.current?.destroy();
      map.current = undefined;
    },
    [],
  );

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
      runtime.current = AMap;
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
      });
      const autocomplete = new AMap.AutoComplete({
        city: "全国",
        citylimit: false,
        input: inputId,
      });
      autocomplete.on("select", (event) => {
        const candidate = normalizePoi(event.poi);
        if (candidate) void selectCandidate(candidate);
      });
      setMapReady(true);
    })().catch((error) => {
      loadingPromise.current = undefined;
      throw error;
    });
    return loadingPromise.current;
  }

  async function search() {
    const searchInput = query.trim();
    if (searchInput.length < 2) {
      setMessage("请至少输入 2 个字，并尽量带上城市、地址或地标");
      return;
    }
    setBusy(true);
    setMessage("");
    setVerification(undefined);
    clearPendingReplacement();
    try {
      await ensureMap();
      const service = placeSearch.current;
      if (!service) throw new Error("地图搜索尚未准备好");
      const result = await new Promise<unknown>((resolve, reject) => {
        service.search(searchInput, (status, response) => {
          if (status === "complete") resolve(response);
          else if (status === "no_data") resolve({});
          else reject(new Error("地图搜索暂时不可用，请稍后重试"));
        });
      });
      const next = extractCandidates(result).slice(0, 10);
      setCandidates(next);
      renderMarkers(next);
      setMessage(
        next.length > 0
          ? `找到 ${next.length} 个候选，请从地图标记或完整地址列表中选择`
          : "没有找到候选，请补充城市、地址或附近地标后重试",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "地图搜索暂时不可用");
    } finally {
      setBusy(false);
    }
  }

  function renderMarkers(next: Candidate[]) {
    clearMarkers(markers.current);
    const AMap = runtime.current;
    const currentMap = map.current;
    if (!AMap || !currentMap) return;
    markers.current = next.flatMap((candidate) => {
      if (!candidate.position) return [];
      const marker = new AMap.Marker({
        map: currentMap,
        position: candidate.position,
        title: candidate.name,
      });
      marker.on("click", () => void selectCandidate(candidate));
      return [marker];
    });
    if (markers.current.length > 0) currentMap.setFitView(markers.current);
  }

  async function selectCandidate(candidate: Candidate) {
    if (!candidate.id) return;
    setBusy(true);
    setMessage("正在由服务端复核门店地址与行政地区…");
    setVerification(undefined);
    clearPendingReplacement();
    try {
      const result = await verifyStoreLocation(apiBaseUrl, {
        ...(brand ? { brandId: brand.id } : {}),
        searchInput: query.trim() || candidate.name,
        providerPlaceId: candidate.id,
      });
      setVerification(result);
      setMessage("门店已复核，请确认用于评测的位置范围");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "门店复核失败");
    } finally {
      setBusy(false);
    }
  }

  function chooseLocality(candidateId: string) {
    if (!verification) return;
    onChange({
      ...value,
      locationChange: {
        action: "REPLACE",
        verificationReceipt: verification.verificationReceipt,
        localityCandidateId: candidateId,
      },
    });
  }

  function clearPendingReplacement() {
    if (value.locationChange?.action !== "REPLACE") return;
    const { locationChange: _discarded, ...rest } = value;
    onChange(rest);
  }

  function removeCurrentLocation() {
    setVerification(undefined);
    onChange({ ...value, locationChange: { action: "REMOVE" } });
  }

  function retainCurrentLocation() {
    const { locationChange: _discarded, ...rest } = value;
    onChange(rest);
  }

  const storedLocation = brand?.storeLocation;
  const removingStoredLocation = value.locationChange?.action === "REMOVE";
  const chosenCandidateId =
    value.locationChange?.action === "REPLACE"
      ? value.locationChange.localityCandidateId
      : undefined;

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
            onChange={(event) => setQuery(event.target.value)}
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
      <div
        className={`store-location-map${mapReady ? " is-ready" : ""}`}
        ref={mapContainer}
        aria-label="高德门店候选地图"
      >
        {!mapReady && (
          <span>{amapJsKey ? "输入门店后加载地图" : "地图服务尚未配置"}</span>
        )}
      </div>
      {candidates.length > 0 && (
        <div className="location-candidate-list" aria-label="门店候选列表">
          {candidates.map((candidate) => (
            <button
              type="button"
              key={candidate.id}
              disabled={busy}
              onClick={() => void selectCandidate(candidate)}
            >
              <strong>{candidate.name}</strong>
              <span>{candidate.address || "高德暂未返回完整地址"}</span>
            </button>
          ))}
        </div>
      )}
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
          </div>
          <fieldset>
            <legend>选择用于评测的位置范围</legend>
            {verification.localityCandidates.map((candidate) => (
              <label key={candidate.id}>
                <input
                  type="radio"
                  name={`${inputId}-locality`}
                  value={candidate.id}
                  checked={chosenCandidateId === candidate.id}
                  onChange={() => chooseLocality(candidate.id)}
                />
                <span>
                  <b>
                    {candidate.kind === "BUSINESS_AREA"
                      ? "商圈"
                      : "门店地址范围"}
                  </b>
                  {candidate.label}
                </span>
              </label>
            ))}
          </fieldset>
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

function extractCandidates(result: unknown): Candidate[] {
  if (!isRecord(result) || !isRecord(result.poiList)) return [];
  const pois = Array.isArray(result.poiList.pois) ? result.poiList.pois : [];
  const seen = new Set<string>();
  return pois.flatMap((poi) => {
    const candidate = normalizePoi(poi);
    if (!candidate || seen.has(candidate.id)) return [];
    seen.add(candidate.id);
    return [candidate];
  });
}

function normalizePoi(value: unknown): Candidate | null {
  if (!isRecord(value)) return null;
  const id = scalar(value.id);
  const name = scalar(value.name);
  if (!id || !name) return null;
  const addressParts = [
    scalar(value.pname),
    scalar(value.cityname),
    scalar(value.adname),
    scalar(value.address),
  ].filter(Boolean);
  return {
    id,
    name,
    address: [...new Set(addressParts)].join(" "),
    position: position(value.location),
  };
}

function position(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length >= 2) {
    const longitude = Number(value[0]);
    const latitude = Number(value[1]);
    return Number.isFinite(longitude) && Number.isFinite(latitude)
      ? [longitude, latitude]
      : null;
  }
  if (isRecord(value)) {
    const longitude =
      typeof value.getLng === "function"
        ? Number(value.getLng())
        : Number(value.lng);
    const latitude =
      typeof value.getLat === "function"
        ? Number(value.getLat())
        : Number(value.lat);
    return Number.isFinite(longitude) && Number.isFinite(latitude)
      ? [longitude, latitude]
      : null;
  }
  return null;
}

function scalar(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clearMarkers(markers: AmapMarker[]) {
  for (const marker of markers) marker.setMap(null);
  markers.length = 0;
}
