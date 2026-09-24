import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CAPTCHA_ELEMENT_ID,
  CAPTCHA_TRIGGER_ID,
  prepareAliyunCaptcha,
} from "../app/enter/aliyun-captcha.js";

describe("Alibaba invisible CAPTCHA client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads the official script once, fixes scene configuration and returns the opaque value", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE", "aliyun");
    vi.stubEnv("NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX", "public-prefix");
    vi.stubEnv("NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID", "18hnihr4");

    const listeners = new Map<string, () => void>();
    const script = {
      addEventListener: (name: string, listener: () => void) =>
        listeners.set(name, listener),
      async: false,
      id: "",
      src: "",
    };
    let receivedOptions: Record<string, unknown> | undefined;
    const windowValue: Record<string, unknown> = {};
    const documentValue = {
      createElement: () => script,
      getElementById: () => null,
      head: {
        append: () => {
          windowValue.initAliyunCaptcha = (
            options: Record<string, unknown>,
          ) => {
            receivedOptions = options;
            (
              options.getInstance as (instance: {
                startTracelessVerification(): void;
              }) => void
            )({
              startTracelessVerification: () =>
                (options.success as (value: string) => void)(
                  "opaque-captcha-value",
                ),
            });
          };
          listeners.get("load")?.();
        },
      },
    };
    vi.stubGlobal("window", windowValue);
    vi.stubGlobal("document", documentValue);

    const gate = await prepareAliyunCaptcha();
    await expect(gate?.start()).resolves.toBe("opaque-captcha-value");
    expect(script).toMatchObject({
      id: "geoeval-aliyun-captcha-script",
      src: "https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js",
      async: true,
    });
    expect(windowValue.AliyunCaptchaConfig).toEqual({
      region: "cn",
      prefix: "public-prefix",
    });
    expect(receivedOptions).toMatchObject({
      SceneId: "18hnihr4",
      mode: "popup",
      element: `#${CAPTCHA_ELEMENT_ID}`,
      button: `#${CAPTCHA_TRIGGER_ID}`,
      delayBeforeSuccess: false,
    });
  });

  it("keeps an invisible verification pending when an intermediate attempt fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE", "aliyun");
    vi.stubEnv("NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX", "public-prefix");
    vi.stubEnv("NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID", "18hnihr4");

    vi.stubGlobal("window", {
      initAliyunCaptcha: (options: {
        fail(result: unknown): void;
        success(value: string): void;
        getInstance(instance: { startTracelessVerification(): void }): void;
      }) => {
        options.getInstance({
          startTracelessVerification: () => {
            options.fail({ code: "intermediate" });
            options.success("fresh-opaque-value");
          },
        });
      },
    });

    const gate = await prepareAliyunCaptcha();
    await expect(gate?.start()).resolves.toBe("fresh-opaque-value");
  });

  it("still stops a pending verification when the user closes the challenge", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE", "aliyun");
    vi.stubEnv("NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX", "public-prefix");
    vi.stubEnv("NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID", "18hnihr4");

    vi.stubGlobal("window", {
      initAliyunCaptcha: (options: {
        fail(result: unknown): void;
        onClose(reason: string): void;
        getInstance(instance: { startTracelessVerification(): void }): void;
      }) => {
        options.getInstance({
          startTracelessVerification: () => {
            options.fail({ code: "intermediate" });
            options.onClose("userDismiss");
          },
        });
      },
    });

    const gate = await prepareAliyunCaptcha();
    await expect(gate?.start()).rejects.toThrow("请完成安全验证后再获取验证码");
  });
});
