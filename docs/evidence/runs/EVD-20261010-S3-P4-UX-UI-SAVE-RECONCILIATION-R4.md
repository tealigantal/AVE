---
evidence_id: EVD-20261010-S3-P4-UX-UI-SAVE-RECONCILIATION-R4
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-10
recorded_at: 2026-10-10T09:58:41Z
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 065a83d532e4ca04e01bb784483c77211aecca6b904922ed4838bb4cecde65b5
dirty_build_diff_digest: 7971826cd51e13dcbaca5002ad3e7210d57e47b22a34ef121d25e75b64847761
build_input_digest: d409a7664c17cbf3d69c89d73673b25a86c956e3f6360f1dc378d0f938ebc234
capability_ids: [CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-RELIABLE-UX-001]
result: engineering_and_compose_ready_real_ui_acceptance_blocked_by_computer_use_url_guard
---

# P4 工作台并发草稿保存修复与当前构建

## 发现与修复

在临时项目 `P4-WIN09-20261010`（project id `ed3f3d57-1a01-46f1-8cac-27d61c17017c`）的新建流程中，Renderer 两次记录了 `CREATION_UI_STALE`。Project Host 的版本比较正确地拒绝旧版本写入；Renderer 当时直接把该并发结果记成操作失败，没有先读回当前工作台草稿。本次保留 Host 的严格版本校验，在 Renderer 读取最新版本后按表单键及普通对象字段做三方合并：无重叠修改安全重试，相同值视为已保存，同字段冲突保留本窗口输入并明示冲突，不覆盖另一窗口已保存内容。

测试项目由本次操作创建，错误历史仍保留；此前仅打开本机文件选择器，没有选择或导入素材，没有调用模型，也未清除问题记录或删除项目。

## 工程与 Compose 验证

- `pnpm run renderer:workbench:test`：通过；覆盖独立字段/对象字段并发合并、相同输入去重、对象键次序规范化和同字段冲突保留。
- `pnpm run stage3:p4-integration:test`：通过；页面、Host 会话、时间线、批注、回收站、近期项目及关闭流程回归通过。
- `pnpm run typecheck`：通过；生成并检查 91 项合同。
- `pnpm run contracts:check`：通过，91 个 Schema、有效示例和无效示例均通过。
- `pnpm run architecture`：通过，扫描 1492 个源码文件。
- `pnpm run interaction-acceptance:test`：通过；输出明确说明 fixture 不是 UI 验收。
- `node scripts/docker/build-reliable.mjs`：通过；desktop/whisper 使用同一构建输入 `d409a7664c17cbf3d69c89d73673b25a86c956e3f6360f1dc378d0f938ebc234`。
- `docker compose up -d --wait --wait-timeout 1800`：通过；desktop 镜像 `sha256:692c06155c24b3224aba4a1f54439203d0f691f51b880a1b3f1e9e941f15d41b`、whisper 镜像 `sha256:13535094a4b11ad7e09072769093b5da4c55708de9b6e743f36f3f2f306cdcb1` 均 Healthy；`http://localhost:6080/health` 返回 `{"status":"ready"}`。
- `git diff --check`：通过。
- 当前运行明细及文件/镜像指纹：[p4-workbench-ui-save-merge-build-identity-r4.json](../assets/p4-ux/p4-workbench-ui-save-merge-build-identity-r4.json)。
- `pnpm run docs:sync`：通过。
- `pnpm run docs:check`：退出码 1，保留 37 项历史/非活动能力 Evidence applicability 错误；当前活动 `CAP-S3-RELIABLE-UX-001` 未列入失败项，最新 Evidence 指纹匹配，没有修改历史 Evidence 或弱化检查。
- `git diff --check`：通过。

## 真实界面验收状态

本轮刷新桌面应用列表后确认唯一 Chrome 窗口标题为 `AVE 工作台 - Google Chrome`。Computer Use 在读取该窗口状态前返回：`Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.` 按该安全结果停止本轮所有界面输入，没有切换到其他自动化入口绕过限制。

因此最新 Compose 构建尚未经过可见桌面操作；WIN-09 的失败持续性/恢复流程、WIN-10 的十种工作台状态和用户界面反馈仍未验收。不得据此完成工作包或声明 P4 接受。继续验收需在 Computer Use 能确认当前 URL 后，从新的空项目继续 WIN-09 与 WIN-10；保留本测试项目和旧错误历史。
