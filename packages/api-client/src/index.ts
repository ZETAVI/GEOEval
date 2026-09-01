import type { components } from "./schema.js";

export type FoundationRecord =
  components["schemas"]["FoundationRecordResponse"];
export type Challenge = components["schemas"]["ChallengeResponse"];
export type Account = components["schemas"]["AccountResponse"];
export type Brand = components["schemas"]["BrandResponse"];
export type EvaluationDefinition =
  components["schemas"]["EvaluationDefinitionResponse"];
export type EvaluationRun = components["schemas"]["EvaluationRunResponse"];
export type EvaluationReport =
  components["schemas"]["EvaluationReportResponse"];
export type EvaluationReportSummary =
  components["schemas"]["EvaluationReportSummaryResponse"];
export type EvaluationReportHistory =
  components["schemas"]["EvaluationReportHistoryResponse"];
export type Notification = components["schemas"]["NotificationResponse"];
export type NotificationList =
  components["schemas"]["NotificationListResponse"];
export type IndustryCatalog = components["schemas"]["IndustryCatalogResponse"];
export type RegionOptionList =
  components["schemas"]["RegionOptionListResponse"];
export type CityRegionOptionList =
  components["schemas"]["CityRegionOptionListResponse"];
export type TerminalRegionOptionList =
  components["schemas"]["TerminalRegionOptionListResponse"];

export type BrandMutation = components["schemas"]["BrandMutationRequest"];

async function apiRequest<T>(
  apiBaseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message)
      ? body.message.join("；")
      : body?.message;
    throw new Error(message ?? `请求失败（${response.status}）`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function requestLoginChallenge(
  apiBaseUrl: string,
  mobile: string,
): Promise<Challenge> {
  return apiRequest(apiBaseUrl, "/identity/challenges", {
    method: "POST",
    body: JSON.stringify({ mobile }),
  });
}

export function completeLogin(
  apiBaseUrl: string,
  input: { challengeId: string; mobile: string; code: string },
): Promise<Account> {
  return apiRequest(apiBaseUrl, "/identity/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getCurrentAccount(apiBaseUrl: string): Promise<Account> {
  return apiRequest(apiBaseUrl, "/identity/me", { cache: "no-store" });
}

export function logout(apiBaseUrl: string): Promise<void> {
  return apiRequest(apiBaseUrl, "/identity/session", { method: "DELETE" });
}

export function listBrands(apiBaseUrl: string): Promise<Brand[]> {
  return apiRequest(apiBaseUrl, "/brands", { cache: "no-store" });
}

export function getIndustryCatalog(
  apiBaseUrl: string,
): Promise<IndustryCatalog> {
  return apiRequest(apiBaseUrl, "/brand-reference-data/industries", {
    cache: "force-cache",
  });
}

export function listProvinceRegions(
  apiBaseUrl: string,
): Promise<RegionOptionList> {
  return apiRequest(apiBaseUrl, "/brand-reference-data/regions/provinces", {
    cache: "force-cache",
  });
}

export function listCityRegions(
  apiBaseUrl: string,
  provinceId: string,
): Promise<CityRegionOptionList> {
  return apiRequest(
    apiBaseUrl,
    `/brand-reference-data/regions/provinces/${encodeURIComponent(provinceId)}/cities`,
    { cache: "force-cache" },
  );
}

export function listTerminalRegions(
  apiBaseUrl: string,
  provinceId: string,
  cityId: string,
): Promise<TerminalRegionOptionList> {
  return apiRequest(
    apiBaseUrl,
    `/brand-reference-data/regions/provinces/${encodeURIComponent(provinceId)}/cities/${encodeURIComponent(cityId)}/terminals`,
    { cache: "force-cache" },
  );
}

export function createBrand(
  apiBaseUrl: string,
  input: BrandMutation,
): Promise<Brand> {
  return apiRequest(apiBaseUrl, "/brands", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateBrand(
  apiBaseUrl: string,
  brandId: string,
  input: BrandMutation,
): Promise<Brand> {
  return apiRequest(apiBaseUrl, `/brands/${brandId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function selectCurrentBrand(
  apiBaseUrl: string,
  brandId: string,
): Promise<Brand> {
  return apiRequest(apiBaseUrl, `/brands/${brandId}/current`, {
    method: "PUT",
  });
}

export function prepareEvaluationDefinition(
  apiBaseUrl: string,
  brandId: string,
): Promise<EvaluationDefinition> {
  return apiRequest(apiBaseUrl, `/brands/${brandId}/evaluation-definition`, {
    method: "PUT",
  });
}

export function startEvaluationRun(
  apiBaseUrl: string,
  definitionId: string,
): Promise<EvaluationRun> {
  return apiRequest(
    apiBaseUrl,
    `/evaluation-definitions/${definitionId}/runs`,
    { method: "POST" },
  );
}

export function retryEvaluationRun(
  apiBaseUrl: string,
  runId: string,
): Promise<EvaluationRun> {
  return apiRequest(apiBaseUrl, `/evaluation-runs/${runId}/retries`, {
    method: "POST",
  });
}

export async function getCurrentEvaluationReport(
  apiBaseUrl: string,
  brandId: string,
): Promise<EvaluationReport | null> {
  const result = await apiRequest<
    components["schemas"]["CurrentEvaluationReportResponse"]
  >(apiBaseUrl, `/brands/${brandId}/evaluation-report`, {
    cache: "no-store",
  });
  return result.report;
}

export function listEvaluationReportHistory(
  apiBaseUrl: string,
  brandId: string,
  options: { limit?: number; cursor?: string } = {},
): Promise<EvaluationReportHistory> {
  const query = queryString(options);
  return apiRequest(
    apiBaseUrl,
    `/brands/${brandId}/evaluation-reports${query}`,
    { cache: "no-store" },
  );
}

export function getEvaluationReport(
  apiBaseUrl: string,
  brandId: string,
  reportId: string,
): Promise<EvaluationReport> {
  return apiRequest(
    apiBaseUrl,
    `/brands/${brandId}/evaluation-reports/${reportId}`,
    { cache: "no-store" },
  );
}

export function listNotifications(
  apiBaseUrl: string,
  options: { limit?: number; cursor?: string } = {},
): Promise<NotificationList> {
  return apiRequest(apiBaseUrl, `/notifications${queryString(options)}`, {
    cache: "no-store",
  });
}

export function markNotificationRead(
  apiBaseUrl: string,
  notificationId: string,
): Promise<Notification> {
  return apiRequest(apiBaseUrl, `/notifications/${notificationId}/read`, {
    method: "PUT",
  });
}

export function markAllNotificationsRead(
  apiBaseUrl: string,
): Promise<{ unreadCount: number }> {
  return apiRequest(apiBaseUrl, "/notifications/read-all", { method: "PUT" });
}

function queryString(options: { limit?: number; cursor?: string }): string {
  const query = new URLSearchParams();
  if (options.limit !== undefined) query.set("limit", String(options.limit));
  if (options.cursor) query.set("cursor", options.cursor);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function createFoundationRecord(
  apiBaseUrl: string,
  name: string,
): Promise<FoundationRecord> {
  const response = await fetch(`${apiBaseUrl}/foundation/records`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(`Create failed with status ${response.status}`);
  }
  return (await response.json()) as FoundationRecord;
}

export async function getFoundationRecord(
  apiBaseUrl: string,
  id: string,
): Promise<FoundationRecord> {
  const response = await fetch(`${apiBaseUrl}/foundation/records/${id}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Read failed with status ${response.status}`);
  }
  return (await response.json()) as FoundationRecord;
}
