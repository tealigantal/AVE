# Validation

## WO-R01 基线清理

- Scenario：清理错误命名文档、机器生成 JSON、历史当前状态冲突和生成物跟踪。
- Exact Steps or Command：`npm run check`；全仓搜索 Windows/Unix 用户目录形式的绝对路径；检查 `git status --short --untracked-files=all`。
- Actual Observable Result：`npm run check` 实际退出码 0；错误命名 UX 文件和两个 JSON 不存在；历史计划归档到 `docs/archive/plans/`，旧进度归档到 `docs/archive/status/`；`docs/STATUS.md` 成为当前状态文件；工作区未产生生成视频或运行时输出变更。
- Remaining Risk：R02 架构检查和 R03 Contract Toolchain 尚未执行；当前仍不能宣称完整桌面产品或蓝图完成。
- Date：2026-07-30

## WO-R02 架构检查

- Scenario：对全仓源码执行依赖边界、单一 SQLite 写入者、Worker 禁止 SQLite、Renderer 禁止 Node、Core 纯度、深层导入和 FFmpeg 入口检查。
- User Intent：新增越层依赖或基础设施调用时，架构检查必须失败，而不是只扫描少数文件。
- Preconditions：Node.js 22、当前工作树、R01 基线清理完成。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：临时目录中的 Core `node:fs`、Renderer Project Storage、Worker SQLite、Core→Platform、重复 FFmpeg 入口 fixture。
- Exact Steps or Command：`npm run architecture`；`npm run architecture:test`；`npm run typecheck`。
- Expected Observable Result：当前源码通过；五类违规 fixture 均被拒绝。
- Actual Observable Result：架构扫描通过并扫描 89 个源码文件；架构回归夹具通过；TypeScript 类型检查通过。
- Failure and Recovery Path：fixture 使用临时目录并自动清理；任一违规会以文件和规则输出失败位置。
- Evidence：`tools/architecture-check/check.mjs`、`tests/architecture/architecture-check.test.mjs`、`dependency-cruiser.cjs`。
- Remaining Risk：依赖规则后续仍需随 R03–R20 扩展；当前检查尚未替代 GitHub Actions 多平台执行。
- Date：2026-07-30

## WO-R03 Contract Toolchain

- Scenario：从全部 JSON Schema 生成 TypeScript/Python 类型，遍历显式绑定的 valid/invalid Fixture，并完成跨语言 JSON roundtrip。
- User Intent：Schema 是 TypeScript、Python 和 Example 校验的唯一协议来源，生成文件漂移必须失败。
- Preconditions：Node.js、Python、Ajv、Ajv formats，31 个 v1 Schema。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：`contracts/schemas/**`、`contracts/examples/valid/**`、`contracts/examples/invalid/**`。
- Exact Steps or Command：`npm run contracts:examples`；`npm run contracts:check`；`npm run contracts:roundtrip`；`npm run contracts:clean`；`npm run check`。
- Expected Observable Result：每个 Schema 均有 valid/invalid Fixture；生成类型包含真实字段和 required/optional；manifest 记录 Schema、文件和 hash；跨语言 roundtrip 与 clean 通过。
- Actual Observable Result：31 个 Schema、31 个 valid、31 个 invalid、62 个生成文件全部通过；roundtrip 输出 TypeScript JSON parse → Python JSON parse → Schema validation；`npm run check` 退出码 0。
- Failure and Recovery Path：修改 Schema 后重新运行 generate；手改生成文件会使 `contracts:clean` 失败；Fixture 绑定错误会使 `contracts:check` 失败。
- Evidence：`tools/contract-codegen/generate.mjs`、`check.mjs`、`roundtrip.mjs`、`contracts/generated/manifest.json`（本地生成）、`contracts/examples/`。
- Remaining Risk：业务 Core 中仍存在部分历史手写协议类型，后续需要在 Feature/Host 迁移时逐步改为引用生成类型；R04–R20 未完成。
- Date：2026-07-30

## WO-R04 Project Host 包化

- Scenario：将 Desktop 内的 Project Host 业务状态迁入 Platform，Desktop Main 与 Dev CLI 通过同一 public 入口创建、打开、修改和关闭项目。
- User Intent：Project Host 是独立应用层权威，可在纯 Node 集成测试中运行，Desktop 不再拥有业务 Host 实现。
- Preconditions：R01–R03 已完成；Project Storage、Core、Render public 入口可用。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：临时 SQLite 项目、Timeline、Evidence、Story Plan、Assembly、Review、Delivery、Export Fixture。
- Exact Steps or Command：`npm run project-host:boundary`；`npm run project-host:test`；`npm run timeline:host:test`；`npm run dev-cli:test`；`npm run check`。
- Expected Observable Result：旧 Desktop Host 文件不存在；Desktop/CLI 使用 Platform public Host；关闭重开恢复项目状态；完整回归通过。
- Actual Observable Result：边界检查通过；Project Host session、Timeline Host、Dev CLI 和完整 `npm run check` 均通过。
- Failure and Recovery Path：Host 迁移可由 Git 恢复；SQLite 数据仍由 Project Storage 会话维护；架构检查阻止跨包深层入口。
- Evidence：`packages/platform/project-host/src/`、`tests/architecture/project-host-boundary.mjs`、`tests/integration/project-host.test.ts`。
- Remaining Risk：Electron Main 仍包含 IPC/业务分发逻辑，下一单 R05 拆分；Render Service 仍未迁入 Worker，下一单 R06 处理。
- Date：2026-07-30

## WO-R05 Electron Main/IPC 拆分

- Scenario：将 Electron Main 拆为启动、协议、窗口、会话和分组 Handler；使用 `app://renderer` 和 sender/session 校验，扩展 Preload 事件与选择器 API。
- User Intent：Renderer 只能访问白名单 Project API，恶意 sender、任意 channel 和宽泛 `file://` 来源必须失败。
- Preconditions：R04 Project Host public 入口完成；Node/TypeScript 可用。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：`app://renderer/index.html`、恶意 `file://`/错误 host URL、Project query/command envelope。
- Exact Steps or Command：`npm run ipc:boundary`；`npm run ipc:sender:test`；`npm run desktop:boundary`；`npm run check`。
- Expected Observable Result：Main 无业务分支；Handler 文件完整；sender/session 校验和 app protocol 存在；事件订阅、文件选择、目录选择 API 存在；全部回归通过。
- Actual Observable Result：IPC boundary、sender validation、desktop boundary 和完整 `npm run check` 均通过。
- Failure and Recovery Path：非法 URL 被 `validateRendererUrl` 拒绝；未注册窗口或 session 不匹配被拒绝；Handler 错误统一转换为标准 `{ ok: false, error }`。
- Evidence：`apps/desktop/src/main/`、`apps/desktop/src/main/ipc/`、`apps/desktop/src/preload.ts`、`tests/architecture/ipc-boundary.mjs`、`tests/architecture/ipc-sender.test.ts`。
- Remaining Risk：Electron 实际 runtime/窗口加载尚未在本机完成；当时记录的 Render Service 迁移已由 R06 完成。
- Date：2026-07-30

## Automated validation executed

## WO-R06 Worker 媒体/Render/QC 边界

- Scenario：通过 Python Worker Host 完成 media probe、fingerprint、proxy、preview、master 和 QC；验证代理来源会阻断 Master QC，并验证取消协议。
- User Intent：FFmpeg/FFprobe 只能在 Worker Host 执行；Project Host 只接收并验证候选结果，不因 Worker 失败写入项目状态。
- Preconditions：R01–R05 已完成；Python 3、Node.js、FFmpeg/FFprobe、`tests/fixtures/generated/p0-vfr.mp4` 可用。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：VFR fixture、临时 output directory、`source_kind=original` 和 `source_kind=proxy` 两种结构化来源声明。
- Exact Steps or Command：`python -m compileall -q apps/worker-host/src/worker_host`；`python apps/worker-host/tests/protocol_smoke.py`；`python apps/worker-host/tests/analysis_protocol_smoke.py`；`python apps/worker-host/tests/media_protocol_smoke.py`；`npm run worker:boundary`；`npm run architecture`；`npm run typecheck`；`npm run render-service:test`；`npm run dev-cli:test`；`npm run check`。
- Expected Observable Result：Registry 能力包含 media/render/qc tasks；stdout 仅为 JSON；媒体输出真实存在；原片 Master QC passed，proxy 来源 QC blocked；取消返回 cancelled/structured failed；Node Platform、Project Host、Desktop 和 Dev CLI 不直接启动媒体子进程。
- Actual Observable Result：上述 Worker protocol、media protocol、boundary、typecheck、Render Service、Dev CLI 和完整 `npm run check` 均通过；架构扫描 147 个源码文件；真实 VFR fixture 通过 Worker 生成 proxy/preview/master 并返回 QC passed，proxy 来源返回 blocked。
- Failure and Recovery Path：FFmpeg/FFprobe 非零退出、超时、取消或非法来源返回 structured diagnostic，取消实际返回 `CANCELLED`，临时工作区由 runtime 清理，Project Host 不登记失败候选；R07 负责将该失败持久化为可恢复 Job。
- Evidence：`apps/worker-host/src/worker_host/registry.py`、`runtime/engine.py`、`adapters/`、`handlers/`、`packages/platform/worker-client/src/runtime.mjs`、`packages/platform/render-service/src/render-service.mjs`、`tests/architecture/worker-boundary.mjs`、`apps/worker-host/tests/media_protocol_smoke.py`、ADR-0004。
- Remaining Risk：当前单 Job Worker Client 尚未持久化 Job/attempt、重启恢复或重试；完整 RenderGraph、VFR ProxyMap、人工 Electron 窗口和真实手机素材仍未验收。
- Date：2026-07-30

## WO-R07 持久化 Worker Job Engine

- Scenario：验证 `jobs`/`job_attempts` schema、输入 hash、project-scoped idempotency、temporary-only retry、非法输入阻断、Worker crash、Host recovery、非幂等阻断、取消和 Project Host 媒体接线。
- User Intent：Worker 任务不能只存在内存；Host 重启后必须有可观察的恢复或阻断结果，重复请求不能重复产生成功输出。
- Preconditions：R06 Worker media boundary 完成；Node 22 SQLite、Python Worker 和 VFR fixture 可用。
- Environment：Windows，本地仓库，2026-07-30。
- Representative Data：临时 Project SQLite、成功/重试/非法/崩溃/取消 Job、`p0-vfr.mp4` 以及 Project Host Render/QC 四个媒体 Job。
- Exact Steps or Command：`npm run job-persistence:test`；`npm run worker:client:test`；`npm run project-host:job:test`；`npm run check`。
- Expected Observable Result：migration 0015 建立 `jobs`/`job_attempts`；成功重复提交只执行一次；`RESOURCE_EXHAUSTED` 可重试而 `INVALID_INPUT` BLOCKED；Worker child exit 被识别；RUNNING 重开后 RECOVERING，幂等任务可继续，非幂等任务 BLOCKED；取消完成为 CANCELLED。
- Actual Observable Result：上述三项定向测试与完整 `npm run check` 均通过；架构扫描 150 个源码文件；Project Host 真实媒体链路产生 4 个 SUCCEEDED Job，每个 attempt=1 且 output refs 非空；持久化测试覆盖 attempt=2 恢复成功和非幂等阻断。
- Failure and Recovery Path：DB 事务失败回滚；Worker crash 写入 `WORKER_CRASH` 并按幂等性进入 RETRYABLE_FAILED 或 BLOCKED；取消/超时保留 attempt 终态；重复成功 Job 返回已登记 output refs，不再启动 Worker。
- Evidence：`database/migrations/0015_jobs.sql`、`packages/platform/project-storage/src/project-storage.mjs`、`packages/platform/job-engine/src/public.ts`、`packages/platform/worker-client/src/runtime.mjs`、`tests/integration/job-persistence.test.ts`、`tests/integration/worker-client.test.ts`、`tests/integration/project-host-job.test.ts`、ADR-0005。
- Remaining Risk：跨 Host 的后台队列、多 Worker 并发调度和 R08 原子 Edit IR 尚未实现；Electron 人工窗口、真实手机素材和完整 RenderGraph 仍未验收。
- Date：2026-07-30

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

### WO-R08 Atomic Edit IR / CommitPlan

- Scenario：提交三条命令（前两条合法、第三条重复 clip 非法），并验证 Assembly、Rough Cut 与单命令共用批量计划提交。
- Exact Steps or Command：`npm run typecheck`；`npm run architecture`；`npm run commit-plan:test`；`npm run assembly:timeline:test`；`npm run rough-cut:host:test`；`npm run undo-redo:test`；`npm run check`。
- Actual Observable Result：已成功通过；三条命令在内存模拟阶段失败，Timeline 保持 v0，`timeline_versions` 仅保留初始化版本，`timeline_commands` 和 `timeline.commit_plan.committed` 无失败批次记录；成功批次只产生一个逻辑版本，计划包含 commands、affected ranges、semantic refs、validation 和 SHA-256 plan hash。
- Remaining Risk：Timeline 仍是最小 Clip/Track 模型，复杂命令和完整锁策略由 WO-R09 扩展。
- Date：2026-07-30

### WO-R09 Timeline Core and Persistent Redo

- Scenario：验证 Sequence/Video/Audio Track、Gap、Transition、Caption、Effect、Keyframe、Audio Routing、Semantic Sidecar 模型；18 类命令 Apply/Inverse；250 条随机命令 Replay、版本单调和失败无变更；关闭重开后 Redo。
- Exact Steps or Command：`npm run timeline-core:test`；`npm run timeline-redo:test`；`npm run typecheck`；`npm run architecture`；`npm run storage:check:raw`；`npm run dev-cli:test`；`npm run check`。
- Actual Observable Result：已成功通过；架构扫描 154 个源码文件，31 个合同 roundtrip/generated-clean 通过，0016 migration 创建 `timeline_redo`，250 条随机命令和 18 类命令覆盖通过，Host 关闭重开后从 SQLite 恢复 Redo，新编辑会清除旧 Redo，完整检查通过。
- Remaining Risk：RenderGraph 编译、真实媒体效果、VFR ProxyMap、桌面 Timeline UI 和生产模型仍未完成，由 R10–R14 处理。
- Date：2026-07-30

### WO-R10 Timeline → RenderGraph → Render

- Scenario：用两个真实 FFmpeg 生成的彩色视频素材建立 Timeline，分别裁剪前半段并交换 Clip 顺序；Preview/Master 使用同一 Graph 语义，Master 强制显式原片引用。
- Exact Steps or Command：`npm run worker:render-graph:test`；`npm run timeline-render:test`；`npm run typecheck`；`npm run architecture`；`npm run check`。
- Actual Observable Result：已成功通过；Worker handshake 暴露 `render.timeline.v1`，filter graph 含 trim/concat，Master 缺少 original ref 返回 `MASTER_ORIGINAL_REQUIRED`；交换后的 Clip B 首帧先输出；QC passed；关闭重开后可读取 Timeline version、Graph hash、原片/proxy refs、profile、Worker/FFmpeg version 和 output hash；完整检查通过，架构扫描 158 个源码文件。
- Remaining Risk：VFR ProxyMap、Object Store、真实桌面操作、真实手机素材和生产模型仍待 R11 及之后。
- Date：2026-07-30

### WO-R11 VFR ProxyMap

- Scenario：对授权 VFR Fixture 生成真实 proxy，读取原片/proxy 的 stream time base、duration、packet/frame PTS、VFR 信息和音频 sample rate，构造分段双向 ProxyMap；Project Host 对不同路径自动请求 map 并将 Preview 源范围转换到 proxy PTS。
- Exact Steps or Command：`npm run proxy-time-map:test`；`npm run worker:media:test`；`npm run proxy-map:worker:test`；`npm run timeline-render:test`；`npm run typecheck`；`npm run architecture`；`npm run check`。
- Actual Observable Result：已完成目标实现并通过验证；Core 多段 VFR roundtrip、24000/1001、30000/1001、25/30/50/60000/1001 帧率族、Worker VFR fixture 随机 roundtrip、audio 48000 sample rate、自动 map 的真实 Preview/Master 渲染和全量 `npm run check` 均通过，架构扫描 162 个源码文件。
- Remaining Risk：长视频累计误差和真实手机素材尚未现场验证；映射采用帧轨迹分段，后续仍需 Object Store 与更完整音视频交付链。
- Date：2026-07-30

### WO-R12 Database and Object Store

- Scenario：建立蓝图要求的数据表和内容寻址 Object Store；Object 先临时写入、fsync、原子 rename，再在事务中登记引用；模拟 hash 错误、重复引用事务失败、孤儿 Object 和关闭重开。
- Exact Steps or Command：`npm run object-store:test`；`npm run typecheck`；`npm run architecture`；`npm run check`。
- Actual Observable Result：0018 migration、18 个要求数据表、Object Store/Object Ref、Timeline Snapshot/Story Plan/Assembly Cut/Review/Delivery/RenderResult 对象写入、旧数据回填、hash 校验、事务失败无 DB 悬空引用、孤儿 GC 和完整 `npm run check` 均通过；架构扫描 163 个源码文件。
- Remaining Risk：旧兼容列仍保留用于当前读取回退；下一工作单实现 Desired/Current State 和 Reconciler。
- Date：2026-07-30

### WO-R13 Desired State / Current State / Reconciler

- Scenario：分别提交目标时长、Sponsor CTA、字幕拼写变化，比较 DesiredState/CurrentState，生成 InvalidationPlan 与带 hash 的 ActionPlan。
- Exact Steps or Command：`npm run reconciler:test`；`npm run typecheck`；`npm run architecture`；`npm run check`。
- Actual Observable Result：已成功通过；三类确定性 stale 链与附件一致，重复 reconcile 的 Invalidation/Action hash 相同，旧 approval 在语义版本变化时列入 reset，旧 Timeline 明确处于 stale 链而不被继续当作 current；完整 `npm run check` 通过，架构扫描 164 个源码文件。
- Remaining Risk：Reconciler 目前只生成计划，后续 Model Gateway、Feature 执行器和真实桌面状态展示仍待后续工作单。
- Date：2026-07-30

### WO-R14 Model Gateway

- Scenario：通过统一 Provider Interface 执行 mock Qwen/DeepSeek compatible provider，验证 Structured Output、非法 JSON、Retry、Budget、Privacy、cache、Prompt Registry/Version 和调用审计。
- Exact Steps or Command：`npm run model-gateway:test`；`npm run typecheck`；`npm run architecture`；`npm run check`。
- Actual Observable Result：已成功通过；每次成功调用包含 provider/model/snapshot/prompt/input hash/output hash/token usage/latency/retry/cache/privacy/project/artifact 元数据；非法 JSON 返回 `MODEL_OUTPUT_INVALID` 并不写业务状态；Qwen/DeepSeek adapter 只通过注入 fetch；完整 `npm run check` 通过，架构扫描 165 个源码文件。
- Remaining Risk：未配置或调用生产供应商密钥，真实付费模型现场验证和 Feature 业务接线留给后续工作单。
- Date：2026-07-30

### WO-R15 Feature packages and business migration slice

- Scenario：建立 13 个 Feature 包，每个包提供统一分层目录和 `src/public.ts`，并检查 Feature 间没有内部互调。
- Exact Steps or Command：`npm run feature-boundary:test`；`npm run feature-behavior:test`；`npm run typecheck`；`npm run architecture`；`npm run check`。
- Actual Observable Result：已成功通过；13 个包均存在七层目录和公开入口，`editorial-core/src/public.ts` 不再导出集中式业务函数，Project Host 和属性测试改用 Feature 公开入口，行为测试覆盖证据、故事、Assembly、反馈、Rough Cut、隐私、Delivery 和 Export，架构扫描 179 个源码文件。
- Remaining Risk：`fine-cut`、`sponsor`、`media-ingestion` 等没有历史等价实现的 Feature 尚未接入新的端到端用户流程；R16 仍在进行中。
- Date：2026-07-30

### WO-R16 Desktop workbench first vertical slice

- Scenario：通过安全 `app://renderer` 页面加载 Renderer 工作台，使用 Preload Project API 发起项目生命周期、真实素材导入、持久 Job/素材查询、Timeline Add/Move/Trim/Undo/Redo，并关闭重开恢复；检查 Renderer 不直接访问 Node、SQLite、Worker 或模型。
- Exact Steps or Command：`npm run renderer:workbench:test`；`npm run workbench:host:test`；`npm run typecheck`；`npm run architecture`；`npm run desktop:boundary`；`npm run project-api:boundary`；`npm run ipc:boundary`；`npm run check`。
- Actual Observable Result：已成功通过；Worker `media.fingerprint.v1`/`media.probe.v1` 结果登记到 `asset_locations`，两个持久 Job 为 `SUCCEEDED`，Timeline 真实执行 Add→Move→Trim，关闭重开后素材、Job、Timeline version 3 和片段状态一致；Story/Preview/QC/Compare/Delivery/Export 命令、Host Preview 字节读取、Timeline 版本 Diff 与只读记录查询已接入，架构扫描 193 个源码文件。
- Remaining Risk：R16 最小工作台切片已完成；生产 Provider 需要通过 `AVE_MODEL_PROVIDER`/对应 API Key 配置，Patch Diff 当前展示 Host 计算的相邻 Timeline 版本变化；R17–R20 仍未完成。
- Date：2026-07-30

### WO-R16 Desktop workbench model candidate and Electron runtime closure

- Scenario：通过注入的 Model Gateway Provider 生成结构化 StoryProposal 候选，持久化模型输入/输出对象、审计元数据和 `model_runs`，关闭重开后重新查询；再在真实 Electron 进程中加载 `app://renderer/index.html`。
- Exact Steps or Command：`npm run model-candidate:host:test`；`npm run electron:runtime:test`；`npm run typecheck`；`npm run architecture`；`npm run check`。
- Actual Observable Result：Model candidate Host 测试通过，候选经过 `validateStoryProposal` 后写入 Object Store 与 `model_runs`，重开后仍有 1 条运行记录；Electron runtime smoke 输出 `title=AVE 工作台`、`projectApi=true`、`workbench=true`；完整 `npm run check` 退出码 0，架构扫描 195 个源码文件。
- Remaining Risk：真实 Qwen/DeepSeek 网络调用需由用户环境提供 API Key；本次测试使用注入 Provider 验证边界与持久化，不宣称生产模型质量或真实手机素材验收。
- Date：2026-07-31

### WO-R17 Adapter first roundtrip slice

- Scenario：以内部 Timeline 作为权威，分别通过 web preview、OTIO、FCPXML、EDL 和 desktop filesystem Adapter 序列化/导入，验证 Clip 范围、轨道和 PTS 不漂移；对效果、关键帧、字幕、音频等交换格式不支持项返回显式 Issue，并保留 Semantic Sidecar。
- Exact Steps or Command：`npm run adapter:boundary:test`；`npm run adapter:roundtrip:test`；`npm run typecheck`；`npm run architecture`；`npm run check`。
- Actual Observable Result：五个 Adapter public 入口边界检查通过；OTIO/FCPXML/EDL 与本地 AVE Timeline Roundtrip 通过，web preview 文档校验通过；完整 `npm run check` 退出码 0，架构扫描 202 个源码文件。
- Remaining Risk：真实剪辑软件人工导入仍未执行；R17 的仓库内 Adapter、统一 Validator、Host/CLI 导出与自动 Roundtrip 验收已完成，不宣称外部软件人工互操作。
- Date：2026-07-31

### WO-R18 Master QC diagnostic slice

- Scenario：通过 Worker 对正常 VFR、合成黑屏/静音、错误分辨率、结构化字幕边界 finding、代理来源执行 QC；验证 Probe/FFmpeg 检测、稳定 Issue code、blocker/evidence 和来源身份判定。
- Exact Steps or Command：`python apps/worker-host/tests/qc_master_protocol_smoke.py`；`npm run contracts:check`；`npm run contracts:clean`；`npm run timeline-render:test`；`npm run check`。
- Actual Observable Result：QC smoke 通过；正常媒体报告 passed，错误 Profile、字幕 finding、代理来源分别产生结构化 blocker，合成黑屏/静音产生对应检测 Issue；Timeline Render 回归通过；完整 `npm run check` 退出码 0，架构扫描 203 个源码文件。
- Remaining Risk：响度阈值、字幕/效果/Sponsor/Privacy 的完整 Host 登记/UI 展示及全部人工构造边界仍未完成；未宣称 R18 完成。
- Date：2026-07-31

### WO-R18 Master QC closure

- Scenario：通过 Host 的 `render(originalPath, qcRequirements)` 将交付要求传入 Worker，使用真实 FFmpeg 音视频分析并从 `project.qc.issues` 查询到 Renderer 展示。
- Exact Steps or Command：`npm run worker:qc:test`；`npm run typecheck`；`npm run architecture`。
- Expected Observable Result：人工构造黑屏、冻结、静音、削波、响度偏差、AV sync、字幕越界、缺失效果、Sponsor、Privacy、代理来源以及导出 Profile 均生成稳定 code、blocker 和 evidence；Host/UI 可观察阻断。
- Actual Observable Result：上述命令均退出码 0；`master QC diagnostic smoke passed`；架构扫描 203 个源码文件。响度由 `ebur128` 产生 `integrated_lufs` 证据，语义要求由 `qc_requirements` 结构化输入产生对应 Issue，Renderer 展示“阻断/提示”和 evidence。
- Remaining Risk：R18 证据为授权合成媒体和本地 Worker 回归，不等同于真实手机素材或外部剪辑软件人工验收；R19 CI、R20 真实验收仍未完成。
- Date：2026-07-31

### WO-R19 CI workflow slice

- Scenario：将本地门禁拆分为八个 GitHub Workflow，并将根包管理器统一到锁定的 pnpm 版本。
- Exact Steps or Command：`pnpm install --frozen-lockfile`；`pnpm run ci:workflow:test`；`pnpm run contracts:clean`；`pnpm run architecture`；`pnpm run worker:qc:test`；`pnpm run typecheck`；`pnpm run check`。
- Expected Observable Result：八个 Workflow 可静态识别，使用 frozen pnpm install；架构违规、协议漂移和 Worker 失败能阻断对应 Job。
- Actual Observable Result：定向命令退出码 0，静态检查报告 `CI workflow contract passed (8 workflows)`，Workflow YAML 可解析；Ruff 0.6.9 与 mypy 1.17.1 均通过；通过 Electron 镜像恢复二进制后，完整 `pnpm run check` 退出码 0，架构扫描 204 个源码文件。
- Remaining Risk：GitHub 远端 Check 尚未现场运行；R20 真实手机素材和外部剪辑软件互操作仍未验收。
- Date：2026-07-31

### WO-R20 final acceptance preflight slice

- Scenario：运行最终验收 Runner 的授权合成闭环，并检查真实手机素材/字幕输入缺失时是否明确阻断。
- Exact Steps or Command：`pnpm run acceptance:final:synthetic`；`pnpm run worker:crash-recovery:test`；`pnpm run acceptance:final`。
- Expected Observable Result：合成闭环通过；无真实素材时默认 Runner 退出码为 2，并输出 `BLOCKED`，不得降级为通过。
- Actual Observable Result：`acceptance:final:synthetic` 退出码 0；`worker:crash-recovery:test` 真实子 Worker 退出后记录 `WORKER_CRASH/RETRYABLE_FAILED`，关闭重开后 `RECOVERING` Job 成功恢复为 `SUCCEEDED`；默认命令在未设置 `AVE_REAL_MEDIA_PATHS` 时退出码 2，输出 `BLOCKED: AVE_REAL_MEDIA_PATHS must contain at least two real media files`。`timeline:audio-caption:test` 退出码 0；Worker 输出的 filter graph 包含显式字体文件、`drawtext` caption 和独立 audio input filter，随后 Master QC 通过；使用两段临时授权合成、不同帧率且带音频的媒体运行 `acceptance:real`，实际完成 Project Host 导入、Timeline Add/Trim/Move/Undo/Redo/Caption Commit、Worker Proxy/ProxyMap、Preview 代理映射、Master 原片、QC、OTIO/FCPXML/EDL Roundtrip 和关闭重开；最新全量 `pnpm run check` 退出码 0，架构扫描 208 个源码文件。
- Evidence Boundary：上述 `acceptance:real` 结果仅证明提供路径时的真实执行链，临时媒体和 README 文本仅作为本机合成夹具；没有宣称真实手机原片验收。
- Remaining Risk：真实手机 VFR、不同帧率、带音频/字幕的用户素材尚未提供；真实外部剪辑软件互操作、GitHub 远端 Check 和真实 Worker 崩溃现场仍未完成。
- Date：2026-07-31
