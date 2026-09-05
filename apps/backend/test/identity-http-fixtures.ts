import type { AccountRole } from "../src/identity/domain/identity.types.js";
import { browserMutationHeaders } from "./http-test-headers.js";

export type HttpSessionFixture = {
  account: {
    id: string;
    mobile: string;
    role: AccountRole;
    status: "ACTIVE" | "INACTIVE";
    revision: number;
  };
  cookie: string;
  setCookie: string;
};

export async function requestDevelopmentChallenge(
  baseUrl: string,
  mobile: string,
): Promise<{ challengeId: string; developmentCode: string }> {
  const response = await fetch(`${baseUrl}/identity/challenges`, {
    method: "POST",
    headers: browserMutationHeaders(),
    body: JSON.stringify({ mobile }),
  });
  if (response.status !== 201) {
    throw new Error(`Challenge request failed with ${response.status}`);
  }
  return (await response.json()) as {
    challengeId: string;
    developmentCode: string;
  };
}

export async function loginWithDevelopmentChallenge(
  baseUrl: string,
  mobile: string,
  extraBody: Record<string, unknown> = {},
): Promise<HttpSessionFixture> {
  const challenge = await requestDevelopmentChallenge(baseUrl, mobile);
  const response = await fetch(`${baseUrl}/identity/sessions`, {
    method: "POST",
    headers: browserMutationHeaders(),
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      mobile,
      code: challenge.developmentCode,
      ...extraBody,
    }),
  });
  if (response.status !== 201) {
    throw new Error(`Session creation failed with ${response.status}`);
  }
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Session response did not set a Cookie");
  return {
    account: (await response.json()) as HttpSessionFixture["account"],
    cookie: setCookie.split(";", 1)[0],
    setCookie,
  };
}
