export const dynamic = "force-dynamic";
import { registrationHref } from "./acquisition/server.js";
export default async function Page() {
  const entryHref = await registrationHref();
  return (
    <main className="public-page">
      <nav className="public-nav" aria-label="主导航">
        <a className="brand-mark" href="/">
          <span aria-hidden="true">G</span>
          <strong>GEO 优化</strong>
        </a>
        <a
          className="nav-enter"
          href={entryHref ?? undefined}
          aria-disabled={!entryHref}
        >
          进入平台
        </a>
      </nav>
      {!entryHref && (
        <p role="status">
          注册入口暂不可用，请稍后刷新重试。
          <a href="/enter?loginOnly=1">已有账号登录</a>
        </p>
      )}
      <section className="public-hero" aria-labelledby="public-title">
        <div className="hero-copy">
          <p className="eyebrow">让 AI 更容易提到你的品牌</p>
          <h1 id="public-title">
            看见真实表现，<span>找到优化方向。</span>
          </h1>
          <p className="lede">
            面向中小企业与门店的轻量 GEO 服务。从五大 AI
            平台的真实评测出发，生成优化内容，并衔接专业媒体发布。
          </p>
          <div className="hero-actions">
            <a
              className="primary-link"
              href={entryHref ?? undefined}
              aria-disabled={!entryHref}
            >
              免费开始诊断 <span aria-hidden="true">→</span>
            </a>
            <span className="quiet-note">基础评测免费 · 无需专业知识</span>
          </div>
        </div>
        <div className="signal-card" aria-label="产品能力预览">
          <div className="signal-topline">
            <span>AI 推荐指数</span>
            <span className="live-dot">真实采样</span>
          </div>
          <div className="stars" aria-label="四星示意">
            ★★★★<span>★</span>
          </div>
          <div className="signal-bars" aria-hidden="true">
            <i style={{ "--bar": "82%" } as React.CSSProperties} />
            <i style={{ "--bar": "67%" } as React.CSSProperties} />
            <i style={{ "--bar": "74%" } as React.CSSProperties} />
            <i style={{ "--bar": "58%" } as React.CSSProperties} />
            <i style={{ "--bar": "71%" } as React.CSSProperties} />
          </div>
          <p>跨平台表现一眼看懂，重要结果保留完整回答依据。</p>
        </div>
      </section>
      <section className="public-process" aria-label="服务流程">
        <article>
          <b>01</b>
          <h2>免费诊断</h2>
          <p>基于品牌资料，在五个主流 AI 平台完成真实采样。</p>
        </article>
        <article>
          <b>02</b>
          <h2>内容优化</h2>
          <p>结合报告方向生成可编辑的 GEO 优化文章。</p>
        </article>
        <article>
          <b>03</b>
          <h2>媒体发布</h2>
          <p>从公司整合的媒体资源中选择套餐或精准发布。</p>
        </article>
      </section>
      <footer className="public-footer">
        <span>互动派科技股份有限公司</span>
        <a href="/privacy">个人信息与安全验证说明</a>
      </footer>
    </main>
  );
}
