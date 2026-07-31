# Architecture

## System Context

当前仓库已实现 P0 CLI 垂直切片及 P1-P4 的协议/核心校验骨架；目标运行形态是 Electron Renderer、Project Host 和 Python Worker Host 三个边界。

## Current Runtime Entry Points

当前已存在 `packages/platform/project-host/src/public.ts`、分组 Electron Main/IPC、`app://renderer` 安全协议、Preload 事件/选择器 API、Node Worker Client 和 `apps/worker-host/src/worker_host/main.py` 的 JSON stdin/stdout 握手入口；真实媒体 Worker smoke 已通过，完整人工桌面操作仍待后续工作单。

## Major Components

- `contracts/schemas/`：跨语言协议源。
- `packages/core/timebase`：纯 RationalTime/TimeRange。
- `packages/core/project-kernel`：项目 ID/版本领域类型。
- `packages/core/media-identity`：稳定 Asset ID、Fingerprint 类型和 PTS Source Range；文件读取/哈希位于 `packages/platform/media-filesystem`。
- `packages/core/timeline-core`：Sequence、Video/Audio Track、Clip/Gap/Transition/Caption/Effect/Keyframe/Audio Routing/Semantic Sidecar、18 类纯命令 Apply/Inverse、确定性验证和 CommitPlan 模拟。
- `packages/platform/*`：基础设施边界声明。
- `packages/platform/project-host`：项目会话、Timeline、Evidence、Story、Assembly、Review、Delivery、Export 和 Render/QC 调度的应用层权威；对外只暴露 `src/public.ts`。`renderTimeline` 从 Timeline 构建 Preview/Master 同语义 Graph，并登记 RenderResult。
- `apps/worker-host`：不接触 SQLite 的 Worker 协议入口；通过显式 Registry 执行 Probe、Fingerprint、Proxy、Preview、Master、QC 和分析 Handler，媒体子进程只在此边界启动。
- `packages/platform/worker-client`：唯一的 Node Worker 进程启动和 JSON-lines correlation 入口，隔离 stderr 并提供 handshake、progress、result、cancel、timeout。
- `packages/platform/job-engine`：Job 状态、输入 hash、错误分类、幂等和执行控制；Project Host 通过 Store Port 将状态写入 SQLite。

## Request, Control, and Data Flows

当前 Dev CLI/Electron Main → `packages/platform/project-host` → Project Storage；媒体路径为 Project Host → 持久化 Job Engine/Project Storage → Worker Client → Worker Host → 候选文件/QC 报告 → Project Host 登记。Model Gateway 候选路径为 Renderer → Preload/IPC → Project Host → Model Gateway Provider → Contract 校验 → Object Store/`model_runs`，模型输出不能直接提交 Timeline。

## Data Ownership and Persistence

Project Host 拥有项目状态和事务边界，通过 Project Storage public adapter 作为唯一 SQLite 写入路径；SQLite migrations、WAL、锁、Object Store 原子写入、Timeline snapshot、Evidence、导出登记以及 `jobs`/`job_attempts` 已通过集成检查。Worker 只处理协议输入输出和临时媒体产物。

## External Integrations

FFmpeg/FFprobe 只由 Worker Host adapters 用于 VFR fixture、probe、proxy/preview/master 和 QC；ASR/OCR/Scene 已有真实 Worker→Evidence 接线，LLM 生产提供方和平台发布仍未接入，Electron 人工窗口验收仍未完成。

## Dependency Directions

`apps → platform → core → contracts/generated`；Project Host、Storage、Render、Media Filesystem 只能通过 public 入口互用。Worker 只依赖生成协议。Core 不依赖平台、应用或基础设施；全仓架构扫描和违规回归已接入 `npm run check`。

## Security and Trust Boundaries

Renderer 不应获得 Node/原片/数据库权限；Worker 不应获得 SQLite 写权限。Electron sender 必须匹配 `app://renderer`、WebContents 窗口身份和当前 Project Session。

## Current Architectural Constraints

单一权威、单一时间基准、Schema 版本化、Command 修改和不可变提交是蓝图中的强约束。R08 的 CommitPlan 让所有批量编辑先模拟，再以一个逻辑版本和单个 SQLite 事务提交。

## Known Legacy or Transitional Paths

旧的 `apps/desktop/src/project-host.ts` 已删除；旧巨型 Main 已拆分为 bootstrap、composition root、lifecycle、window manager、protocol handler 和分组 IPC Handler。R06 前的 Node Render Service 直启媒体子进程路径已移除；R07 已将媒体调用接入持久化 Job，R09 已将 Timeline Core 扩展和 Redo 持久化接入 Host，R10 已完成 Timeline→RenderGraph→Worker filter graph→Master/QC 与 RenderResult 持久化；R11 已加入 Worker ffprobe 时间轨迹和双向 VFR ProxyMap；R12 已建立内容寻址 Object Store、对象引用事务和蓝图数据表；R13 已建立确定性 Desired/Current State Reconciler；R14 已建立可替换 Model Gateway 和调用策略审计；R15 已将既有 editorial-core 业务逻辑迁移到 Feature 公开入口，Feature 间不互调；R16 已接入最小工作台、真实 Electron runtime smoke 和 Model Gateway 候选持久化；R17 已接入五类 Adapter 与 Roundtrip Validator；R18 已接入 Worker Master QC 检测矩阵、结构化阻断和 Renderer Issue 展示；R19 已接入分层 CI 与 pnpm 门禁，R20 已接入有路径时的真实 Project Host 最终验收 Runner。

## Target Direction

剩余工作聚焦 R20 真实手机素材、外部剪辑软件和远端 CI 验收；严格三进程边界、Worker 媒体执行、可恢复 Job、原子 Edit IR、RenderGraph、VFR ProxyMap、Object Store、Model Gateway、Feature 包、Workbench、Adapter 与 Master QC 已有本地验证证据，但不等同于真实手机素材或外部剪辑软件验收。

## Architecture Diagrams or Textual Maps

```text
Desktop/CLI -> packages/platform/project-host -> Project Storage / Worker Host
                    |-> SQLite (唯一写入者)
Contracts <- Core <- Platform <- Apps
```
