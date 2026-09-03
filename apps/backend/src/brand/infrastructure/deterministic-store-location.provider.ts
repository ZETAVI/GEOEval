import { Injectable } from "@nestjs/common";

import {
  StoreLocationProviderError,
  type ProviderPlaceEvidence,
  type StoreLocationProvider,
} from "../domain/store-location.provider.js";

const fixtures: Record<string, Omit<ProviderPlaceEvidence, "verifiedAt">> = {
  "fixture-guangzhou-tower": {
    providerPlaceId: "fixture-guangzhou-tower",
    placeName: "广州塔",
    formattedAddress: "广东省广州市海珠区阅江西路222号",
    coordinate: {
      longitude: 113.324553,
      latitude: 23.106414,
      system: "GCJ_02",
    },
    provinceName: "广东省",
    cityName: "广州市",
    districtName: "海珠区",
    townshipName: "赤岗街道",
    adcode: "440105",
    towncode: "440105001000",
    businessAreaLabels: ["赤岗", "客村"],
    providerContractVersion: "amap-js-v2+place-v5+regeo-v3@1",
  },
  "fixture-palace-museum": {
    providerPlaceId: "fixture-palace-museum",
    placeName: "故宫博物院",
    formattedAddress: "北京市东城区景山前街4号",
    coordinate: {
      longitude: 116.397026,
      latitude: 39.918058,
      system: "GCJ_02",
    },
    provinceName: "北京市",
    cityName: null,
    districtName: "东城区",
    townshipName: "东华门街道",
    adcode: "110101",
    towncode: "110101001000",
    businessAreaLabels: [],
    providerContractVersion: "amap-js-v2+place-v5+regeo-v3@1",
  },
  "fixture-dongguan-service-center": {
    providerPlaceId: "fixture-dongguan-service-center",
    placeName: "东莞市民服务中心",
    formattedAddress: "广东省东莞市南城街道鸿福路199号",
    coordinate: {
      longitude: 113.751765,
      latitude: 23.020536,
      system: "GCJ_02",
    },
    provinceName: "广东省",
    cityName: "东莞市",
    districtName: null,
    townshipName: "南城街道",
    adcode: "441900",
    towncode: "441900004000",
    businessAreaLabels: ["南城"],
    providerContractVersion: "amap-js-v2+place-v5+regeo-v3@1",
  },
};

@Injectable()
export class DeterministicStoreLocationProvider implements StoreLocationProvider {
  async resolveSelectedPlace(input: {
    providerPlaceId: string;
  }): Promise<ProviderPlaceEvidence> {
    const fixture = fixtures[input.providerPlaceId];
    if (!fixture) {
      throw new StoreLocationProviderError(
        "PLACE_NOT_FOUND",
        "未找到该门店，请重新搜索",
      );
    }
    return { ...fixture, verifiedAt: new Date() };
  }
}

@Injectable()
export class DisabledStoreLocationProvider implements StoreLocationProvider {
  async resolveSelectedPlace(): Promise<ProviderPlaceEvidence> {
    throw new StoreLocationProviderError(
      "PROVIDER_CONFIGURATION",
      "位置服务暂未启用",
    );
  }
}
