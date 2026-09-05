export const trustedTestOrigin = "http://127.0.0.1:3200";

export function browserMutationHeaders(
  cookie?: string,
): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-geoeval-request": "1",
    origin: trustedTestOrigin,
    ...(cookie ? { cookie } : {}),
  };
}
