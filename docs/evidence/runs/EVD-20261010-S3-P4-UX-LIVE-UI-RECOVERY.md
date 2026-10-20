---
evidence_id: EVD-20261010-S3-P4-UX-LIVE-UI-RECOVERY
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-10
recorded_at: 2026-10-10T08:27:00Z
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: c2071f6c661b459a106e67365576b767b45110e7d9028dd4369d4d80cdf4bb9d
dirty_build_diff_digest: fdbdd827a7d54f6cbd2ccd4186cec9a4d29a752908997b0a6e0f5e859f8b8fc9
build_input_digest: c580feb79fe3ce700770d80dab8f6ff8fb1e83d2a29e47535447831a9d4fb532
capability_ids: [CAP-S3-P4-TIMELINE-001, CAP-S3-P4-ANNOTATION-001, CAP-S3-P4-RECYCLE-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-TIMELINE-001, ACC-S3-P4-ANNOTATION-001, ACC-S3-P4-RECYCLE-001, ACC-S3-RELIABLE-UX-001]
result: live_browser_workbench_navigation_and_bootstrap_passed_human_stage_exit_pending
---

# 实际浏览器工作台可用性复测

## 实际故障与修复

真实页面曾在首页等待近期作品且 `/api/invoke` 返回 `DESKTOP_SESSION_STALE`。根因是 Browser Host 已有活动项目，而新 Renderer 仍以空 `project_id` 发起与当前项目无关的首页/回收站查询和全局项目生命周期操作；会话守卫将这些请求当成过期项目请求拒绝。修复让无项目绑定的全局操作使用 Host 当前会话快照，同时保留项目绑定请求的身份校验。

另一个真实交互问题是取消“新建作品”会显示失败。文件选择取消现按控制流错误返回“已取消，作品没有更改”，不生成失败问题或日志噪音。既有项目文件和作品内容没有修改；打开最近作品仅使用界面本身的正常最近项目记录行为。

## 实际浏览器步骤与结果

在 `http://localhost:6080/` 用 Playwright 浏览器执行：

- 打开初始首页：近期作品成功载入，不再无限显示“正在读取近期作品”。
- 点击近期作品：成功进入“创作 · v0”工作台，编辑器和对话区域正常显示。
- 点击“素材”“精修”“版本”“问题”“回收站”“档案”“记录”：各页面/面板正常打开并显示当前作品对应界面。对空白作品，依赖素材或时间线的操作按预期禁用。
- 打开“新建作品”后取消：提示“已取消，作品没有更改”，未创建项目。
- 在控制台检查：0 条错误、0 条警告。稳定运行期间 desktop 容器最近 5 分钟无错误日志。早先容器重建时旧 SSE 连接出现的断开/403 已由全页重载建立新会话；重载后的交互请求均为 HTTP 200。
- 使用者数据边界：未提交创作指令、未授予模型调用授权、未导入/删除/恢复素材或作品、未执行渲染或导出。

## 自动与部署验证

- `pnpm run stage3:p4-integration:test`：通过，包含 Host 已有项目时全局首页查询以及空 Renderer 会话的新建/打开路径回归。
- `pnpm run typecheck`：通过。
- `pnpm run architecture`：通过，扫描 1491 个源码文件。
- `git diff --check`：通过。
- `pnpm run docs:sync`：通过。
- `pnpm run docs:check`：未通过。仍报告多个既有 capability Evidence applicability 不匹配，并曾报告最新 Evidence fingerprint mismatch；本记录与 State 更新后须再运行，确认最新项消除。历史 Evidence/检查断言未改写。
- Compose 部署仍使用 `docker compose up` 启动全部 Compose 服务；`desktop` 与 `whisper` 均 healthy，desktop 绑定 `127.0.0.1:6080`。运行身份见 [构建身份](../assets/p4-ux/p4-workbench-ui-live-20261010-build-identity.json)。

## 构建身份

- Repository commit: `b600b38f2afe280f0152c1811e6b2d928e5e3a95`
- Code fingerprint: `c2071f6c661b459a106e67365576b767b45110e7d9028dd4369d4d80cdf4bb9d`
- Dirty build diff digest: `fdbdd827a7d54f6cbd2ccd4186cec9a4d29a752908997b0a6e0f5e859f8b8fc9`
- Build input digest: `c580feb79fe3ce700770d80dab8f6ff8fb1e83d2a29e47535447831a9d4fb532`
- Desktop image: `sha256:55b31bda5a32902d2fdd4aac20833b4ec8ecab34345f83b0a323239fd361d022`
- Whisper image: `sha256:d8fd6d3fc5a422af9a5f1107d0579d3b550cb81ce1ac470f08e39d5e29f98d08`

## 尚未完成的验收

本记录证明被报告的“全都点不开”问题在当前 Docker Compose 构建下已修复，且覆盖上述实际导航和创建取消路径。它不代表空作品可以执行需要媒体的编辑操作，也不代表 P4 时间线/批注完整 Stage Exit、人类总体验收或发布已通过；WP-S3-RELIABLE-UX-001 仍保持 active。

