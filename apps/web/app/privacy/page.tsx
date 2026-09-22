export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <a className="brand-mark" href="/">
        <span aria-hidden="true">G</span>
        <strong>GEO 优化</strong>
      </a>
      <article className="privacy-card">
        <p className="eyebrow">公开说明 · 2026 年 9 月 22 日更新</p>
        <h1>个人信息与安全验证说明</h1>
        <p className="privacy-lede">
          本说明帮助你了解 GEO
          优化平台在账号登录、注册和安全防护中如何处理必要信息。
        </p>

        <section>
          <h2>谁负责处理</h2>
          <p>
            个人信息处理者为互动派科技股份有限公司。你可以通过
            <a href="mailto:marketing@hudongpai.com">marketing@hudongpai.com</a>
            或 020-38891740
            联系我们，提出查询、更正、账号停用、依法删除或其他个人信息请求。
          </p>
        </section>

        <section>
          <h2>我们处理哪些信息</h2>
          <ul>
            <li>
              手机号：用于创建和识别账号、发送一次性验证码、登录和账号安全。
            </li>
            <li>
              Session
              与安全记录：用于维持登录、限制异常请求、处理退出和安全审计。
            </li>
            <li>
              你主动提交的品牌、业务联系人、材料、评测、文章、订单、客服或开票资料：用于提供你选择的对应服务。
            </li>
            <li>
              必要的网络与运行日志：用于防止滥用、排查故障和保障服务安全；普通日志不记录验证码、完整
              Session 凭证或阿里云密钥。
            </li>
          </ul>
        </section>

        <section>
          <h2>阿里云安全验证与短信</h2>
          <p>
            当你点击“获取验证码”时，平台使用阿里云验证码 2.0
            判断请求是否来自真人，并在验证通过后使用阿里云短信发送一次性验证码。为完成人机识别，阿里云验证码可能处理浏览器特征、IP
            和联网信息、设备与系统信息，以及鼠标、触摸和键盘行为轨迹，但不采集你输入框中的具体内容。
          </p>
          <p>
            GEO
            优化平台只接收一次验证结果，不复制或保存阿里云侧的原始设备指纹和行为轨迹。短信服务为投递验证码处理你的手机号和一次性验证码；验证码明文不写入业务数据库或普通日志。
          </p>
        </section>

        <section>
          <h2>保存期限与保护</h2>
          <p>
            已结束的验证码 Challenge 按当前策略在 24
            小时后进入清理；已失效或撤销的 Session 按当前策略在 30
            天后进入清理。账号和你主动建立的业务记录在提供服务、处理争议及履行适用义务所需期间保存；达到目的后按适用规则删除、匿名化或停止非必要处理。
          </p>
          <p>
            我们使用服务端验签、验证码摘要、HTTPS、安全
            Cookie、固定角色授权、请求频控和最小权限运行凭证保护账号。请勿把短信验证码提供给任何人。
          </p>
        </section>

        <section>
          <h2>你的选择与权利</h2>
          <p>
            手机号及安全验证是创建和使用账号所必需的信息。你可以不继续获取验证码；这不会影响你浏览公开首页。对于已提交的信息，你可以通过平台现有编辑功能或上述联系方式依法申请查询、更正、限制处理、账号停用或删除。
          </p>
        </section>

        <p className="privacy-actions">
          <a className="primary-link" href="/enter">
            返回登录 / 注册
          </a>
          <a href="/">返回首页</a>
        </p>
      </article>
    </main>
  );
}
