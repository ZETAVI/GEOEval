import { FoundationProbe } from "./probe.js";

export default function Page() {
  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">F0 · NON-PRODUCT FOUNDATION</p>
        <h1 id="page-title">可恢复的后台任务验证</h1>
        <p className="lede">
          这个页面只验证 API、持久状态、任务投递与断线恢复，不代表正式产品界面。
        </p>
      </section>
      <FoundationProbe />
    </main>
  );
}
