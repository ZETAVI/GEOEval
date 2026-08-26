import { FoundationProbe } from "../probe.js";

export default function FoundationProbePage() {
  return (
    <main className="foundation-page">
      <section className="foundation-hero" aria-labelledby="foundation-title">
        <p className="eyebrow">F0 · 非产品基础验证</p>
        <h1 id="foundation-title">可恢复的后台任务验证</h1>
        <p className="lede">
          这个隔离页面只验证
          API、持久状态、任务投递与断线恢复，不代表正式产品界面。
        </p>
      </section>
      <FoundationProbe />
    </main>
  );
}
