import type { AccountView } from "../domain/identity.types.js";

export const sessionCookieName = "geoeval_session";

export type AuthenticatedRequest = {
  headers: { cookie?: string };
  geoevalAccount?: AccountView;
};

export type HeaderWriter = {
  setHeader(name: string, value: string): void;
};

export function readSessionToken(
  request: AuthenticatedRequest,
): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const item of header.split(";")) {
    const [name, ...value] = item.trim().split("=");
    if (name === sessionCookieName) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

export function sessionCookie(
  token: string,
  expiresAt: Date,
  secure: boolean,
): string {
  return [
    `${sessionCookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function clearedSessionCookie(secure: boolean): string {
  return [
    `${sessionCookieName}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
