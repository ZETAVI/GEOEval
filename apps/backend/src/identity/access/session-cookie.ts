import type { IdentityHttpRequest } from "./identity-http.js";

const localSessionCookieName = "geoeval_session";
const productionSessionCookieName = "__Host-geoeval_session";

export function readSessionToken(
  request: IdentityHttpRequest,
  secure: boolean,
): string | undefined {
  const rawCookie = request.headers.cookie;
  const header = Array.isArray(rawCookie) ? rawCookie[0] : rawCookie;
  if (!header) return undefined;
  const expectedName = sessionCookieName(secure);
  for (const item of header.split(";")) {
    const [name, ...value] = item.trim().split("=");
    if (name === expectedName) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

export function sessionCookie(input: {
  token: string;
  expiresAt: Date;
  secure: boolean;
  persistent: boolean;
}): string {
  return [
    `${sessionCookieName(input.secure)}=${encodeURIComponent(input.token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(input.persistent ? [`Expires=${input.expiresAt.toUTCString()}`] : []),
    ...(input.secure ? ["Secure"] : []),
  ].join("; ");
}

export function clearedSessionCookie(secure: boolean): string {
  return [
    `${sessionCookieName(secure)}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function sessionCookieName(secure: boolean): string {
  return secure ? productionSessionCookieName : localSessionCookieName;
}
