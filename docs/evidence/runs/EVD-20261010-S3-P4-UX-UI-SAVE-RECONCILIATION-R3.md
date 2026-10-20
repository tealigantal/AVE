---
evidence_id: EVD-20261010-S3-P4-UX-UI-SAVE-RECONCILIATION-R3
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-10
recorded_at: 2026-10-10T09:54:58Z
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: e6379840c3119956d76dfbc0a16ada4c524b62c850445512084190885ca629d3
dirty_build_diff_digest: 7971826cd51e13dcbaca5002ad3e7210d57e47b22a34ef121d25e75b64847761
build_input_digest: f5433dac27c3e438d64b936ab172765919de1214ec13a72dca46125471c0675b
capability_ids: [CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-RELIABLE-UX-001]
result: engineering_and_compose_ready_real_ui_acceptance_blocked_by_computer_use_url_guard
---

# P4 工作台并发草稿保存修复与当前构建

## 发现与修复

在临时项目 `P4-WIN09-20261010`（project id `ed3f3d57-1a01-46f1-8cac-27d61c17017c`）的新建流程中，Renderer 两次记录了 `CREATION_UI_STALE`。Project Host 的版本比较正确地拒绝旧版本写入；Renderer 当时直接把该并发结果记成操作失败，没有先读回当前工作台草稿。本次保留 Host 的严格版本校验，在 Renderer 读取最新版本后按独立表单字段三方合并：无重叠修改安全重试，相同值视为已保存，同字段冲突保留本窗口输入并明示冲突，不覆盖对方保存内容。

测试项目已由本次操作创建，错误历史仍保留；此前仅打开本机文件选择器，没有选择或导入素材，没有调用模型，也未清除问题记录或删除项目。

## 工程与 Compose 验证

- `pnpm run renderer:workbench:test`：通过；新增独立字段并发合并、相同输入去重、对象键次序规范化和同字段冲突保留断言。
- `pnpm run stage3:p4-integration:test`：通过；页面、Host 会话、时间线、批注、回收站、近期项目及关闭流程回归通过。
- `pnpm run typecheck`：通过；生成并检查 91 项合同。
- `node scripts/docker/build-reliable.mjs`：通过；desktop/whisper 使用同一构建输入 `f5433dac27c3e438d64b936ab172765919de1214ec13a72dca46125471c0675b`。
- `docker compose up -d --wait --wait-timeout 1800`：通过；desktop 镜像 `sha256:fea981e3c7fa8e84af7303162d3f7d652fe8b820278be8a99ab525871f52a570`、whisper 镜像 `sha256:0e1f914081d4d2b776517ad465ce0a4d38acd4d201cd9116d67e6e39d1c45d4c` 均 Healthy；`http://localhost:6080/health` 返回 `{"status":"ready"}`。
- `git diff --check`：通过。
- 当前运行明细及文件/镜像指纹：[p4-workbench-ui-save-merge-build-identity-r3.json](../assets/p4-ux/p4-workbench-ui-save-merge-build-identity-r3.json)。

## 真实界面验收状态

本轮刷新桌面应用列表后确认唯一 Chrome 窗口标题为 `AVE 工作台 - Google Chrome`。Computer Use 在读取该窗口状态前返回：`Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.` 按该安全结果停止本轮所有界面输入，没有切换到其他自动化入口绕过限制。

因此新构建尚未经过可见桌面操作；WIN-09 的失败持续性/恢复流程、WIN-10 的十种工作台状态和用户界面反馈仍未验收。不得据此完成工作包或声明 P4 接受。下一轮需在 Computer Use 能确认当前 URL 后，从新建空项目继续 WIN-09 与 WIN-10；保留本测试项目和旧错误历史。
