# A0 验证记录

日期：2026-09-14。范围：一致入口、匿名来源、验证码来源快照、首次注册绑定及最小入口管理。准确代码 head、远端 CI 与合并状态由 [PR #101](https://github.com/ZETAVI/GEOEval/pull/101) 持有；本记录不代表生产获客或完整代理业务验收。

## 环境与资源

- 复用 OrbStack 的现有 PostgreSQL 和 Redis 服务；测试仅使用 `geoeval_issue100` 与 Redis 逻辑库 10，显式同时传入 DATABASE_URL/REDIS_URL。
- 最初为隔离创建的临时 Redis 容器及其空匿名卷已移除；未停止共享数据库/Redis。升级演练临时库创建后按任务范围清理。
- 本地浏览器使用 API 3390 / Web 3290，全部为合成账号、固定本地验证码；没有真实短信、Provider、支付或资金调用。
- 来源固定 30 天；生产 API 拒绝开启获客，默认配置关闭。后续购买归属/费率快照未就绪，不能启用真实获客。

## 证据矩阵

| 声明 | 证据与结果 | 边界 |
| --- | --- | --- |
| 类型与接口一致 | `pnpm typecheck`、`pnpm openapi:generate` 通过 | 三个 workspace；增加代理接口及验证码可选来源/仅登录输入 |
| 首次来源与原子绑定 | `agency-acquisition.integration.spec.ts` 14 项通过 | 真实 PostgreSQL；30 天、不续期、公共升级、A/B 竞争、旧账号、challenge 冻结、资格失败整笔回滚、重复完成、停新入口后完成既有 challenge；失效来源老客户登录、新手机号不能绕过仅登录限制 |
| HTTP 权限与激活 | `agency-http.integration.spec.ts` 3 项通过 | 四角色与缺失会话、来源/header、公开响应投影、默认关闭、禁止生产启用 |
| 维护兼容 | 代理核心/HTTP/Identity maintenance 聚焦组合 18 项通过 | 过期匿名数据清理不删除真实归属；既有维护行为保留 |
| Web 接缝 | `acquisition-web.spec.ts` 7 项通过；全量 Web 209 项通过 | host-only/HttpOnly、固定后端、跨源拒绝、预取不改变来源、失败不换公共入口、禁用保持原路径 |
| 后端回归 | 全量后端 696 通过、13 跳过 | 13 项是现有 Delivery recovery、Recharge worker、Recharge notice 专属环境门槛；未计作通过。最终完整 CI 以 PR Checks 为准 |
| 构建 | `pnpm build` 通过；最终 Web 生产构建通过 | Next 16.3.2；动态主页、注册页、Route Handlers 和受控管理入口可打包 |
| 旧数据升级 | 在独立临时库先执行 42 个原迁移，插入旧账号，再应用 A0 两条增量迁移 | 旧账号逐字段保持，零追溯归属；首次演练因合成数据缺少 updated_at 中断，补齐后通过，临时库均已清理 |
| HTTP 访客隔离 | `fixtures/agency-web-verification.ts` 对真实 standalone Web/API 通过 | 两个 Cookie 上下文分别返回 A/B 链接；复制只产生新凭据；首次来源保留；到期时间不延长；private/no-store |
| 真实浏览器注册 | Codex 浏览器实际进入 A 链接→主页→刷新→原按钮→验证码→跳过品牌→客户工作区 | 主页两个入口 href 与原 A 链接相同；客户无邀请码、代理层级或额外归属步骤；数据库确认正确代理且 INITIAL_BIND 只有一次 |
| 真实浏览器管理与恢复 | 代理商登录/读取/复制链接、管理员选中代理商并读取同一链接；最终操作位于账号详情 | 已核对页面布局与复制成功；关掉标签页再打开主页仍保留 A；API 停止时入口不可用，恢复后仍为 A；最终构建中，无效入口→已有账号登录→验证码→代理商工作区通过 |
| 规格与框架 | 框架、格式和 diff 检查通过 | 当前 agency-entry owner 已建立，Product Definition 执行局部提取并显式保留后续 Evolution marker |

## 复现入口

在独立工作树安装锁定依赖、生成 Prisma 并将迁移应用到任务专属数据库后：

```bash
DATABASE_URL=postgresql://geoeval:geoeval_local_only@127.0.0.1:55432/geoeval_issue100 REDIS_URL=redis://127.0.0.1:56379/10 pnpm --filter @geoeval/backend exec vitest run test/agency-acquisition.integration.spec.ts test/agency-http.integration.spec.ts test/identity-maintenance.integration.spec.ts
pnpm --filter @geoeval/web test
```

浏览器宿主是 `apps/backend/test/fixtures/agency-journey-host.ts`，会校验准确本机数据库和 Redis 目标，仅准备合成账号及入口。其输出给出当次分享地址；不要复制旧运行的随机 key。

Web 设置 `AGENCY_ACQUISITION_ENABLED=1`、`GEOEVAL_WEB_ORIGIN=http://127.0.0.1:3290`、`GEOEVAL_INTERNAL_API_BASE_URL=http://127.0.0.1:3390`；构建时 `NEXT_PUBLIC_API_BASE_URL` 同为测试 API。使用项目 standalone 输出并复制该构建的 static/public 资源后，在本机 3290 启动。API 使用 fixture 中受控配置，不把这些开关和值当作生产配置。

`agency-web-verification.ts` 可在宿主运行时复验 HTTP 隔离。第一次在 Next dev server 验证 no-store 失败：开发响应只有 no-cache；因此改用真实 standalone 生产构建产物完成验证，没有降低断言。

## 保留与未执行

本机 HTTP验收进程已停止；构建与独立测试资源保留供后续同 Issue 接续。开发验收的临时构建缓存清理，不进入提交。未执行真实短信、真实客户、生产部署、跨副本发布、商户或资金验收。没有自动合并 PR、关闭 #100 或归档整个代理商主线。
