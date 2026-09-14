# Handoff: A0 远端同步

## 当前状态

A0 已在本地实现并验证，运行时代码提交 `ec94173970b4f39aa56ac243998bb3723832c25c`。未合并、未部署、未启用真实获客。2026-09-14 收尾时 GitHub API 连接超时，git push 20 秒超时；不能认定远端接收成功。最后确认的远端 PR #101 仍是 `51090d2` 文档提案，旧 CI 不能证明新实现。

## 工作区与退出

- Owner：ZETAVI；Issue #100《[Change] 建立代理商获客、客户归属与佣金提现闭环》。
- Checkout：`/Users/lucien/.config/codex/worktrees/a100/GEOEval`。
- Branch：`codex/issue-100-agent-acquisition`，main-direct；目标 [PR #101](https://github.com/ZETAVI/GEOEval/pull/101)。
- Exit：blocked-handoff；代码已提交，当前交接随后提交，工作树保留用于同步/评审，合并及后续接续结束后再评估清理。
- 主工作树仍 clean main `fc1a8ca`；支付 worktree 8ec7 无 tracked 修改，仅原有 artifacts/，未改 Recharge/Writer/Commerce/Delivery 代码。

## 验证与资源

详见 [verification](verification.md)：后端 696 通过/13 跳过，Web 209 通过；类型、构建、格式、框架、本地 Markdown 链接与 diff 检查通过；42 个旧迁移→两条新迁移保留旧账号，未追溯归属。真实浏览器注册与旧账号登录兜底、真实 HTTP 两组访客隔离均通过。

用户确认来源固定 30 天。当前 [Agency Entry spec](../../specs/agency-entry/spec.md) 与设计已在分支归一，业务规则不重复存入交接。

复用 OrbStack PostgreSQL/Redis 的任务库 geoeval_issue100 与 Redis DB 10；HTTP 验收进程及临时标签页已关闭，任务数据保留。早先创建的额外 Redis 空容器/卷和迁移临时库已清理，不停共享容器。这取代 [初始共享窗口 checkpoint](https://github.com/ZETAVI/GEOEval/issues/100#issuecomment-5662443111) 中另建 Redis 的安排。

## 下一步

1. 网络恢复后先读取 live #100/#101/Project 与 main，核对远端 head，再推送当前分支；不要创建第二个工作树或重做已通过的同版本验证。
2. 将 PR 标题改为 `feat(agency): 接通一致入口与首次注册归属`，body 按实际 A0 范围重写，保留 `Part of #100 — does not close`，链接 verification、两条增量迁移和当前 specs；明确默认关闭、生产禁开、购买归属/费率快照仍待后续。
3. 重写 Issue 当前状态，删除“只含文档/30 天待确认/运行时未实施”的过期描述；保留已确认迁移、72 小时退积分、佣金和提现规则及未决边界。发布一次 Delivery checkpoint，明确本记录对 Redis 安排的修正。
4. 更新 Project 为 Review / Decision，Owner ZETAVI/P1；检查准确新 head 的 required CI 和 review，未通过不能宣称可合并。不要自动关闭父 Issue 或合并。
5. 同步完成后将必要退出信息移入 PR，删除本临时交接。后续切片仍归 #100：客户迁移与访问、购买归属/费率快照、72 小时退积分结清与佣金、提现；各片按决策前沿进入。
