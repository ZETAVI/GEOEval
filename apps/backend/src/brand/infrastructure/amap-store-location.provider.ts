import { Inject, Injectable } from "@nestjs/common";

import {
  StoreLocationProviderError,
  type ProviderPlaceEvidence,
  type StoreLocationProvider,
  type StoreLocationProviderFailureCode,
} from "../domain/store-location.provider.js";
import {
  STORE_LOCATION_CONFIG,
  type StoreLocationRuntimeConfig,
} from "./store-location.config.js";

@Injectable()
export class AmapStoreLocationProvider implements StoreLocationProvider {
  constructor(
    @Inject(STORE_LOCATION_CONFIG)
    private readonly config: StoreLocationRuntimeConfig,
  ) {}

  async resolveSelectedPlace(input: {
    providerPlaceId: string;
  }): Promise<ProviderPlaceEvidence> {
    const providerPlaceId = input.providerPlaceId.trim();
    if (!providerPlaceId || providerPlaceId.length > 120) {
      throw new StoreLocationProviderError(
        "PLACE_NOT_FOUND",
        "门店选择无效，请重新搜索",
      );
    }
    const detail = await this.request("/v5/place/detail", {
      id: providerPlaceId,
      show_fields: "business",
      output: "json",
    });
    const detailPoi = array(detail.pois)[0];
    if (!record(detailPoi)) {
      throw new StoreLocationProviderError(
        "PLACE_NOT_FOUND",
        "该门店已无法验证，请重新搜索",
      );
    }
    const location = scalar(detailPoi.location);
    const [longitude, latitude] = parseLocation(location);
    const reverse = await this.request("/v3/geocode/regeo", {
      location: `${longitude.toFixed(6)},${latitude.toFixed(6)}`,
      extensions: "all",
      output: "json",
    });
    const regeocode = record(reverse.regeocode) ? reverse.regeocode : undefined;
    const component = record(regeocode?.addressComponent)
      ? regeocode.addressComponent
      : undefined;
    if (!regeocode || !component) {
      throw new StoreLocationProviderError(
        "PROVIDER_UNAVAILABLE",
        "位置服务暂时无法完成验证",
      );
    }
    const detailAdcode = scalar(detailPoi.adcode);
    const reverseAdcode = scalar(component.adcode);
    if (!/^\d{6}$/.test(detailAdcode) || detailAdcode !== reverseAdcode) {
      throw new StoreLocationProviderError(
        "PROVIDER_UNAVAILABLE",
        "门店地址信息暂时不一致，请稍后重试",
      );
    }
    const business = record(detailPoi.business) ? detailPoi.business : {};
    const reverseAreas = array(component.businessAreas)
      .map((item) => (record(item) ? scalar(item.name) : ""))
      .filter(Boolean);
    const businessAreaLabels = unique([
      scalar(business.business_area),
      ...reverseAreas,
    ]);
    return {
      providerPlaceId,
      placeName: requiredScalar(detailPoi.name, "门店名称"),
      formattedAddress:
        scalar(regeocode.formatted_address) ||
        requiredScalar(detailPoi.address, "门店地址"),
      coordinate: { longitude, latitude, system: "GCJ_02" },
      provinceName: requiredScalar(component.province, "省级地址"),
      cityName:
        nullableScalar(component.city) || nullableScalar(detailPoi.cityname),
      districtName:
        nullableScalar(component.district) || nullableScalar(detailPoi.adname),
      townshipName: nullableScalar(component.township),
      adcode: reverseAdcode,
      towncode: nullableScalar(component.towncode),
      businessAreaLabels,
      providerContractVersion: "amap-js-v2+place-v5+regeo-v3@1",
      verifiedAt: new Date(),
    };
  }

  private async request(
    path: string,
    parameters: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const url = new URL(path, this.config.amapBaseUrl);
    for (const [key, value] of Object.entries({
      ...parameters,
      key: this.config.amapWebServiceKey,
    })) {
      url.searchParams.set(key, value);
    }
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs,
    );
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        throw new StoreLocationProviderError(
          "PROVIDER_UNAVAILABLE",
          "位置服务暂时不可用",
        );
      }
      const body: unknown = await response.json();
      if (!record(body)) {
        throw new StoreLocationProviderError(
          "PROVIDER_UNAVAILABLE",
          "位置服务返回格式异常",
        );
      }
      if (scalar(body.status) !== "1" || scalar(body.infocode) !== "10000") {
        throw new StoreLocationProviderError(
          classifyInfocode(scalar(body.infocode)),
          "位置服务暂时无法完成验证",
        );
      }
      return body;
    } catch (error) {
      if (error instanceof StoreLocationProviderError) throw error;
      throw new StoreLocationProviderError(
        "PROVIDER_UNAVAILABLE",
        "位置服务请求超时或不可用",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function classifyInfocode(code: string): StoreLocationProviderFailureCode {
  if (["10003", "10004", "10020", "10021", "10044"].includes(code)) {
    return "PROVIDER_CAPACITY";
  }
  if (
    [
      "10001",
      "10002",
      "10005",
      "10007",
      "10008",
      "10009",
      "10010",
      "10011",
      "10012",
    ].includes(code)
  ) {
    return "PROVIDER_CONFIGURATION";
  }
  return "PROVIDER_UNAVAILABLE";
}

function parseLocation(value: string): [number, number] {
  const [longitudeText, latitudeText, extra] = value.split(",");
  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);
  if (
    extra !== undefined ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new StoreLocationProviderError(
      "PROVIDER_UNAVAILABLE",
      "门店坐标格式异常",
    );
  }
  return [longitude, latitude];
}

function requiredScalar(value: unknown, label: string): string {
  const normalized = scalar(value);
  if (!normalized) {
    throw new StoreLocationProviderError(
      "PROVIDER_UNAVAILABLE",
      `${label}缺失`,
    );
  }
  return normalized;
}

function nullableScalar(value: unknown): string | null {
  return scalar(value) || null;
}

function scalar(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unique(values: string[]): string[] {
  return [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ].slice(0, 10);
}
