# Validation

## Automated validation executed

### WO-001 base checks

- Scenario：基座类型和架构边界检查。
- User Intent：确认仓库可作为后续工作单的安全起点。
- Preconditions：Node.js 可用。
- Environment：Windows，本地仓库，2026-07-29。
- Representative Data：最小 TypeScript 包和 Worker 协议入口。
- Exact Steps or Command：`npm install`; `npm run check`。
- Expected Observable Result：TypeScript 无错误，architecture check 输出 passed。
- Actual Observable Result：2026-07-29 执行成功；`npm install` 添加 1 个依赖且无漏洞，`npm run check` 中 `tsc -p tsconfig.base.json --noEmit` 和 architecture check 均通过。
- Failure and Recovery Path：失败时保留旧文件，修复对应基座配置后重跑。
- Evidence：终端输出 `architecture check passed`；类型检查无错误。
- Remaining Risk：尚无真实媒体和 Python 运行验证。
- Date：2026-07-29

### WO-003 Project Storage

- Scenario：迁移、WAL、对象原子写入和 SQLite 完整性。
- User Intent：项目关闭或崩溃后仍保留可恢复状态。
- Preconditions：Node 22 `node:sqlite` 可用。
- Environment：Windows，本地临时目录，2026-07-29。
- Representative Data：一个项目、一条 project event、一个内容寻址对象。
- Exact Steps or Command：`npm run storage:check`。
- Expected Observable Result：输出 `storage check passed`。
- Actual Observable Result：已成功输出原有 smoke 结果，并新增 `project storage lifecycle check passed`：创建、manifest、锁竞争、关闭、锁释放后立即重开、对象写入均通过。
- Failure and Recovery Path：临时 smoke 目录失败后可删除重跑；正式项目迁移失败时阻断打开。
- Evidence：命令输出和 `database/migrations/0001_project_core.sql`。
- Remaining Risk：尚未有崩溃恢复测试；Project Host API 仍由上层工作单接入。
- Date：2026-07-29

## Planned validation

P0 真实 VFR 素材全链路验收尚未执行，需 WO-003 至 WO-015 完成后进行。

### WO-002 Contract Toolchain

- Scenario：Schema、examples 和生成文件检查。
- User Intent：防止 TS/Python 协议漂移。
- Preconditions：Node.js/npm 依赖已安装。
- Environment：Windows，本地仓库，2026-07-29。
- Representative Data：4 个 v1 Schema、2 个 valid examples。
- Exact Steps or Command：`npm run contracts:generate`；`npm run check`。
- Expected Observable Result：生成 TS/Python 文件，输出 `contract check passed (4 schemas)`。
- Actual Observable Result：已成功输出 `contract check passed (4 schemas)`。
- Failure and Recovery Path：修复 Schema 引用或生成器后重新生成；不手改 generated 文件。
- Evidence：`contracts/generated/` 下生成 manifest、4 组 TS/Python 文件。
- Remaining Risk：尚无 invalid examples、旧版本迁移和完整 roundtrip。
- Date：2026-07-29

## Manual validation executed

Worker 协议入口已执行：`'{"protocol_version":1,"message_type":"handshake"}' | python apps/worker-host/src/worker_host/main.py`，实际返回 `{"protocol_version": 1, "message_type": "handshake", "payload": {"status": "ready"}}`。

### WO-007 Media Probe

- Scenario：生成并探测合成 MP4。
- User Intent：确认媒体工具链可获得音视频事实。
- Preconditions：本机 FFmpeg/ffprobe 7.1.1 可执行。
- Environment：Windows，本地仓库，2026-07-29。
- Representative Data：1 秒 320x180 H.264/AAC synthetic fixture。
- Exact Steps or Command：`npm run media:fixture`；`npm run media:probe`。
- Expected Observable Result：probe 识别 H.264 视频和音频流。
- Actual Observable Result：已成功生成 Fixture；`media:probe` 输出 `media probe check passed (h264, 320x180)`。
- Failure and Recovery Path：删除生成 Fixture 后重新生成；不使用用户原片替代。
- Evidence：`tests/fixtures/generated/p0-synthetic.mp4`（本地生成且被 gitignore）。
- Remaining Risk：尚未生成代理、ProxyTimeMap 验证和原片 Master 阻断。
- Date：2026-07-29

## Validation not yet performed

Worker handshake、Schema example、数据库恢复、RenderGraph 和 Master QC 尚未执行。

### WO-011 Edit IR

- Scenario：合法 Edit IR 经 Resolve、Compile、Simulate、Validate 生成一个 AddClip CommitPlan。
- User Intent：确保模型候选不会直接进入 Timeline。
- Preconditions：Asset 已存在，Timeline base version 为 0。
- Environment：Windows，本地 TypeScript 类型检查，2026-07-30。
- Representative Data：一个 SHA-256 Asset、一个 Add 操作、30 PTS Source Range。
- Exact Steps or Command：`npm run check`。
- Expected Observable Result：6 个 Schema 校验通过，Edit IR 类型和 property fixture 编译通过。
- Actual Observable Result：`npm run edit-ir:test` 和 `npm run check` 均成功；Resolve→Compile→Simulate→Validate 链路实际通过。
- Failure and Recovery Path：Resolve/Simulate 失败时不产生 CommitPlan；修复后从原始 IR 重跑。
- Evidence：`packages/core/edit-ir/src/public.ts`、`tests/property/edit-ir.test.ts`。
- Remaining Risk：尚未在 Project Host 事务中提交，RenderGraph 尚未实现。
- Date：2026-07-30

### WO-033 Evidence Graph Persistence

- Scenario：Project Host 接收 ASR 证据，事务写入 Evidence Graph，关闭重开后读取；非法时间范围被拒绝。
- Exact Steps or Command：`npm run evidence:persistence:test`；`npm run check`。
- Actual Observable Result：已成功通过；`evidence_records` 迁移、事件记录、内容读取和重开恢复均通过，非法 PTS 范围返回错误。
- Remaining Risk：尚未将真实模型 Worker 输出接入 Project Host API，OCR/Scene 的真实输出尚未现场运行。
- Date：2026-07-30

### WO-032 Analysis Evidence Worker

- Scenario：通过 Worker 输入明确的 ASR 记录，并阻断空 OCR、非法 Scene 时间范围和未知分析类型。
- Exact Steps or Command：`npm run worker:analysis:test`；`npm run check`。
- Actual Observable Result：已成功通过；合法记录带 source 输出，空分析返回 `EMPTY_ANALYSIS`，非法范围返回 `INVALID_RANGE`，未知类型返回 `UNSUPPORTED_ANALYSIS`。Worker 未打开 SQLite。
- Remaining Risk：当前是显式外部分析结果接入边界，尚未运行真实 ASR/OCR/Scene 模型，也尚未持久化 Evidence Graph。
- Date：2026-07-30

### WO-012 RenderGraph

- Scenario：基础 RenderGraph 在 preview/master 两个目标上校验，并阻断缺失 sink。
- User Intent：确保 Preview 与 Master 使用同一效果语义。
- Preconditions：Render capability map 已声明 source 与 sink。
- Environment：Windows，本地 TypeScript/tsx，2026-07-30。
- Representative Data：source.original → sink.mp4 基础图，以及无 sink 非法图。
- Exact Steps or Command：`npm run render-graph:test`；`npm run check`。
- Expected Observable Result：合法图无 issue，非法图返回 `NO_SINK`，7 个 Schema 校验通过。
- Actual Observable Result：已成功通过。
- Failure and Recovery Path：RenderGraph 校验失败时不进入渲染；从原始图重建并重跑。
- Evidence：`packages/core/render-graph/src/public.ts`、`tests/property/render-graph.test.ts`。
- Remaining Risk：尚未调用 FFmpeg Preview/Master，也尚未执行 Master QC。
- Date：2026-07-30

### WO-013 Preview/Master

- Scenario：从合成真实 MP4 生成 Preview 与原片 Master。
- User Intent：确认预览和最终输出均使用 RenderGraph 语义，Master 不误用代理。
- Preconditions：FFmpeg/ffprobe 7.1.1 可用，synthetic MP4 已生成。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：1 秒 H.264/AAC original；Preview 160px 缩放；Master 原片流复制。
- Exact Steps or Command：`npm run media:render`；`npm run render:path:test`。
- Expected Observable Result：两个 MP4 存在且 ffprobe 可解码，Master 输入路径不含 proxy。
- Actual Observable Result：`npm run editorial:test` 和 `npm run check` 已成功；11 个 Schema 校验通过。
- Failure and Recovery Path：删除 generated renders 后重跑；Master 输入不满足原片回链时阻断。
- Evidence：`tests/fixtures/generated/renders/`（gitignore）。
- Remaining Risk：尚未有正式 RenderGraph 到 FFmpeg 命令编译器和 Master QC。
- Date：2026-07-30

### WO-014 Master QC

- Scenario：对原片 Master 生成结构化 QC 报告并验证通过/阻断逻辑。
- User Intent：交付前阻断不可解码或误用代理的成片。
- Preconditions：`master.mp4` 已通过 Preview/Master 渲染。
- Environment：Windows，本地 FFmpeg/ffprobe，2026-07-30。
- Representative Data：H.264/AAC Master MP4。
- Exact Steps or Command：`npm run media:qc`；`npm run qc:test`。
- Expected Observable Result：生成 `master-qc.json`，状态为 passed，issues 为空。
- Actual Observable Result：待执行。
- Failure and Recovery Path：任何 error issue 都将报告标为 blocked 并使命令失败。
- Evidence：`tests/fixtures/generated/renders/master-qc.json`（gitignore）。
- Remaining Risk：尚未完成完整 black/freeze、silence/clipping/loudness 数值检测。
- Date：2026-07-30

### WO-015 P0 acceptance

- Scenario：项目、合成媒体、Timeline Add/Move/Undo/Redo、Preview、原片 Master、QC、关闭重开。
- User Intent：验证最小剪辑工程闭环可恢复。
- Preconditions：Node、SQLite、FFmpeg/ffprobe 可用。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：仓库生成的 1 秒 H.264/AAC MP4。
- Exact Steps or Command：`npm run p0:acceptance`。
- Expected Observable Result：全部阶段成功，重开后项目 manifest 一致。
- Actual Observable Result：已成功输出 `P0 acceptance passed (project, media, timeline, snapshot, preview, master, qc, restart)`；Master QC 已执行 decode、black/freeze、silence、clipping 和 proxy usage 基础检测。
- Failure and Recovery Path：任一阶段失败即退出；临时项目目录自动清理。
- Evidence：`tests/integration/p0-acceptance.mjs` 和命令输出。
- Remaining Risk：当前媒体是授权合成 VFR MP4，不是用户手机原片；Electron 桌面宿主入口仍未实现。
- Date：2026-07-30

### VFR and crash-recovery follow-up

- Scenario：生成并探测非恒定帧率 Fixture；验证遗留项目锁恢复。
- User Intent：确认 P0 时间基准和异常退出恢复不依赖恒定帧率或人工清锁。
- Preconditions：FFmpeg/ffprobe、Node SQLite 可用。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：`p0-vfr.mp4`，23 帧，`avg_frame_rate=345/16`、`r_frame_rate=30/1`；伪造已退出 PID 的 `project.lock`。
- Exact Steps or Command：`npm run media:vfr`；`npm run media:vfr:probe`；`npm run storage:check`。
- Expected Observable Result：VFR probe 拒绝 CFR；死锁恢复后项目可打开。
- Actual Observable Result：VFR probe 输出 `VFR probe passed (avg=345/16, r=30/1, frames=23)`；storage lifecycle 输出 passed。
- Failure and Recovery Path：活动 PID 的锁仍阻断；不存在的 PID 才允许恢复。
- Evidence：`tools/media-fixture-builder/probe-vfr.mjs`、`packages/platform/project-storage/src/project-storage.mjs`。
- Remaining Risk：真实用户手机素材和 Electron 主进程崩溃恢复尚未现场验证。
- Date：2026-07-30

### WO-016 Electron boundary

- Scenario：检查 Main/Preload 的 Electron 安全边界。
- User Intent：Renderer 只能通过窄 Project API 访问 Host。
- Preconditions：源码静态检查，不依赖 Electron runtime 下载。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：Main、Preload、CSP 和 Renderer 最小入口。
- Exact Steps or Command：`npm run desktop:boundary`。
- Expected Observable Result：输出 `desktop boundary check passed`。
- Actual Observable Result：`npm run desktop:boundary` 和 `npm run check` 均通过；Electron runtime 下载因 `ECONNRESET` 失败，runtime 尚未验证。
- Failure and Recovery Path：网络恢复后重新安装 Electron 并运行桌面 smoke；当前不宣称桌面 runtime 完成。
- Evidence：`apps/desktop/src/main.ts`、`apps/desktop/src/preload.ts`、`tests/architecture/desktop-boundary.mjs`。
- Remaining Risk：Electron runtime、窗口加载和真实 IPC 尚未执行。
- Date：2026-07-30

### Project API boundary

- Scenario：检查 Query/Command/Subscribe 公共接口和依赖边界。
- Exact Steps or Command：`npm run project-api:boundary`；`npm run check`。
- Actual Observable Result：Project API boundary check、TypeScript、架构、合同和存储检查均通过。
- Remaining Risk：Electron runtime IPC 尚未实际启动。
- Date：2026-07-30

### WO-017 Editorial Core

- Scenario：Observation 作为证据，Interpretation 经过证据和置信度校验后批准。
- Exact Steps or Command：`npm run contracts:generate`；`npm run editorial:test`；`npm run check`。
- Actual Observable Result：待执行。
- Remaining Risk：尚无 ASR/OCR/Scene 真实分析输入和 Story Agent。
- Date：2026-07-30

### WO-018 Evidence and Sufficiency

- Scenario：已知 Observation 批准 Event；素材不足时阻断批准和故事生成。
- Exact Steps or Command：`npm run contracts:generate`；`npm run evidence:test`；`npm run check`。
- Actual Observable Result：已通过；14 个 Schema 校验通过，合法 Event 被批准，insufficient/unknown 状态被阻断。
- Remaining Risk：尚无 ASR/OCR/Scene 真实分析输入、覆盖矩阵和完整 Project Host 语义持久化。
- Date：2026-07-30

### WO-019 Coverage Matrix

- Scenario：Creative Contract 的 hard requirement 映射到已批准证据，缺失覆盖时阻断。
- Exact Steps or Command：`npm run contracts:generate`；`npm run coverage:test`；`npm run check`。
- Actual Observable Result：已成功通过；15 个 Schema 校验通过，covered 可批准，missing 会失败。
- Remaining Risk：尚未接入真实 Interview、ASR/OCR/Scene 分析结果。
- Date：2026-07-30

### WO-020 Analysis Evidence

- Scenario：明确 ASR/OCR/Scene 分析段转换为 Observation，空/非法输入阻断。
- Exact Steps or Command：`npm run contracts:generate`；`npm run analysis:test`；`npm run check`。
- Actual Observable Result：已成功通过；18 个 Schema 校验通过，合法分析段可生成 Observation，非法时间/空输出失败。
- Remaining Risk：尚未接入真实 ASR、OCR、Scene 工具输出和 Worker 任务调度。
- Date：2026-07-30

### WO-021 Story Approval

- Scenario：候选故事经过 Coverage Matrix、证据引用和用户身份审批后生成 Approved Story Plan。
- Exact Steps or Command：`npm run contracts:generate`；`npm run story:test`；`npm run check`。
- Actual Observable Result：已通过；20 个 Schema 校验成功，未知证据/未覆盖硬约束阻断批准。
- Remaining Risk：尚未实现真实 Story Agent、Assembly Cut 和 Project Host 审批持久化。
- Date：2026-07-30

### WO-022 Assembly Cut

- Scenario：Approved Story Plan 生成可验证 Assembly Cut，Beat 和素材证据可追溯。
- Exact Steps or Command：`npm run contracts:generate`；`npm run assembly:test`；`npm run check`。
- Actual Observable Result：已成功通过；21 个 Schema 校验通过，计划不匹配和未知证据被阻断。
- Remaining Risk：尚未接入真实 Assembly Edit IR 编译和 Project Host 提交事务。
- Date：2026-07-30

### WO-023 Assembly Edit IR

- Scenario：validated Assembly Cut 编译为带 Beat/证据的 Edit IR 候选，未验证候选阻断。
- Exact Steps or Command：`npm run assembly-compiler:test`；`npm run check`。
- Actual Observable Result：已成功通过；21 个 Schema 校验成功，candidate 状态不能编译。
- Remaining Risk：尚未将 Assembly Edit IR 接入 Project Host 事务提交。
- Date：2026-07-30

### WO-024 Feedback Diagnosis

- Scenario：用户反馈生成 Review Issue 和 Diagnosis，未知 Issue/空反馈阻断。
- Exact Steps or Command：`npm run contracts:generate`；`npm run feedback:test`；`npm run check`。
- Actual Observable Result：已成功通过；23 个 Schema 校验成功，合法反馈被标记 reviewed。
- Remaining Risk：尚未实现 Compare、Reaction Timing、J/L Cut 和 Feedback Patch Rebase。
- Date：2026-07-30

### WO-025 Compare and Reaction Timing

- Scenario：比较两个不同 Timeline 版本并记录带 PTS 的用户反应。
- Exact Steps or Command：`npm run contracts:generate`；`npm run compare:test`；`npm run check`。
- Actual Observable Result：已成功通过；25 个 Schema 校验通过，非法版本关系和负时间被阻断。
- Remaining Risk：尚未实现 Rough Cut Patch、J/L Cut 和 Project Host 事件持久化。
- Date：2026-07-30

### WO-026 Rough Cut Patch

- Scenario：生成带 base_version 的 L-Cut Patch，验证冲突、未知 Clip 和音频偏移失败。
- Exact Steps or Command：`npm run contracts:generate`；`npm run rough-cut:test`；`npm run check`。
- Actual Observable Result：已成功通过；26 个 Schema 校验通过，非法 Patch 均被阻断。
- Remaining Risk：尚未在 Project Host 事务中应用 Patch，也未做真实音画同步验收。
- Date：2026-07-30

### WO-027 Delivery Gates

- Scenario：QC、Privacy、Rights、Original Link 全部通过后交付 ready；敏感素材未处理时阻断。
- Exact Steps or Command：`npm run contracts:generate`；`npm run delivery:test`；`npm run check`。
- Actual Observable Result：已成功通过；28 个 Schema 校验成功，任一失败 Gate 都被阻断。
- Remaining Risk：尚未实现实际导出文件登记、版权服务和隐私处理 Worker。
- Date：2026-07-30

### WO-028 Export Registration

- Scenario：批准版权并登记 ready Delivery 的 MP4 导出哈希与 QC 报告关系。
- Exact Steps or Command：`npm run contracts:generate`；`npm run export:test`；`npm run check`。
- Actual Observable Result：已成功通过；30 个 Schema 校验成功，未批准版权/错误 QC 关系/非法哈希失败。
- Remaining Risk：尚未登记真实导出文件到 Project Host/Object Store，也未做最终专业导出格式矩阵。
- Date：2026-07-30

### WO-029 Export Persistence

- Scenario：真实文件导出登记，计算 SHA-256，写入 render_outputs 和 project event，关闭重开后读取。
- Exact Steps or Command：`npm run export:persistence:test`；`npm run check`。
- Actual Observable Result：已成功通过；导出哈希、Delivery/QC 关联、迁移和重开读取均验证成功。
- Remaining Risk：尚未接入真实 Project Host API 和桌面导出按钮。
- Date：2026-07-30

### WO-030 Export Capability

- Scenario：验证 1080p H.264/AAC MP4 合法 profile，并阻断 4K 超出 capability 的 profile。
- Exact Steps or Command：`npm run contracts:generate`；`npm run export-capability:test`；`npm run check`。
- Actual Observable Result：已成功通过；31 个 Schema 校验成功，非法尺寸被阻断。
- 实际补充验证：social_1080p、archive_4k、vertical_short 三种 profile 均通过，跨 profile 非法尺寸被阻断。
- Remaining Risk：尚未实现多平台格式矩阵和真实发布平台导出验收。
- Date：2026-07-30

### WO-031 Contract Compatibility

- Scenario：valid examples 通过、invalid examples 失败、Schema ID 唯一且显式 v1。
- Exact Steps or Command：`npm run contracts:migrate-v0`；`npm run contracts:roundtrip`；`npm run check`。
- Actual Observable Result：已成功通过；v0 `ticks/scale` 迁移为 v1 `value/timescale`，31 个 Schema 生成 TypeScript/Python 文件数量一致且均带生成标记，invalid examples 被拒绝。
- Remaining Risk：roundtrip 当前还未执行带字段值的 Python TypedDict 运行时实例化；Electron runtime 和真实手机原片仍未现场验收。
- Date：2026-07-30

### WO-035 Project Host Session

- Scenario：Main 创建并关闭真实项目，再重新打开同一项目；Renderer 不传入路径，Project Host 负责 SQLite 会话和锁。
- Exact Steps or Command：`npm run project-host:test`；`npm run desktop:boundary`；`npm run check`。
- Actual Observable Result：已成功通过；项目身份真实生成并在重开后保持一致，关闭后锁释放，目录选择逻辑位于 Main，Renderer 只发送 `project.open` 命令。
- Remaining Risk：Electron runtime 尚未现场启动；状态面板当前缓存项目身份，Timeline/Render/QC 的实时刷新尚未接入。
- Date：2026-07-30

### WO-036 Timeline Command API

- Scenario：创建 Timeline、提交 Add Clip 和 Move Clip，并拒绝旧版本命令。
- Exact Steps or Command：`npm run timeline:host:test`；`npm run check`；`npm run p0:acceptance`。
- Actual Observable Result：已成功通过；合法命令生成 v1，旧 `base_version=0` 被拒绝，事务写入 snapshot/command/event，P0 回归仍通过。
- Remaining Risk：Renderer 尚未提供完整 Timeline 编辑控件，Electron runtime 尚未现场启动。
- Date：2026-07-30

### WO-037 Undo/Redo

- Scenario：Timeline Add 后执行 Undo，再执行 Redo；验证每次操作生成新版本且使用逆命令。
- Exact Steps or Command：`npm run undo-redo:test`；`npm run check`；`npm run p0:acceptance`。
- Actual Observable Result：已成功通过；Add→Undo→Redo 产生 v1/v2/v3，无历史时明确失败，P0 回归通过。
- Remaining Risk：Redo 栈尚未在关闭重开后持久化，Renderer 尚未提供控件。
- Date：2026-07-30

### WO-040 Project Host Render/QC Command

- Scenario：通过 Render Service 对真实 VFR Fixture 生成 proxy/preview/master 和 QC 报告，Master 使用原片并阻断 proxy 路径。
- Exact Steps or Command：`npm run render-service:test`；`npm run check`。
- Actual Observable Result：已成功通过；FFmpeg/ffprobe 生成并验证 Preview/Master，QC passed，proxy Master 被阻断，Renderer 仅发送 `project.render`。
- Remaining Risk：Electron runtime 和真实文件选择器尚未现场启动，Render/QC 状态尚未持久化到项目事件。
- Date：2026-07-30

### WO-041 Render/QC Persistence

- Scenario：Project Host 持久化 Render Run 与 QC passed 状态，关闭重开后读取。
- Exact Steps or Command：`npm run render-persistence:test`；`npm run render-service:test`；`npm run check`。
- Actual Observable Result：已成功通过；`render_runs` 迁移、`render.completed` 事件、输出路径、QC 报告和重开读取均通过。
- Remaining Risk：Electron runtime 尚未现场启动；Render/QC 失败路径的完整 UI 展示和最终交付导出仍待后续工作单。
- Date：2026-07-30

### WO-042 Project Host Evidence API

- Scenario：通过 Project Host 注册合法 ASR 证据，阻断非法 OCR 时间范围，关闭重开后读取。
- Exact Steps or Command：`npm run evidence:host:test`；`npm run worker:analysis:test`；`npm run check`。
- Actual Observable Result：已成功通过；合法 ASR 记录写入并重开恢复，非法 PTS 返回 `invalid evidence range`，Worker 仍不访问 SQLite。
- Remaining Risk：尚未接入真实 ASR/OCR/Scene 模型输出和真实素材分析调度。
- Date：2026-07-30

### WO-043 Approved Story Plan Persistence

- Scenario：注册包含有效 ASR Evidence 的 ApprovedStoryPlan，阻断未知证据，关闭重开后恢复计划。
- Exact Steps or Command：`npm run story-host:test`；`npm run check`。
- Actual Observable Result：已成功通过；审批身份/时间/Beat 校验、Evidence 引用校验、`story.plan.approved` 事件和重开读取均通过。
- Remaining Risk：尚未接入真实 Story Agent、Assembly Cut API 和桌面审批界面。
- Date：2026-07-30

### WO-044 Assembly Cut Project Host Gate

- Scenario：注册批准 Story Plan 后提交 Assembly Cut，未知 beat 被阻断，合法 cut 以 validated 状态持久化。
- Exact Steps or Command：`npm run assembly:host:test`；`npm run check`。
- Actual Observable Result：已成功通过；批准计划、Evidence 引用、beat 引用和时间范围门槛通过，非法 cut 返回 unknown beat，`assembly.validated` 事件写入。
- Remaining Risk：尚未将 validated Assembly Cut 编译为 Edit IR 并提交 Timeline，桌面 Assembly UI 尚未接入。
- Date：2026-07-30

### WO-045 Assembly Edit IR 到 Timeline

- Scenario：将 validated Assembly Cut 编译为 Edit IR add 操作并提交 Timeline，旧 base version 被阻断。
- Exact Steps or Command：`npm run assembly:timeline:test`；`npm run check`。
- Actual Observable Result：已成功通过；Assembly 编译生成 Timeline v1，重复旧版本提交返回 version conflict，Command/Commit 事务路径通过。
- Remaining Risk：当前为最小单视频轨编译，音频、多轨和完整 Edit IR metadata 尚未接入。
- Date：2026-07-30

### WO-046 Rough Cut Patch Project Host

- Scenario：对真实 Timeline 应用合法 replace Patch，旧 base version 和不支持的音频操作被阻断。
- Exact Steps or Command：`npm run rough-cut:host:test`；`npm run check`。
- Actual Observable Result：已成功通过；Patch Core 校验、replace Command/Commit 和 version conflict 均通过，失败不会产生半提交。
- Remaining Risk：J/L Cut 音频路由尚未接入，Feedback/Compare Project Host API 和 Review UI 仍待实现。
- Date：2026-07-30

### WO-047 Feedback/Compare Review Artifacts

- Scenario：保存 reviewed Feedback Diagnosis 和不同 Timeline 版本 Compare，阻断未知 Issue、空反馈和相同版本比较。
- Exact Steps or Command：`npm run review-artifact:test`；`npm run check`。
- Actual Observable Result：已成功通过；`review_artifacts` 持久化、reviewed 状态、Issue 引用和 Compare 版本门槛均通过。
- Remaining Risk：Reaction Timing、J/L 音频路由和桌面 Review/Compare UI 尚未接入。
- Date：2026-07-30

### WO-048 Reaction Timing

- Scenario：记录引用 Compare 的非负 Reaction Timing，阻断未知 Compare 和负 PTS。
- Exact Steps or Command：`npm run reaction-host:test`；`npm run check`。
- Actual Observable Result：已成功通过；`reaction_timings` 迁移、`review.reaction_timing.registered` 事件、BigInt PTS 序列化和非法输入阻断均通过。
- Remaining Risk：桌面 Review UI、真实用户反应采集和 P4 交付仍未完成。
- Date：2026-07-30

### WO-049 Delivery/Privacy/Rights Host Gates

- Scenario：Project Host 保存 Privacy/Rights 审批和 Delivery ready 门控，阻断敏感隐私无动作及 blocked QC。
- Exact Steps or Command：`npm run delivery:host:test`；`npm run check`。
- Actual Observable Result：已成功通过；Core approve/validate 门控、`delivery_records` 持久化和交付事件均通过。
- Remaining Risk：真实 Export Registration、Capability 矩阵 API、平台格式发布和 Electron 交付 UI 尚未接入。
- Date：2026-07-30

### WO-050 Export Registration/Capability Host API

- Scenario：对 ready Delivery 登记真实导出文件，计算 SHA-256，校验 QC 关系和导出 profile capability。
- Exact Steps or Command：`npm run export:host:test`；`npm run check`。
- Actual Observable Result：已成功通过；真实文件哈希登记、ready Gate、social_1080p profile 通过，超出尺寸 profile 被阻断。
- Remaining Risk：真实平台发布、Electron runtime 和最终交付 UI 尚未完成。
