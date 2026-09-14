import { cookies } from "next/headers.js";

export const entryEnabled = () =>
  process.env.AGENCY_ACQUISITION_ENABLED === "1";
export const webOrigin = () =>
  new URL(process.env.GEOEVAL_WEB_ORIGIN ?? "http://127.0.0.1:3200").origin;
export const entryCookieName = () =>
  webOrigin().startsWith("https:") ? "__Host-geoeval_entry" : "geoeval_entry";
const keyPattern = /^[A-Za-z0-9_-]{32}$/;
const visitPattern = /^[A-Za-z0-9_-]{43}$/;

export type EntryContext = {
  entryKey: string;
  visitToken: string | null;
  expiresAt: string | null;
};

export async function entryBackend(
  path: "agency/entry/resolve" | "identity/challenges",
  body: unknown,
) {
  const base =
    process.env.GEOEVAL_INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3300";
  const response = await fetch(`${base.replace(/\/$/, "")}/${path}`, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: {
      "content-type": "application/json",
      "x-geoeval-request": "1",
      origin: webOrigin(),
    },
    body: JSON.stringify(body),
  });
  return response;
}

export async function resolveEntry(entryKey?: string): Promise<EntryContext> {
  const stored = (await cookies()).get(entryCookieName())?.value;
  const response = await entryBackend("agency/entry/resolve", {
    ...(entryKey !== undefined ? { entryKey } : {}),
    ...(stored && visitPattern.test(stored) ? { visitToken: stored } : {}),
  });
  if (!response.ok) throw new Error("注册入口暂不可用，请稍后重试");
  const data = (await response.json()) as EntryContext;
  if (
    !keyPattern.test(data.entryKey) ||
    (data.visitToken !== null && !visitPattern.test(data.visitToken)) ||
    (data.expiresAt !== null && !Number.isFinite(Date.parse(data.expiresAt))) ||
    (data.visitToken === null) !== (data.expiresAt === null)
  )
    throw new Error("注册入口暂不可用，请稍后重试");
  return data;
}

export async function registrationHref(): Promise<string | null> {
  if (!entryEnabled()) return "/enter";
  try {
    return `/e/${(await resolveEntry()).entryKey}`;
  } catch {
    return null;
  }
}
