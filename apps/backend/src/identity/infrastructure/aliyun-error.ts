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
  const cause =
    typeof value.cause === "object" && value.cause !== null
      ? (value.cause as Record<string, unknown>)
      : undefined;
  return {
    ...(typeof value.code === "string"
      ? { code: value.code }
      : typeof cause?.code === "string"
        ? { code: cause.code }
        : {}),
    ...(typeof value.message === "string"
      ? { message: value.message }
      : typeof cause?.message === "string"
        ? { message: cause.message }
        : {}),
    ...(typeof value.name === "string"
      ? { name: value.name }
      : typeof cause?.name === "string"
        ? { name: cause.name }
        : {}),
    ...(typeof value.requestId === "string"
      ? { requestId: value.requestId }
      : typeof cause?.requestId === "string"
        ? { requestId: cause.requestId }
        : {}),
    ...(typeof value.statusCode === "number"
      ? { statusCode: value.statusCode }
      : typeof cause?.statusCode === "number"
        ? { statusCode: cause.statusCode }
        : {}),
  };
}

export function isAliyunInvocationUnavailable(error: AliyunErrorView): boolean {
  if (error.statusCode !== undefined && error.statusCode >= 500) return true;
  const signal = `${error.code ?? ""} ${error.name ?? ""} ${error.message ?? ""}`;
  return /timeout|timedout|etimedout|econnreset|econnrefused|enotfound|eai_again|fetch failed|socket|network|internalerror/i.test(
    signal,
  );
}
