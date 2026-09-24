"use client";

const SCRIPT_ID = "geoeval-aliyun-captcha-script";
const SCRIPT_SOURCE =
  "https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js";

export const CAPTCHA_ELEMENT_ID = "geoeval-captcha-element";
export const CAPTCHA_TRIGGER_ID = "geoeval-captcha-trigger";

let scriptPromise: Promise<void> | undefined;

export type HumanVerificationGate = {
  start(): Promise<string>;
};

export function aliyunCaptchaEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE === "aliyun";
}

export async function prepareAliyunCaptcha(): Promise<
  HumanVerificationGate | undefined
> {
  if (!aliyunCaptchaEnabled()) return undefined;
  const prefix = process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX?.trim();
  const sceneId = process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID?.trim();
  if (!prefix || !sceneId) {
    throw new Error("安全验证配置不完整");
  }

  window.AliyunCaptchaConfig = { region: "cn", prefix };
  await loadAliyunCaptchaScript();
  if (!window.initAliyunCaptcha)
    throw new Error("安全验证组件加载失败，请刷新后重试");

  return new Promise<HumanVerificationGate>((resolve, reject) => {
    let instance: AliyunCaptchaInstance | undefined;
    let pending:
      | {
          resolve: (captchaVerifyParam: string) => void;
          reject: (error: Error) => void;
        }
      | undefined;
    let consumed = false;

    const rejectPending = (message: string) => {
      const current = pending;
      pending = undefined;
      current?.reject(new Error(message));
    };

    window.initAliyunCaptcha!({
      SceneId: sceneId,
      mode: "popup",
      element: `#${CAPTCHA_ELEMENT_ID}`,
      button: `#${CAPTCHA_TRIGGER_ID}`,
      delayBeforeSuccess: false,
      language: "cn",
      slideStyle: { width: 360, height: 40 },
      success: (captchaVerifyParam) => {
        const current = pending;
        pending = undefined;
        if (
          !current ||
          typeof captchaVerifyParam !== "string" ||
          captchaVerifyParam.length < 1 ||
          captchaVerifyParam.length > 8192
        ) {
          current?.reject(new Error("安全验证结果无效，请重试"));
          return;
        }
        current.resolve(captchaVerifyParam);
      },
      fail: () => {
        // The SDK refreshes an unsuccessful attempt within the same challenge.
        // Keep waiting for success, explicit dismissal, or a terminal error.
      },
      onError: () => {
        rejectPending("安全验证暂时不可用，请稍后重试");
        if (!instance) reject(new Error("安全验证组件初始化失败"));
      },
      onClose: (reason) => {
        if (reason === "userDismiss")
          rejectPending("请完成安全验证后再获取验证码");
      },
      getInstance: (value) => {
        instance = value;
        resolve({
          start: () => {
            if (consumed)
              return Promise.reject(new Error("请重新开始安全验证"));
            consumed = true;
            return new Promise<string>(
              (resolveVerification, rejectVerification) => {
                pending = {
                  resolve: resolveVerification,
                  reject: rejectVerification,
                };
                try {
                  value.startTracelessVerification();
                } catch {
                  rejectPending("安全验证启动失败，请重试");
                }
              },
            );
          },
        });
      },
    });
  });
}

function loadAliyunCaptchaScript(): Promise<void> {
  if (window.initAliyunCaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const loaded = () => resolve();
    const failed = () =>
      reject(new Error("安全验证组件加载失败，请刷新后重试"));
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener("error", failed, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SOURCE;
      script.async = true;
      document.head.append(script);
    }
  });
  return scriptPromise;
}

type AliyunCaptchaInstance = {
  startTracelessVerification(): void;
};

type AliyunCaptchaOptions = {
  SceneId: string;
  mode: "popup";
  element: string;
  button: string;
  delayBeforeSuccess: boolean;
  language: "cn";
  slideStyle: { width: number; height: number };
  success(captchaVerifyParam: string): void;
  fail(result: unknown): void;
  onError(error: unknown): void;
  onClose(reason: string): void;
  getInstance(instance: AliyunCaptchaInstance): void;
};

declare global {
  interface Window {
    AliyunCaptchaConfig?: { region: "cn"; prefix: string };
    initAliyunCaptcha?: (options: AliyunCaptchaOptions) => void;
  }
}
