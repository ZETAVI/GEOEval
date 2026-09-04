"use client";

import {
  completeLogin,
  createBrand,
  listBrands,
  requestLoginChallenge,
  type BrandMutation,
} from "@geoeval/api-client";
import { useState } from "react";
import { BrandProfileFields } from "../brands/brand-profile-fields.js";
import { postLoginRoute } from "./post-login-route.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function EntryFlow() {
  const [step, setStep] = useState<"mobile" | "code" | "brand">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [developmentCode, setDevelopmentCode] = useState<string>();
  const [brandForm, setBrandForm] = useState<BrandMutation>({
    characteristics: ["", ""],
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function requestCode() {
    setBusy(true);
    setMessage("");
    try {
      const challenge = await requestLoginChallenge(apiBaseUrl, mobile);
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

  async function verifyCode() {
    setBusy(true);
    setMessage("");
    try {
      const account = await completeLogin(apiBaseUrl, {
        challengeId,
        mobile,
        code,
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function saveFirstBrand() {
    setBusy(true);
    setMessage("");
    try {
      await createBrand(apiBaseUrl, {
        ...brandForm,
        contactMobile: brandForm.contactMobile || mobile,
      });
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
          <p className="step-label">手机号登录 / 注册</p>
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
            disabled={busy || !mobile.trim()}
            onClick={() => void requestCode()}
          >
            {busy ? "正在获取…" : "获取验证码"}
          </button>
          <p className="form-footnote">
            登录即表示你同意平台为提供服务而保存账号与品牌资料。
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
              本地开发验证码：<b>{developmentCode}</b>
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
