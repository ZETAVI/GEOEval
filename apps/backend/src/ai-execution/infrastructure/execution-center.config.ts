export type ParserExecutionCenterConfig = {
  enabled: boolean;
  acquisitionEnabled?: boolean;
  centerRef: string;
  baseUrl: string;
  callerToken: string;
  httpTimeoutMs: number;
  endpoints: Record<
    string,
    { endpointRef: string; endpointVersion: string; operation: string }
  >;
};

export function parserExecutionCenterConfig(
  environment: NodeJS.ProcessEnv,
  mode: "real" | "deterministic",
): ParserExecutionCenterConfig | undefined {
  const enabled = environment.AI_EXECUTION_CENTER_ENABLED;
  const acquisitionEnabled =
    environment.AI_EXECUTION_CENTER_ACQUISITION_ENABLED;
  if (enabled !== undefined && !["true", "false"].includes(enabled))
    throw new Error("Invalid AI_EXECUTION_CENTER_ENABLED");
  if (
    acquisitionEnabled !== undefined &&
    !["true", "false"].includes(acquisitionEnabled)
  )
    throw new Error("Invalid AI_EXECUTION_CENTER_ACQUISITION_ENABLED");
  const baseUrl = environment.AI_EXECUTION_CENTER_URL?.trim();
  if (!baseUrl && enabled !== "true" && acquisitionEnabled !== "true")
    return undefined;
  if (!baseUrl || !environment.AI_EXECUTION_CENTER_CALLER_TOKEN?.trim())
    throw new Error("Execution center URL and caller token are required");
  if ((enabled === "true" || acquisitionEnabled === "true") && mode !== "real")
    throw new Error("Delegated Parser requires real route semantics");
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("Invalid execution center URL");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname)
      ))
  )
    throw new Error(
      "Execution center requires a credential-free HTTPS or loopback URL",
    );
  const centerRef =
    environment.AI_EXECUTION_CENTER_REF?.trim() || "parser-center";
  const identifier = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/;
  if (!identifier.test(centerRef))
    throw new Error("Invalid execution center reference");
  let parsed: unknown;
  try {
    parsed = JSON.parse(environment.AI_EXECUTION_CENTER_ENDPOINTS || "{}");
  } catch {
    throw new Error("Invalid execution center endpoints");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid execution center endpoints");
  const endpoints: ParserExecutionCenterConfig["endpoints"] = {};
  for (const [route, value] of Object.entries(parsed)) {
    if (
      !identifier.test(route) ||
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    )
      throw new Error("Invalid execution center endpoint reference");
    const mapping = value as Record<string, unknown>;
    if (
      Object.keys(mapping).some(
        (key) => !["endpointRef", "endpointVersion", "operation"].includes(key),
      ) ||
      ["endpointRef", "endpointVersion", "operation"].some(
        (key) =>
          typeof mapping[key] !== "string" ||
          !identifier.test(mapping[key] as string),
      )
    )
      throw new Error("Invalid execution center endpoint reference");
    endpoints[route] =
      mapping as ParserExecutionCenterConfig["endpoints"][string];
  }
  if (
    (enabled === "true" || acquisitionEnabled === "true") &&
    Object.keys(endpoints).length === 0
  )
    throw new Error("Delegated Parser needs registered endpoint references");
  const httpTimeoutMs = Number(
    environment.AI_EXECUTION_CENTER_HTTP_TIMEOUT_MS || 5000,
  );
  if (
    !Number.isInteger(httpTimeoutMs) ||
    httpTimeoutMs < 100 ||
    httpTimeoutMs > 30_000
  )
    throw new Error("Invalid execution center HTTP timeout");
  const callerToken = environment.AI_EXECUTION_CENTER_CALLER_TOKEN!.trim();
  if (/[\r\n]/.test(callerToken))
    throw new Error("Invalid execution center caller token");
  return {
    enabled: enabled === "true",
    acquisitionEnabled: acquisitionEnabled === "true",
    centerRef,
    baseUrl: url.toString().replace(/\/$/, ""),
    callerToken,
    endpoints,
    httpTimeoutMs,
  };
}
