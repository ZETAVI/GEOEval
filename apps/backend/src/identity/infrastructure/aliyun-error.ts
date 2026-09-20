export type AliyunErrorView = {
  code?: string;
  message?: string;
  name?: string;
  requestId?: string;
  statusCode?: number;
};

export function aliyunErrorView(error: unknown): AliyunErrorView {
  if (typeof error !== "object" || error === null) return {};
  const value = error as Record<string, unknown>;
  return {
    ...(typeof value.code === "string" ? { code: value.code } : {}),
    ...(typeof value.message === "string" ? { message: value.message } : {}),
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    ...(typeof value.requestId === "string"
      ? { requestId: value.requestId }
      : {}),
    ...(typeof value.statusCode === "number"
      ? { statusCode: value.statusCode }
      : {}),
  };
}

export function isAliyunInvocationUnavailable(error: AliyunErrorView): boolean {
  if (error.statusCode !== undefined && error.statusCode >= 500) return true;
  const signal = `${error.code ?? ""} ${error.name ?? ""} ${error.message ?? ""}`;
  return /timeout|timedout|etimedout|econnreset|econnrefused|enotfound|eai_again|socket|network|internalerror/i.test(
    signal,
  );
}
