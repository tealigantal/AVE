---
evidence_id: EVD-20261010-S3-P4-UX-LIVE-UI-RECOVERY-R2
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-10
recorded_at: 2026-10-10T08:30:22Z
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: c2071f6c661b459a106e67365576b767b45110e7d9028dd4369d4d80cdf4bb9d
dirty_build_diff_digest: fdbdd827a7d54f6cbd2ccd4186cec9a4d29a752908997b0a6e0f5e859f8b8fc9
build_input_digest: c580feb79fe3ce700770d80dab8f6ff8fb1e83d2a29e47535447831a9d4fb532
capability_ids: [CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-RELIABLE-UX-001]
result: automated_p4_regressions_and_live_browser_recovery_passed_docs_check_historical_applicability_debts_remain_human_stage_exit_pending
---

# P4 当前构建实操与回归复核

本记录续接 [首次实际界面记录](EVD-20261010-S3-P4-UX-LIVE-UI-RECOVERY.md)。当前浏览器实测路径、用户数据边界和运行身份见该记录及其构建身份附件；以下记录补充后续 P4 自动化回归和文档核验结果。

## 自动回归

- `pnpm run stage3:p4-integration:test`：退出码 0。通过页面路由/项目隔离、素材布局持久化、焦点恢复、过期会话 fail-closed 与同步、空项目回收站查询、Host 活动项目下的首页 bootstrap、新建/打开及取消流程；同一脚本链中的时间线命令、草稿 Host、批注存储/Host、回收站和近期项目检查均通过。
- `pnpm run renderer:workbench:test`：通过。
- `pnpm run interaction-acceptance:test`：通过；工具输出明确指出夹具并非真实 UI 接受。
- `pnpm run typecheck`：通过，合同生成与 TypeScript 检查完成。
- `pnpm run contracts:check`：通过，91 个 Schema 和 91 组有效/无效示例通过。
- `pnpm run architecture`：通过，扫描 1491 个源码文件。
- `git diff --check`：通过。
- `pnpm run docs:sync`：通过。
- `pnpm run docs:check`：退出码 1。最新 Evidence 的代码指纹不匹配问题已经消除；仍有 37 项历史/非活动能力的 Evidence 适用性错误（CAP-RENDER-001、若干早期 CA/Stage3 能力及三个独立 P4 子能力）。历史 Evidence 及检查断言未改写。当前活动 CAP-S3-RELIABLE-UX-001 不在失败项中。

## 状态边界

真实浏览器证明此前反馈的首页卡死、导航不可用及新建取消误报已在当前 Compose 构建中修复。以上自动验证不证明十种真实媒体状态流程，也不替代对界面美学的用户主观反馈或 Stage Exit 接受；WP-S3-RELIABLE-UX-001 保持 active，禁止执行 `docs:complete` 或声称 P4 整体完成。
