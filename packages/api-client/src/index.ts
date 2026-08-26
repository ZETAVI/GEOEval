import type { components } from "./schema.js";

export type FoundationRecord =
  components["schemas"]["FoundationRecordResponse"];
export type Challenge = components["schemas"]["ChallengeResponse"];
export type Account = components["schemas"]["AccountResponse"];
export type Brand = components["schemas"]["BrandResponse"];
export type EvaluationDefinition =
  components["schemas"]["EvaluationDefinitionResponse"];
export type EvaluationRun = components["schemas"]["EvaluationRunResponse"];

export type BrandMutation = {
  companyName?: string | null;
  primaryIndustry?: string | null;
  secondaryIndustry?: string | null;
  characteristicOne?: string | null;
  characteristicTwo?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  contactName?: string | null;
  contactMobile?: string | null;
};

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
