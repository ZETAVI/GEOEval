export async function requestEntryChallenge(
  mobile: string,
  captchaVerifyParam?: string,
) {
  const response = await fetch("/api/entry/challenge", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-geoeval-request": "1" },
    body: JSON.stringify({
      mobile,
      ...(captchaVerifyParam ? { captchaVerifyParam } : {}),
    }),
  });
  const data = (await response.json()) as {
    challengeId: string;
    expiresAt: string;
    developmentCode?: string;
    message?: string | string[];
  };
  if (!response.ok)
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join("；")
        : (data.message ?? "暂时无法获取验证码"),
    );
  return data;
}
