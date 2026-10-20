---
evidence_id: EVD-20261011-S3-P4-UX-DEMO-INTEGRATION-R5
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-11
recorded_at: 2026-10-10T16:49:33Z
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 6d41af52d52a6b305203800918ae9463ce85310d19e3da1f958e8420cb67e785
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: p4_engineering_passed_global_docs_check_blocked_by_historical_applicability
---

# P4 demo 工作台操作接入工程复验

## 本轮接入

- 精修资源栏包含可搜索的实际项目素材、三种已注册视频效果和交叉溶解转场；素材页保留管理用途，效果/转场只经类型化时间线命令生效。
- 工作区面板尺寸、折叠状态、素材视图偏好和共享对话气泡拖动位置以当前作品 UI 状态持久化；时间线说明按实际接入的播放、选择、逐帧定位、分割、删除、撤销/重做和批注手势编写。
- 主视频片段可落入临时 PiP 区创建画中画轨；当前请求已授权的视频/图片素材可以在同一临时落点建轨并入片。PiP 保留变换、源范围与精确帧校验，支持修剪、分割和跨轨操作。
- demo 中的轨道 × 现支持删除有内容的可选轨。删除以单条 `remove_track` 命令原子提交，Host 版本恢复可撤销/重做并在重开后保持；主视频轨不可删除，锁定轨和带保护范围的轨会失败关闭。
- 删除或移走可选轨的最后一个对象时，删除对象和清理空轨作为同一批 Host Timeline 命令提交；撤销/重做仍使用既有 Host 编辑历史。
- Worker 当前字体能力受限，UI 仅暴露当前 Worker 镜像确认提供的字体；不支持的已存样式必须由用户先修正，不能让“保存成功”掩盖后续渲染失败。

## 工程检查

- `pnpm docs:start -- WP-S3-RELIABLE-UX-001`：成功。
- `pnpm run stage3:p4-integration:test`：成功；页面状态、面板持久化、共享输入位置、过期项目会话、时间线、批注、回收站和近期项目集成通过。
- `pnpm run stage3:p4-timeline:test`：成功；精确插入/重排/修剪/分割、效果替换、交叉溶解、多轨素材/字幕和失败关闭边界通过。
- `stage3:p4-timeline:test` 中的真实 Host 回归：成功；新建含片段 PiP 轨、删除、撤销恢复完整轨和片段、重做删除并重开项目验证结果。
- `pnpm run timeline-render:test`：成功；提交的时间线渲染接受检查通过。
- `pnpm run worker:render-graph:test`：成功；Worker RenderGraph 协议 smoke 通过。
- `pnpm run renderer:workbench:test`：成功；Renderer 工作台边界通过。
- `pnpm run interaction-acceptance:test`：成功；脚本明确说明 fixtures **不是** UI 验收。
- `pnpm run typecheck`：成功；合同生成及 TypeScript 检查通过。
- `pnpm run contracts:check`：成功，91 个 schema、91 个有效示例、91 个无效示例通过。
- `pnpm run architecture`：成功，扫描 1492 个源码文件。
- `pnpm run docs:sync`：成功；生成 current 视图。
- `git diff --check`：成功；仅有既有 LF/CRLF 提示。
- `node --check`：六个本轮相关 Renderer JavaScript 文件通过。
- `pnpm run docs:check`：失败，报告 37 项历史/非活动 Capability Evidence applicability 不匹配；当前 `CAP-S3-P4-DEMO-INTEGRATION-001` 与 `CAP-S3-RELIABLE-UX-001` 均不在失败列表，当前活动包 Evidence 指纹一致。历史 Evidence 未重写。
- 首次新增 Host 删除回归用过重开前的父草稿，Host 按设计返回 `REQUEST_BASE_STALE`；测试改从重开后当前草稿继续并通过。随后首次 `typecheck` 暴露测试对 TimelineCommand 联合类型缺少 `add_track` 收窄；补上类型判断后最终类型检查与整包回归通过。Host 对过期父草稿的校验没有放宽。

## 尚未接受的范围

本轮没有生成产品构建、部署或刷新 6080。没有可绑定本轮源码的 `build_input_digest`、`dirty_build_diff_digest`、运行时或 Compose 身份，故不记录这些字段，也不能断言当前服务包含本轮改动。自动化 fixture、源码检查和 Worker smoke 不代表真实窗口操作。WIN-09 的持久问题恢复及 WIN-10 的空项目到导出、键盘/中文输入/焦点/缩放/reduced-motion 与整体视觉反馈仍须由用户在同一完整当前构建上验收；两个 P4 Capability/Acceptance 与活动包保持 pending。全局 `docs:check` 另受 37 条历史/非活动适用性债务阻塞，本轮只确认活动 P4 记录未触发该错误。
