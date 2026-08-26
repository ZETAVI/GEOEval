import { EntryFlow } from "./entry-flow.js";

export default function EntryPage() {
  return (
    <main className="entry-page">
      <a className="brand-mark entry-brand" href="/">
        <span aria-hidden="true">G</span>
        <strong>GEO 优化</strong>
      </a>
      <section className="entry-shell">
        <div className="entry-story">
          <p className="eyebrow">从一次真实诊断开始</p>
          <h1>你的品牌，正在被 AI 怎样介绍？</h1>
          <p>
            填写手机号进入平台。首轮只需准备基础品牌信息，几分钟即可发起免费诊断。
          </p>
          <ul>
            <li>
              <span>1</span> 建立品牌资料
            </li>
            <li>
              <span>2</span> 查看五平台表现
            </li>
            <li>
              <span>3</span> 按优化方向生成内容
            </li>
          </ul>
        </div>
        <EntryFlow />
      </section>
    </main>
  );
}
