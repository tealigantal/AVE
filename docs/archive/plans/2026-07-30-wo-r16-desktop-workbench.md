<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-R16 Desktop 最小可用工作台

## 用户可见目标

在不把权威状态放入 Renderer 的前提下，提供可运行的最小桌面工作台：创建/打开/关闭项目、素材导入、后台任务状态、素材列表、播放器、Story Plan/Timeline/Undo/Redo/AI 候选/Preview/A-B Compare/QC/Delivery/Export 的可查询和可操作入口。复杂视觉包装不属于本工作单。

## 当前上下文

R01–R15 已完成协议、Project Host、Worker、持久化、Timeline/Render、Model Gateway 和 Feature 边界。当前 Electron Main/Preload 已有安全 IPC 骨架，但 Renderer 仍需按蓝图建立 `app`、`workbench`、`features`、`api`、`state`、`components`、`styles` 结构并连接 Project API。

## 里程碑

- [x] 建立 Renderer 应用壳、工作台布局和 Project API client。
- [x] 接通项目创建/打开/关闭、Host 状态查询和 Timeline 当前快照查询。
- [x] 接通空 Timeline 初始化、Undo/Redo 命令，并通过 Host Command/Commit。
- [x] 接通真实素材导入和 Job 状态列表。
- [x] 接通 Timeline Add/Move/Trim 和素材列表。
- [x] 接通 Host Preview 字节读取、Renderer 播放器和持久化 Timeline 版本 Diff。
- [x] 接通 Story Plan 审批、Preview/QC、A/B Compare、Delivery、Export 的真实 Host 命令和最小状态展示。
- [x] 对尚未有真实 Provider/Host 候选合同的 AI 候选显示明确的待接线状态，不伪造结果。
- [x] 关闭重开后由 Host 集成测试证明素材、Job、Timeline 和 UI 所需查询状态可重新读取；Renderer 不持有权威状态。

## 当前验证证据

- `apps/desktop/src/renderer/` 已建立 `app`、`workbench`、`features`、`api`、`state`、`components`、`styles`。
- `project.create`、`project.open`、`project.close`、`project.timeline.current` 已接入安全 IPC；Renderer 只通过 Preload 的 Project API 调用。
- `project.media.import` 使用 Worker fingerprint/probe 后登记 `asset_locations`；`project.media.list` 和 `project.jobs.list` 可查询持久状态。
- Story/Review/Delivery/Render/Export 记录已有只读查询；工作台命令连接 Story 审批、Preview/QC、Compare、Delivery 和 Export 登记。
- `project.preview.latest` 只由 Host 读取最近 Preview 输出字节，Renderer 通过 Blob 播放；`project.timeline.diff` 由 Host 比较相邻持久化版本。
- `project.story.propose` 通过 Project Host 注入配置的 Model Gateway Provider 生成结构化 StoryProposal；成功调用的输入、输出和审计元数据写入 Object Store 与 `model_runs`，关闭重开后可查询。
- `electron:runtime:test` 编译 Desktop/Main 与 Platform 运行时，在真实 Electron 进程中加载 `app://renderer/index.html`，验证页面标题、Preload `projectApi` 和工作台 DOM。
- `npm run renderer:workbench:test`、`npm run workbench:host:test`、`npm run typecheck`、`npm run architecture`、`npm run desktop:boundary`、`npm run project-api:boundary`、`npm run ipc:boundary` 和完整 `npm run check` 于 2026-07-30 通过；架构扫描 193 个源码文件。
- 上述检查于 2026-07-31 重新运行；完整 `npm run check` 通过，架构扫描 195 个源码文件，包含 `model-candidate:host:test` 与 `electron:runtime:test`。

## 验证

每个里程碑运行 `npm run typecheck`、`npm run architecture`、Renderer 边界测试和对应 Electron/Node 集成测试；完成前运行完整 `npm run check`。不伪造 Electron 人工操作证据，runtime 阻塞必须记录实际原因。

## 边界与回滚

Renderer 只能调用白名单 Project API，不直连 SQLite、Worker、模型或媒体文件。所有 Timeline 改动走 Host Command/Commit；若某个面板尚未有 Host 合同，只显示明确的未就绪状态，不写入本地权威状态。
