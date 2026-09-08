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
  | components["schemas"]["CorrectPublicationResultRequest"];
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

export function getPointBalance(baseUrl: string): Promise<PointBalance> {
  return apiRequest(baseUrl, "/points", { cache: "no-store" });
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
  state: "ACTIVE" | "COMPLETED" = "ACTIVE",
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
): Promise<Brand> {
  return apiRequest(apiBaseUrl, `/brands/${brandId}/current`, {
    method: "PUT",
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
