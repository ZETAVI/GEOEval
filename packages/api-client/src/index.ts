import type { components } from "./schema.js";

export type FoundationRecord =
  components["schemas"]["FoundationRecordResponse"];
export type Challenge = components["schemas"]["ChallengeResponse"];
export type Account = components["schemas"]["AccountResponse"];
export type PointBalance = components["schemas"]["PointBalanceResponse"];
export type PointAdminBalance =
  components["schemas"]["PointAdminBalanceResponse"];
export type PointAdjustment = components["schemas"]["PointAdjustmentRequest"];
export type PointChange = components["schemas"]["PointChangeResponse"];
export type PointAdminChange =
  components["schemas"]["PointAdminChangeResponse"];
export type PointHistory = components["schemas"]["PointHistoryResponse"];
export type PointAdminHistory =
  components["schemas"]["PointAdminHistoryResponse"];
export type PublishingPackage =
  components["schemas"]["PublishingPackageCustomerResponse"];
export type PublishingWorkspace =
  components["schemas"]["PublishingWorkspaceResponse"];
export type PublishingSelection =
  components["schemas"]["PublishingSelectionResponse"];
export type SavePublishingSelection =
  components["schemas"]["SavePublishingSelectionRequest"];
export type PublishingQuote = components["schemas"]["PublishingQuoteResponse"];
export type PurchasedTerms = components["schemas"]["PurchasedTermsResponse"];
export type SubmitPublishingOrder =
  components["schemas"]["SubmitPublishingOrderRequest"];
export type PublishingOrder = components["schemas"]["PublishingOrderResponse"];
export type PublishingOrderPage =
  components["schemas"]["PublishingOrderPageResponse"];
export type OperationalOrder =
  components["schemas"]["OperationalOrderResponse"];
export type DeliveryOrderPage = components["schemas"]["OperationalOrderPage"];
export type PublicationWorkPage =
  components["schemas"]["PublicationWorkPageResponse"];
export type PublicationWorkItem =
  components["schemas"]["PublicationWorkItemResponse"];
export type CustomerPublicationPage =
  components["schemas"]["CustomerPublicationPageResponse"];
export type PublicationWorkHistory =
  components["schemas"]["PublicationWorkAuditResponse"][];
export type PublicationWorkCommand =
  | components["schemas"]["BeginPublicationRequest"]
  | components["schemas"]["PreparePublicationRequest"]
  | components["schemas"]["SavePublicationDraftRequest"]
  | components["schemas"]["RecordPublicationResultRequest"]
  | components["schemas"]["CorrectPublicationResultRequest"]
  | components["schemas"]["ReplacePublicationTargetRequest"];
export type SaveDeliveryResolution =
  components["schemas"]["SaveDeliveryResolutionRequest"];
export type DeliveryException =
  components["schemas"]["DeliveryExceptionRequest"];
export type SettleDeliveryReturn =
  components["schemas"]["SettleDeliveryReturnRequest"];
export type DeliveryReturnReceipt =
  components["schemas"]["DeliveryReturnReceipt"];
export type DeliveryReplacementTargets =
  components["schemas"]["DeliveryReplacementTargetsResponse"];
export type DeliveryOrderState =
  "ACTIVE" | "COMPLETED" | "CLOSED" | "PENDING_RETURN";
export type DeliveryActionRequest =
  components["schemas"]["AssignmentRequest"] & {
    reason?: string;
    assigneeAccountId?: string;
  };
export type CustomerMediaPlatform =
  components["schemas"]["MediaPlatformCustomerResponse"];
export type CustomerMediaPage =
  components["schemas"]["MediaPlatformPageResponse"];
export type MediaCategory = components["schemas"]["MediaCategoryResponse"];
export type PublishingPackageAdmin =
  components["schemas"]["PublishingPackageAdminResponse"];
export type PublishingPackageCreate =
  components["schemas"]["PublishingPackageCreateRequest"];
export type PublishingPackageUpdate =
  components["schemas"]["PublishingPackageUpdateRequest"];
export type PublishingPackageAudit =
  components["schemas"]["PublishingPackageAuditResponse"];
export type SessionAuthenticationError =
  components["schemas"]["SessionAuthenticationErrorResponse"];
export type SessionAuthenticationFailureCode =
  SessionAuthenticationError["code"];
export type AccountSummary = components["schemas"]["AccountSummaryResponse"];
export type AccountList = components["schemas"]["AccountListResponse"];
export type IdentityGovernanceAudit =
  components["schemas"]["IdentityGovernanceAuditResponse"];
export type IdentityGovernanceAuditList =
  components["schemas"]["IdentityGovernanceAuditListResponse"];
export type CreateInternalAccount =
  components["schemas"]["CreateInternalAccountRequest"];
export type ChangeAccountStatus =
  components["schemas"]["ChangeAccountStatusRequest"];
export type ChangeAccountRole =
  components["schemas"]["ChangeAccountRoleRequest"];
export type GovernedAccountMutation =
  components["schemas"]["GovernedAccountMutationRequest"];
export type Brand = components["schemas"]["BrandResponse"];
export type GeoOptimizationWorkspace =
  components["schemas"]["GeoOptimizationWorkspaceResponse"];
export type GeoOptimizationGeneration =
  components["schemas"]["GeoOptimizationGenerationResponse"];
export type GeoOptimizationArticle =
  components["schemas"]["GeoOptimizationArticleResponse"];
export type GenerateCoreArticle =
  components["schemas"]["GenerateCoreArticleRequest"];
export type SaveCoreArticle = components["schemas"]["SaveCoreArticleRequest"];
export type ConfirmCoreArticle =
  components["schemas"]["ConfirmCoreArticleRequest"];
export type EvaluationDefinition =
  components["schemas"]["EvaluationDefinitionResponse"];
export type EvaluationDefinitionPreparation =
  components["schemas"]["EvaluationDefinitionPreparationResponse"];
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
export type NotificationRequestContext = {
  signal?: AbortSignal;
  expectedAccountId?: string;
};
export type IndustryCatalog = components["schemas"]["IndustryCatalogResponse"];
export type MediaPlatformAdmin =
  components["schemas"]["MediaPlatformAdminResponse"];
export type MediaSupplier = components["schemas"]["MediaSupplierResponse"];
export type MediaSupplierDetail =
  components["schemas"]["MediaSupplierDetailResponse"];
export type MediaResourceAdmin =
  components["schemas"]["MediaResourceAdminResponse"];
export type MediaCatalogAudit =
  components["schemas"]["MediaCatalogAuditResponse"];
export type StoreLocationVerification =
  components["schemas"]["StoreLocationVerificationResponse"];
export type StoreLocationVerificationInput =
  components["schemas"]["StoreLocationVerificationRequest"];

export type BrandMutation = components["schemas"]["BrandMutationRequest"];
export type BrandUpdate = components["schemas"]["BrandUpdateRequest"];
export type MediaPlatformCreate =
  components["schemas"]["MediaPlatformCreateRequest"];
export type MediaPlatformUpdate =
  components["schemas"]["MediaPlatformUpdateRequest"];
export type MediaSupplierCreate =
  components["schemas"]["MediaSupplierCreateRequest"];
export type MediaSupplierUpdate =
  components["schemas"]["MediaSupplierUpdateRequest"];
export type MediaResourceCreate =
  components["schemas"]["MediaResourceCreateRequest"];
export type MediaResourceUpdate =
  components["schemas"]["MediaResourceUpdateRequest"];
export type MediaResourceBatchStatus =
  components["schemas"]["MediaResourceBatchStatusRequest"];
export type MediaResourceDelete =
  components["schemas"]["MediaResourceDeleteRequest"];
export type MediaResourceDeleteResult =
  components["schemas"]["MediaResourceDeleteResponse"];
export type MediaDeleteOwner = components["schemas"]["MediaDeleteOwnerRequest"];

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function apiRequest<T>(
  apiBaseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const changesState = !["GET", "HEAD", "OPTIONS"].includes(method);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(changesState
        ? {
            "content-type": "application/json",
            "x-geoeval-request": "1",
          }
        : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      { code?: string; message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message)
      ? body.message.join("；")
      : body?.message;
    throw new ApiRequestError(
      message ?? `请求失败（${response.status}）`,
      response.status,
      body?.code,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getPointBalance(
  baseUrl: string,
  signal?: AbortSignal,
  expectedAccountId?: string,
): Promise<PointBalance> {
  return apiRequest(baseUrl, "/points", {
    ...(expectedAccountId
      ? { headers: { "x-geoeval-account": expectedAccountId } }
      : {}),
    cache: "no-store",
    signal: signal ?? null,
  });
}
export function getPointHistory(
  baseUrl: string,
  beforeSequence?: number,
): Promise<PointHistory> {
  return apiRequest(
    baseUrl,
    `/points/changes${beforeSequence ? `?beforeSequence=${beforeSequence}` : ""}`,
    { cache: "no-store" },
  );
}
export function getAdminPointBalance(
  baseUrl: string,
  accountId: string,
): Promise<PointAdminBalance> {
  return apiRequest(
    baseUrl,
    `/admin/points/accounts/${encodeURIComponent(accountId)}`,
    { cache: "no-store" },
  );
}
export function getAdminPointHistory(
  baseUrl: string,
  accountId: string,
  beforeSequence?: number,
): Promise<PointAdminHistory> {
  return apiRequest(
    baseUrl,
    `/admin/points/accounts/${encodeURIComponent(accountId)}/changes${beforeSequence ? `?beforeSequence=${beforeSequence}` : ""}`,
    { cache: "no-store" },
  );
}
export function adjustGrantedPoints(
  baseUrl: string,
  accountId: string,
  input: PointAdjustment,
): Promise<PointAdminChange> {
  return apiRequest(
    baseUrl,
    `/admin/points/accounts/${encodeURIComponent(accountId)}/adjustments`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function listPublishingPackages(
  baseUrl: string,
): Promise<PublishingPackage[]> {
  return apiRequest(baseUrl, "/publishing/packages");
}

export function getPublishingWorkspace(
  apiBaseUrl: string,
): Promise<PublishingWorkspace> {
  return apiRequest(apiBaseUrl, "/publishing/workspace", { cache: "no-store" });
}
export function savePublishingSelection(
  apiBaseUrl: string,
  brandId: string,
  input: SavePublishingSelection,
): Promise<PublishingSelection> {
  return apiRequest(
    apiBaseUrl,
    `/publishing/brands/${encodeURIComponent(brandId)}/selection`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}
export function submitPublishingOrder(
  baseUrl: string,
  input: SubmitPublishingOrder,
): Promise<PublishingOrder> {
  return apiRequest(baseUrl, "/publishing/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function getPublishingOrder(
  baseUrl: string,
  id: string,
): Promise<PublishingOrder> {
  return apiRequest(baseUrl, `/publishing/orders/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}
export function listDeliveryOrders(
  baseUrl: string,
  scope: "POOL" | "MINE" | "ALL",
  state: DeliveryOrderState = "ACTIVE",
  cursor?: NonNullable<DeliveryOrderPage["nextCursor"]>,
): Promise<DeliveryOrderPage> {
  const query = new URLSearchParams({
    scope,
    state,
    ...(cursor
      ? {
          cursorCreatedAt: cursor.createdAt,
          cursorSequence: String(cursor.sequence),
        }
      : {}),
  });
  return apiRequest(baseUrl, `/delivery/orders?${query}`, {
    cache: "no-store",
  });
}
export function getDeliveryOrder(
  baseUrl: string,
  id: string,
): Promise<OperationalOrder> {
  return apiRequest(baseUrl, `/delivery/orders/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}
export function actOnDeliveryOrder(
  baseUrl: string,
  id: string,
  action: "claim" | "start" | "return" | "reassign",
  input: DeliveryActionRequest,
): Promise<{ orderId: string; revision: number }> {
  return apiRequest(
    baseUrl,
    `/delivery/orders/${encodeURIComponent(id)}/${action}`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
export function listPublishingOrders(
  baseUrl: string,
  input: { brandId?: string; beforeNumber?: number } = {},
): Promise<PublishingOrderPage> {
  const query = new URLSearchParams({
    ...(input.brandId ? { brandId: input.brandId } : {}),
    ...(input.beforeNumber ? { beforeNumber: String(input.beforeNumber) } : {}),
  });
  return apiRequest(baseUrl, `/publishing/orders?${query}`, {
    cache: "no-store",
  });
}
export function saveDeliveryResolution(
  baseUrl: string,
  orderId: string,
  input: SaveDeliveryResolution,
): Promise<{ orderId: string; revision: number }> {
  return apiRequest(
    baseUrl,
    `/delivery/orders/${encodeURIComponent(orderId)}/resolution`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
export function recordDeliveryException(
  baseUrl: string,
  orderId: string,
  input: DeliveryException,
): Promise<{ orderId: string; revision: number }> {
  return apiRequest(
    baseUrl,
    `/delivery/orders/${encodeURIComponent(orderId)}/exception`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
export function settleDeliveryReturn(
  baseUrl: string,
  orderId: string,
  input: SettleDeliveryReturn,
): Promise<DeliveryReturnReceipt> {
  return apiRequest(
    baseUrl,
    `/delivery/orders/${encodeURIComponent(orderId)}/settlement`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
export function listDeliveryReplacementTargets(
  baseUrl: string,
  orderId: string,
  cursor?: string,
): Promise<DeliveryReplacementTargets> {
  const query = new URLSearchParams(cursor ? { cursor } : {});
  return apiRequest(
    baseUrl,
    `/delivery/orders/${encodeURIComponent(orderId)}/replacement-targets?${query}`,
    {
      cache: "no-store",
    },
  );
}
export function getPublicationWork(
  baseUrl: string,
  orderId: string,
  afterSlot = 0,
): Promise<PublicationWorkPage> {
  return apiRequest(
    baseUrl,
    `/delivery/orders/${encodeURIComponent(orderId)}/work?afterSlot=${afterSlot}`,
    { cache: "no-store" },
  );
}
export function savePublicationWork(
  baseUrl: string,
  orderId: string,
  slot: number,
  input: PublicationWorkCommand,
): Promise<components["schemas"]["PublicationWorkReceiptResponse"]> {
  return apiRequest(
    baseUrl,
    `/delivery/orders/${encodeURIComponent(orderId)}/work/${slot}`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
export function getPublicationWorkHistory(
  baseUrl: string,
  orderId: string,
  slot: number,
): Promise<PublicationWorkHistory> {
  return apiRequest(
    baseUrl,
    `/delivery/orders/${encodeURIComponent(orderId)}/work/${slot}/history`,
    { cache: "no-store" },
  );
}
export function getCustomerPublicationResults(
  baseUrl: string,
  orderId: string,
  afterSlot = 0,
): Promise<CustomerPublicationPage> {
  return apiRequest(
    baseUrl,
    `/publishing/orders/${encodeURIComponent(orderId)}/results?afterSlot=${afterSlot}`,
    { cache: "no-store" },
  );
}
export function listCustomerMedia(
  apiBaseUrl: string,
  input: { category?: string; cursor?: string } = {},
): Promise<CustomerMediaPage> {
  const query = new URLSearchParams({ limit: "20", ...input });
  return apiRequest(apiBaseUrl, `/media-catalog/platforms?${query}`, {
    cache: "no-store",
  });
}
export function listMediaCategories(
  apiBaseUrl: string,
): Promise<MediaCategory[]> {
  return apiRequest(apiBaseUrl, "/media-catalog/categories", {
    cache: "no-store",
  });
}
export function listAdminPublishingPackages(
  baseUrl: string,
): Promise<PublishingPackageAdmin[]> {
  return apiRequest(baseUrl, "/admin/publishing/packages");
}
export function createAdminPublishingPackage(
  baseUrl: string,
  input: PublishingPackageCreate,
): Promise<PublishingPackageAdmin> {
  return apiRequest(baseUrl, "/admin/publishing/packages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function updateAdminPublishingPackage(
  baseUrl: string,
  id: string,
  input: PublishingPackageUpdate,
): Promise<PublishingPackageAdmin> {
  return apiRequest(
    baseUrl,
    `/admin/publishing/packages/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}
export function listPublishingPackageAudits(
  baseUrl: string,
  id: string,
): Promise<PublishingPackageAudit[]> {
  return apiRequest(
    baseUrl,
    `/admin/publishing/packages/${encodeURIComponent(id)}/audits`,
  );
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

export function logoutAllSessions(apiBaseUrl: string): Promise<void> {
  return apiRequest(apiBaseUrl, "/identity/sessions", { method: "DELETE" });
}

export function listAdminAccounts(
  apiBaseUrl: string,
  options: {
    search?: string;
    role?: Account["role"];
    status?: Account["status"];
    cursor?: string;
    limit?: number;
  } = {},
): Promise<AccountList> {
  const query = new URLSearchParams();
  if (options.search) query.set("search", options.search);
  if (options.role) query.set("role", options.role);
  if (options.status) query.set("status", options.status);
  if (options.cursor) query.set("cursor", options.cursor);
  if (options.limit !== undefined) query.set("limit", String(options.limit));
  const suffix = query.size ? `?${query.toString()}` : "";
  return apiRequest(apiBaseUrl, `/admin/accounts${suffix}`, {
    cache: "no-store",
  });
}

export function listIdentityGovernanceAudits(
  apiBaseUrl: string,
  options: { targetAccountId?: string; cursor?: string; limit?: number } = {},
): Promise<IdentityGovernanceAuditList> {
  const query = new URLSearchParams();
  if (options.targetAccountId) {
    query.set("targetAccountId", options.targetAccountId);
  }
  if (options.cursor) query.set("cursor", options.cursor);
  if (options.limit !== undefined) query.set("limit", String(options.limit));
  const suffix = query.size ? `?${query.toString()}` : "";
  return apiRequest(apiBaseUrl, `/admin/accounts/audits${suffix}`, {
    cache: "no-store",
  });
}

export function createAdminInternalAccount(
  apiBaseUrl: string,
  input: CreateInternalAccount,
): Promise<Account> {
  return apiRequest(apiBaseUrl, "/admin/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeAdminAccountStatus(
  apiBaseUrl: string,
  accountId: string,
  input: ChangeAccountStatus,
): Promise<Account> {
  return apiRequest(
    apiBaseUrl,
    `/admin/accounts/${encodeURIComponent(accountId)}/status`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function changeAdminAccountRole(
  apiBaseUrl: string,
  accountId: string,
  input: ChangeAccountRole,
): Promise<Account> {
  return apiRequest(
    apiBaseUrl,
    `/admin/accounts/${encodeURIComponent(accountId)}/role`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function revokeAdminAccountSessions(
  apiBaseUrl: string,
  accountId: string,
  input: GovernedAccountMutation,
): Promise<Account> {
  return apiRequest(
    apiBaseUrl,
    `/admin/accounts/${encodeURIComponent(accountId)}/sessions`,
    { method: "DELETE", body: JSON.stringify(input) },
  );
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

export function verifyStoreLocation(
  apiBaseUrl: string,
  input: StoreLocationVerificationInput,
): Promise<StoreLocationVerification> {
  return apiRequest(apiBaseUrl, "/brand-location-verifications", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
  input: BrandUpdate,
): Promise<Brand> {
  return apiRequest(apiBaseUrl, `/brands/${brandId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function selectCurrentBrand(
  apiBaseUrl: string,
  brandId: string,
  request?: { signal?: AbortSignal; expectedAccountId?: string },
): Promise<Brand> {
  return apiRequest(apiBaseUrl, `/brands/${brandId}/current`, {
    method: "PUT",
    ...(request?.signal ? { signal: request.signal } : {}),
    ...(request?.expectedAccountId
      ? { headers: { "x-geoeval-account": request.expectedAccountId } }
      : {}),
  });
}

export function getGeoOptimizationWorkspace(
  apiBaseUrl: string,
): Promise<GeoOptimizationWorkspace> {
  return apiRequest(apiBaseUrl, "/geo-optimization/workspace", {
    cache: "no-store",
  });
}

export function generateCoreArticle(
  apiBaseUrl: string,
  brandId: string,
  input: GenerateCoreArticle,
): Promise<GeoOptimizationGeneration> {
  return apiRequest(
    apiBaseUrl,
    `/brands/${encodeURIComponent(brandId)}/article-generations`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function retryCoreArticleGeneration(
  apiBaseUrl: string,
  brandId: string,
  generationId: string,
): Promise<GeoOptimizationGeneration> {
  return apiRequest(
    apiBaseUrl,
    `/brands/${encodeURIComponent(brandId)}/article-generations/${encodeURIComponent(generationId)}/retries`,
    { method: "POST" },
  );
}

export function saveCoreArticle(
  apiBaseUrl: string,
  brandId: string,
  articleId: string,
  input: SaveCoreArticle,
): Promise<GeoOptimizationArticle> {
  return apiRequest(
    apiBaseUrl,
    `/brands/${encodeURIComponent(brandId)}/core-article/${encodeURIComponent(articleId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function confirmCoreArticle(
  apiBaseUrl: string,
  brandId: string,
  articleId: string,
  input: ConfirmCoreArticle,
): Promise<GeoOptimizationArticle> {
  return apiRequest(
    apiBaseUrl,
    `/brands/${encodeURIComponent(brandId)}/core-article/${encodeURIComponent(articleId)}/confirmations`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function prepareEvaluationDefinition(
  apiBaseUrl: string,
  brandId: string,
): Promise<EvaluationDefinitionPreparation> {
  return apiRequest(apiBaseUrl, `/brands/${brandId}/evaluation-definition`, {
    method: "PUT",
  });
}

export async function getEvaluationDefinitionPreparation(
  apiBaseUrl: string,
  brandId: string,
): Promise<EvaluationDefinitionPreparation | null> {
  const result = await apiRequest<
    components["schemas"]["CurrentEvaluationDefinitionPreparationResponse"]
  >(apiBaseUrl, `/brands/${brandId}/evaluation-definition`, {
    cache: "no-store",
  });
  return result.preparation ?? null;
}

export function retryEvaluationDefinitionPreparation(
  apiBaseUrl: string,
  preparationId: string,
): Promise<EvaluationDefinitionPreparation> {
  return apiRequest(
    apiBaseUrl,
    `/evaluation-question-preparations/${preparationId}/retries`,
    { method: "POST" },
  );
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
  request?: NotificationRequestContext,
): Promise<NotificationList> {
  return apiRequest(apiBaseUrl, `/notifications${queryString(options)}`, {
    ...notificationRequestInit(request),
  });
}

export function markNotificationRead(
  apiBaseUrl: string,
  notificationId: string,
  request?: NotificationRequestContext,
): Promise<Notification> {
  return apiRequest(apiBaseUrl, `/notifications/${notificationId}/read`, {
    method: "PUT",
    ...notificationRequestInit(request),
  });
}

export function markAllNotificationsRead(
  apiBaseUrl: string,
  request?: NotificationRequestContext,
): Promise<{ unreadCount: number }> {
  return apiRequest(apiBaseUrl, "/notifications/read-all", {
    method: "PUT",
    ...notificationRequestInit(request),
  });
}

function notificationRequestInit(
  request?: NotificationRequestContext,
): RequestInit {
  return {
    cache: "no-store",
    ...(request?.signal ? { signal: request.signal } : {}),
    ...(request?.expectedAccountId
      ? { headers: { "x-geoeval-account": request.expectedAccountId } }
      : {}),
  };
}

export function listAdminMediaPlatforms(
  apiBaseUrl: string,
): Promise<MediaPlatformAdmin[]> {
  return apiRequest(apiBaseUrl, "/admin/media/platforms", {
    cache: "no-store",
  });
}

export function getAdminMediaPlatform(
  apiBaseUrl: string,
  platformId: string,
): Promise<MediaPlatformAdmin> {
  return apiRequest(
    apiBaseUrl,
    `/admin/media/platforms/${encodeURIComponent(platformId)}`,
    { cache: "no-store" },
  );
}

export function createAdminMediaPlatform(
  apiBaseUrl: string,
  input: MediaPlatformCreate,
): Promise<MediaPlatformAdmin> {
  return apiRequest(apiBaseUrl, "/admin/media/platforms", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminMediaPlatform(
  apiBaseUrl: string,
  platformId: string,
  input: MediaPlatformUpdate,
): Promise<MediaPlatformAdmin> {
  return apiRequest(
    apiBaseUrl,
    `/admin/media/platforms/${encodeURIComponent(platformId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function deleteAdminMediaPlatform(
  apiBaseUrl: string,
  platformId: string,
  input: MediaDeleteOwner,
): Promise<void> {
  return apiRequest(
    apiBaseUrl,
    `/admin/media/platforms/${encodeURIComponent(platformId)}`,
    { method: "DELETE", body: JSON.stringify(input) },
  );
}

export function listAdminMediaSuppliers(
  apiBaseUrl: string,
): Promise<MediaSupplier[]> {
  return apiRequest(apiBaseUrl, "/admin/media/suppliers", {
    cache: "no-store",
  });
}

export function getAdminMediaSupplier(
  apiBaseUrl: string,
  supplierId: string,
): Promise<MediaSupplierDetail> {
  return apiRequest(
    apiBaseUrl,
    `/admin/media/suppliers/${encodeURIComponent(supplierId)}`,
    { cache: "no-store" },
  );
}

export function createAdminMediaSupplier(
  apiBaseUrl: string,
  input: MediaSupplierCreate,
): Promise<MediaSupplier> {
  return apiRequest(apiBaseUrl, "/admin/media/suppliers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminMediaSupplier(
  apiBaseUrl: string,
  supplierId: string,
  input: MediaSupplierUpdate,
): Promise<MediaSupplier> {
  return apiRequest(
    apiBaseUrl,
    `/admin/media/suppliers/${encodeURIComponent(supplierId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function deleteAdminMediaSupplier(
  apiBaseUrl: string,
  supplierId: string,
  input: MediaDeleteOwner,
): Promise<void> {
  return apiRequest(
    apiBaseUrl,
    `/admin/media/suppliers/${encodeURIComponent(supplierId)}`,
    { method: "DELETE", body: JSON.stringify(input) },
  );
}

export function listAdminMediaResources(
  apiBaseUrl: string,
  platformId: string,
): Promise<MediaResourceAdmin[]> {
  return apiRequest(
    apiBaseUrl,
    `/admin/media/platforms/${encodeURIComponent(platformId)}/resources`,
    { cache: "no-store" },
  );
}

export function createAdminMediaResource(
  apiBaseUrl: string,
  input: MediaResourceCreate,
): Promise<MediaResourceAdmin> {
  return apiRequest(apiBaseUrl, "/admin/media/resources", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminMediaResource(
  apiBaseUrl: string,
  resourceId: string,
  input: MediaResourceUpdate,
): Promise<MediaResourceAdmin> {
  return apiRequest(
    apiBaseUrl,
    `/admin/media/resources/${encodeURIComponent(resourceId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function batchUpdateAdminMediaResourceStatus(
  apiBaseUrl: string,
  input: MediaResourceBatchStatus,
): Promise<MediaResourceAdmin[]> {
  return apiRequest(apiBaseUrl, "/admin/media/resources/status", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminMediaResource(
  apiBaseUrl: string,
  resourceId: string,
  input: MediaResourceDelete,
): Promise<MediaResourceDeleteResult> {
  return apiRequest(
    apiBaseUrl,
    `/admin/media/resources/${encodeURIComponent(resourceId)}`,
    { method: "DELETE", body: JSON.stringify(input) },
  );
}

export function listAdminMediaAudits(
  apiBaseUrl: string,
  options: { entityType?: string; entityId?: string; limit?: number } = {},
): Promise<MediaCatalogAudit[]> {
  const query = new URLSearchParams();
  if (options.entityType) query.set("entityType", options.entityType);
  if (options.entityId) query.set("entityId", options.entityId);
  if (options.limit !== undefined) query.set("limit", String(options.limit));
  const suffix = query.size ? `?${query.toString()}` : "";
  return apiRequest(apiBaseUrl, `/admin/media/audits${suffix}`, {
    cache: "no-store",
  });
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

export type RechargeOptions = components["schemas"]["RechargeOptionsResponse"];
export type RechargeCreate = components["schemas"]["RechargeCreateRequest"];
export type RechargeRead = components["schemas"]["RechargeReadResponse"];
export type RechargePage = components["schemas"]["RechargePageResponse"];
export type RechargeSummary = components["schemas"]["RechargeSummaryResponse"];
function rechargeRequest<T>(
  base: string,
  accountId: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return apiRequest(base, path, {
    ...init,
    cache: "no-store",
    headers: { ...init.headers, "x-geoeval-account": accountId },
  });
}
export function getRechargeOptions(
  base: string,
  accountId: string,
  signal?: AbortSignal,
): Promise<RechargeOptions> {
  return rechargeRequest(base, accountId, "/recharges/options", {
    signal: signal ?? null,
  });
}
export function createRecharge(
  base: string,
  accountId: string,
  input: RechargeCreate,
  signal?: AbortSignal,
): Promise<RechargeRead> {
  return rechargeRequest(base, accountId, "/recharges", {
    method: "POST",
    body: JSON.stringify(input),
    signal: signal ?? null,
  });
}
export function getRecharge(
  base: string,
  accountId: string,
  id: string,
  signal?: AbortSignal,
): Promise<RechargeRead> {
  return rechargeRequest(
    base,
    accountId,
    `/recharges/${encodeURIComponent(id)}`,
    { signal: signal ?? null },
  );
}
export function listRecharges(
  base: string,
  accountId: string,
  options: {
    limit?: number;
    cursor?: string;
    status?: RechargeSummary["status"];
  } = {},
  signal?: AbortSignal,
): Promise<RechargePage> {
  const query = new URLSearchParams();
  if (options.limit !== undefined) query.set("limit", String(options.limit));
  if (options.cursor) query.set("cursor", options.cursor);
  if (options.status) query.set("status", options.status);
  return rechargeRequest(
    base,
    accountId,
    `/recharges${query.size ? `?${query}` : ""}`,
    { signal: signal ?? null },
  );
}
export function requestRechargeVerification(
  base: string,
  accountId: string,
  id: string,
  signal?: AbortSignal,
): Promise<{ accepted: true }> {
  return rechargeRequest(
    base,
    accountId,
    `/recharges/${encodeURIComponent(id)}/verify`,
    { method: "POST", body: "{}", signal: signal ?? null },
  );
}
export function cancelRecharge(
  base: string,
  accountId: string,
  id: string,
  signal?: AbortSignal,
): Promise<{ accepted: true }> {
  return rechargeRequest(
    base,
    accountId,
    `/recharges/${encodeURIComponent(id)}/cancel`,
    { method: "POST", body: "{}", signal: signal ?? null },
  );
}

export type AdminRechargePage =
  components["schemas"]["AdminRechargePageResponse"];
export type AdminRechargeDetail =
  components["schemas"]["AdminRechargeDetailResponse"];
export type AdminRechargeSummary =
  components["schemas"]["AdminRechargeSummaryResponse"];
export type AdminRechargeFilter = {
  accountId?: string;
  orderId?: string;
  status?: RechargeSummary["status"];
  createdFrom?: string;
  createdBefore?: string;
};
export function listAdminRecharges(
  base: string,
  actor: string,
  options: AdminRechargeFilter & { cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
): Promise<AdminRechargePage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options))
    if (value !== undefined && value !== "") query.set(key, String(value));
  return rechargeRequest(
    base,
    actor,
    `/admin/recharges${query.size ? `?${query}` : ""}`,
    { signal: signal ?? null },
  );
}
export function getAdminRecharge(
  base: string,
  actor: string,
  id: string,
  signal?: AbortSignal,
): Promise<AdminRechargeDetail> {
  return rechargeRequest(
    base,
    actor,
    `/admin/recharges/${encodeURIComponent(id)}`,
    { signal: signal ?? null },
  );
}

export function issueAgencyEntry(
  apiBaseUrl: string,
  agentAccountId: string,
): Promise<{ entryKey: string | null }> {
  return apiRequest(
    apiBaseUrl,
    `/agency/agents/${encodeURIComponent(agentAccountId)}/entry`,
    { method: "POST", body: "{}" },
  );
}
export function getOwnAgencyEntry(
  apiBaseUrl: string,
): Promise<{ entryKey: string | null }> {
  return apiRequest(apiBaseUrl, "/agency/entry");
}

export function requestExistingAccountChallenge(
  apiBaseUrl: string,
  mobile: string,
): Promise<Challenge> {
  return apiRequest(apiBaseUrl, "/identity/challenges", {
    method: "POST",
    body: JSON.stringify({ mobile, existingAccountOnly: true }),
  });
}

export type AgencyCustomerList =
  components["schemas"]["AgencyCustomerListResponse"];
export type AgencyCustomerDetail =
  components["schemas"]["AgencyCustomerDetailResponse"];
export type AgencyAdminCustomer =
  components["schemas"]["AgencyAdminCustomerResponse"];
export type AgencyTransfer = components["schemas"]["AgencyTransferRequest"];
export type AgencyTransferResult =
  components["schemas"]["AgencyTransferResponse"];
export function listAgencyCustomers(
  base: string,
  cursor?: string,
): Promise<AgencyCustomerList> {
  return apiRequest(
    base,
    `/agency/customers${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    { cache: "no-store" },
  );
}
export function getAgencyCustomer(
  base: string,
  id: string,
): Promise<AgencyCustomerDetail> {
  return apiRequest(
    base,
    `/agency/customers/${encodeURIComponent(id)}/brands`,
    { cache: "no-store" },
  );
}
export function getAgencyCurrentReport(
  base: string,
  customer: string,
  brand: string,
): Promise<{ report: EvaluationReport | null }> {
  return apiRequest(
    base,
    `/agency/customers/${encodeURIComponent(customer)}/brands/${encodeURIComponent(brand)}/report`,
    { cache: "no-store" },
  );
}
export function getAgencyReportHistory(
  base: string,
  customer: string,
  brand: string,
  cursor?: string,
): Promise<EvaluationReportHistory> {
  return apiRequest(
    base,
    `/agency/customers/${encodeURIComponent(customer)}/brands/${encodeURIComponent(brand)}/reports${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    { cache: "no-store" },
  );
}
export function getAgencyReport(
  base: string,
  customer: string,
  brand: string,
  report: string,
): Promise<EvaluationReport> {
  return apiRequest(
    base,
    `/agency/customers/${encodeURIComponent(customer)}/brands/${encodeURIComponent(brand)}/reports/${encodeURIComponent(report)}`,
    { cache: "no-store" },
  );
}
export function getAdminAgencyCustomer(
  base: string,
  customer: string,
): Promise<AgencyAdminCustomer> {
  return apiRequest(
    base,
    `/agency/admin/customers/${encodeURIComponent(customer)}`,
    { cache: "no-store" },
  );
}
export function transferAgencyCustomer(
  base: string,
  customer: string,
  input: AgencyTransfer,
): Promise<AgencyTransferResult> {
  return apiRequest(
    base,
    `/agency/admin/customers/${encodeURIComponent(customer)}/reassign`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export type AgencyCommissionSettings =
  components["schemas"]["CommissionTermsDetailResponse"];
export type AgencyCommissionUpdate =
  components["schemas"]["CommissionTermsRequest"];
export function getAgencyCommissionSettings(
  base: string,
  agentId: string,
): Promise<AgencyCommissionSettings> {
  return apiRequest(
    base,
    `/agency/admin/agents/${encodeURIComponent(agentId)}/commission`,
    { cache: "no-store" },
  );
}
export function updateAgencyCommissionSettings(
  base: string,
  agentId: string,
  input: AgencyCommissionUpdate,
): Promise<components["schemas"]["CommissionTermsResponse"]> {
  return apiRequest(
    base,
    `/agency/admin/agents/${encodeURIComponent(agentId)}/commission`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
