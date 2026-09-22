"use client";

import {
  completeLogin,
  createBrand,
  listBrands,
  requestLoginChallenge,
  requestExistingAccountChallenge,
  type BrandMutation,
} from "@geoeval/api-client";
import { useEffect, useRef, useState } from "react";
import { BrandProfileFields } from "../brands/brand-profile-fields.js";
import { brandMutationForSave } from "../brands/brand-mutation.js";
import { prewarmEvaluationQuestions } from "../brands/evaluation-question-prewarm.js";
import { requestEntryChallenge } from "../acquisition/challenge-client.js";
import {
  aliyunCaptchaEnabled,
  CAPTCHA_ELEMENT_ID,
  CAPTCHA_TRIGGER_ID,
  type HumanVerificationGate,
  prepareAliyunCaptcha,
} from "./aliyun-captcha.js";
import { postLoginRoute } from "./post-login-route.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
const internalDemoMode =
  process.env.NEXT_PUBLIC_INTERNAL_DEMO_MODE === "enabled";

export function EntryFlow({
  acquisitionEnabled = false,
  existingAccountOnly = false,
}: {
  acquisitionEnabled?: boolean;
  existingAccountOnly?: boolean;
}) {
  const [step, setStep] = useState<"mobile" | "code" | "brand">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [developmentCode, setDevelopmentCode] = useState<string>();
  const [brandForm, setBrandForm] = useState<BrandMutation>({
    characteristics: [{ title: "" }, { title: "" }],
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [captchaReady, setCaptchaReady] = useState(!aliyunCaptchaEnabled());
  const captchaGate = useRef<HumanVerificationGate | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (!aliyunCaptchaEnabled()) return;
    prepareAliyunCaptcha()
      .then((gate) => {
        if (!active || !gate) return;
        captchaGate.current = gate;
        setCaptchaReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(
          error instanceof Error ? error.message : "安全验证初始化失败",
        );
      });
    return () => {
      active = false;
      captchaGate.current = undefined;
    };
  }, []);

  async function requestCode() {
    setBusy(true);
    setMessage("");
    try {
      const captchaVerifyParam = await requestHumanVerification();
      const challenge = existingAccountOnly
        ? await requestExistingAccountChallenge(
            apiBaseUrl,
            mobile,
            captchaVerifyParam,
          )
        : acquisitionEnabled
          ? await requestEntryChallenge(mobile, captchaVerifyParam)
          : await requestLoginChallenge(apiBaseUrl, mobile, captchaVerifyParam);
      if (internalDemoMode && challenge.developmentCode) {
        await finishLogin(challenge.challengeId, challenge.developmentCode);
        return;
      }
      setChallengeId(challenge.challengeId);
      setDevelopmentCode(challenge.developmentCode);
      if (challenge.developmentCode) setCode(challenge.developmentCode);
      setStep("code");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暂时无法获取验证码");
    } finally {
      setBusy(false);
    }
  }

  async function requestHumanVerification(): Promise<string | undefined> {
    if (!aliyunCaptchaEnabled()) return undefined;
    const gate = captchaGate.current;
    if (!gate) throw new Error("安全验证正在准备，请稍后重试");
    captchaGate.current = undefined;
    setCaptchaReady(false);
    try {
      return await gate.start();
    } finally {
      prepareAliyunCaptcha()
        .then((nextGate) => {
          if (!nextGate) return;
          captchaGate.current = nextGate;
          setCaptchaReady(true);
        })
        .catch(() => {
          setMessage("安全验证暂时不可用，请刷新后重试");
        });
    }
  }

  async function verifyCode() {
    setBusy(true);
    setMessage("");
    try {
      await finishLogin(challengeId, code);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function finishLogin(nextChallengeId: string, nextCode: string) {
    const account = await completeLogin(apiBaseUrl, {
      challengeId: nextChallengeId,
      mobile,
      code: nextCode,
    });
    const route = postLoginRoute(account.role);
    if (route.kind === "redirect") {
      window.location.assign(route.path);
      return;
    }
    const brands = await listBrands(apiBaseUrl);
    if (brands.length > 0) {
      window.location.assign("/brands");
      return;
    }
    setBrandForm((current) => ({
      ...current,
      contactMobile: current.contactMobile || mobile,
    }));
    setStep("brand");
  }

  async function saveFirstBrand() {
    setBusy(true);
    setMessage("");
    try {
      const brand = await createBrand(
        apiBaseUrl,
        brandMutationForSave({
          ...brandForm,
          contactMobile: brandForm.contactMobile || mobile,
        }),
      );
      await prewarmEvaluationQuestions(apiBaseUrl, brand);
      window.location.assign("/brands");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "品牌保存失败");
      setBusy(false);
    }
  }

  return (
    <section className={`entry-card entry-card-${step}`} aria-live="polite">
      {step === "mobile" && (
        <>
          <p className="step-label">
            {existingAccountOnly ? "手机号登录" : "手机号登录 / 注册"}
          </p>
          <h2>欢迎进入 GEO 优化平台</h2>
          <label>
            手机号
            <input
              inputMode="tel"
              autoComplete="tel"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              placeholder="请输入常用手机号"
            />
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={busy || !mobile.trim() || !captchaReady}
            onClick={() => void requestCode()}
          >
            {busy
              ? "正在获取…"
              : internalDemoMode
                ? "进入演示"
                : captchaReady
                  ? "获取验证码"
                  : "正在准备安全验证…"}
          </button>
          <div id={CAPTCHA_ELEMENT_ID} />
          <button
            id={CAPTCHA_TRIGGER_ID}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            hidden
          />
          <p className="form-footnote">
            获取验证码前，请阅读
            <a href="/privacy">《个人信息与安全验证说明》</a>
            。继续操作表示你已了解平台为登录、服务和安全防护处理必要信息。
          </p>
        </>
      )}
      {step === "code" && (
        <>
          <button
            className="text-button"
            type="button"
            onClick={() => setStep("mobile")}
          >
            ← 修改手机号
          </button>
          <p className="step-label">验证手机号</p>
          <h2>输入 6 位验证码</h2>
          <p className="form-intro">验证码已发送至 {mobile}</p>
          {developmentCode && (
            <p className="development-note">
              当前环境验证码：<b>{developmentCode}</b>
            </p>
          )}
          <label>
            验证码
            <input
              className="code-input"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
            />
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={busy || code.length !== 6}
            onClick={() => void verifyCode()}
          >
            {busy ? "验证中…" : "进入平台"}
          </button>
        </>
      )}
      {step === "brand" && (
        <>
          <p className="step-label">可选 · 建立首个品牌</p>
          <h2>先告诉我们你是谁</h2>
          <p className="form-intro">
            可以现在完成诊断资料，也可以只保存名称后进入平台继续补充。
          </p>
          <div className="form-grid entry-brand-form">
            <BrandProfileFields
              apiBaseUrl={apiBaseUrl}
              value={brandForm}
              onChange={setBrandForm}
            />
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={busy || !brandForm.companyName?.trim()}
            onClick={() => void saveFirstBrand()}
          >
            {busy ? "保存中…" : "保存并进入"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => window.location.assign("/brands")}
          >
            暂时跳过
          </button>
        </>
      )}
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
