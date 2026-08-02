<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# 当前状态

## 当前阶段

P0 架构验证原型；P1–P4 协议与校验骨架。真实 Timeline → RenderGraph → Render 已完成并通过双素材验收；R16 Desktop、R17 Adapter、R18 Master QC、R19 CI 已完成，当前执行 R20 最终真实验收。

## 已验证

- `pnpm install --frozen-lockfile` 已执行并通过；旧 `package-lock.json` 已移除。
- 历史记录中的 P0 CLI/Host 骨架、部分协议和存储检查曾通过；这些证据不等同于完整产品验收。
- WO-R01 基线清理已完成：错误命名 UX 文件与两个机器生成 JSON 已移除，历史计划/进度已归档，生成物忽略规则已更新。
- WO-R02 已实现全仓架构扫描、边界规则和违规回归夹具；Core 文件指纹已迁移至 Platform。
- `npm run check` 于 2026-07-30 实际通过。
- WO-R06 Worker 媒体/Render/QC 已验证：Registry、Python FFmpeg/FFprobe adapters、真实媒体 Job、取消协议、stderr 隔离、候选结果和 Node/Project Host 边界均通过。
- WO-R07 Worker Client/Job Engine 已验证：`jobs`/`job_attempts` migration、输入 hash、project-scoped idempotency、temporary-only retry、Worker crash、Host recovery、non-idempotent block、cancel 和 Project Host 媒体接线均通过。
- WO-R08 原子 CommitPlan 已验证：多命令先内存模拟、最终 Timeline 单版本、计划哈希、Project Host 单事务提交和失败无版本/Command/Event 部分写入。
- WO-R09 Timeline Core 已验证：扩展模型、18 类命令、验证器、250 条随机命令 Apply/Inverse/Replay/失败无变更、0016 Redo migration 和关闭重开后 Redo 均通过。
- WO-R10 真实 RenderGraph/Render 已验证：统一 Graph builder、Capability Matrix、Worker `render.timeline.v1` filter graph、Master 原片门控、双素材裁剪换序首帧验收、RenderResult 元数据持久化和完整 `npm run check` 均通过。
- WO-R11 VFR ProxyMap 已验证：ffprobe 时间轨迹、packet/frame PTS、VFR、音频 sample rate、Core 双向分段映射、真实 VFR 随机 roundtrip、自动 map 的 Preview/Master 渲染和完整 `npm run check` 均通过；架构扫描 162 个源码文件。
- WO-R15 Feature 包拆分已验证：13 个 Feature 公开入口和统一分层存在，既有 editorial-core 业务逻辑已迁移，Feature 边界/行为回归和完整 `npm run check` 通过。
- WO-R16 当前切片已验证：Renderer 工作台目录、Project API client、项目生命周期、Worker 指纹/Probe 素材导入、持久 Job/素材查询、Timeline Add/Move/Trim、Undo/Redo、Story/Preview/QC/Compare/Delivery/Export 最小面板、Host Preview 字节读取、Timeline 版本 Diff、Model Gateway StoryProposal 候选持久化、真实 Electron 页面加载和关闭重开恢复均已接通；2026-07-31 完整 `npm run check` 通过，架构扫描 195 个源码文件。
- WO-R17 已验证：web preview、OTIO、FCPXML、EDL、desktop filesystem 五个 Adapter public 入口、统一 Roundtrip Validator、Project Host/Dev CLI 导出入口均已接通；交换格式保留 Semantic Sidecar，并对不支持语义返回显式 Issue；Clip/轨道/PTS Roundtrip 与完整 `npm run check` 通过，架构扫描 202 个源码文件。
- WO-R18 已收口：Host 将结构化字幕边界、缺失效果、Sponsor、Privacy 和响度要求传给 Worker；Worker 以 `ebur128` 实际测量 integrated LUFS，并对所有要求返回稳定 code、blocker、evidence；Renderer 展示阻断与证据。合成黑屏、冻结、静音、削波、响度、AV sync、代理 Master 及导出 Profile 回归均通过。
- WO-R19 已收口：八个 GitHub Workflow、pnpm 11.9.0 lockfile、Workflow 静态覆盖、Ruff/mypy 和完整 `pnpm run check` 均通过；本机 Electron runtime 已恢复并通过，架构扫描 204 个源码文件。
- WO-R20 当前切片已验证：最终验收 Runner 的合成闭环通过；提供路径时已实际执行 Project Host 导入、Timeline Add/Trim/Move/Undo/Redo/Caption Commit、Worker Proxy/ProxyMap、Preview 代理映射、Master 原片、独立 audio track、caption `drawtext`、Master QC、Adapter Roundtrip 和关闭重开；真实子 Worker 崩溃与持久 Job 恢复回归通过；缺少 `AVE_REAL_MEDIA_PATHS` 时默认退出码 2 并输出明确 `BLOCKED`，不把临时合成素材冒充真实手机验收。

## 未验证

- R02 架构检查已验证：扫描 90 个源码文件，五类违规回归通过，完整 `npm run check` 通过。
- R03 Contract Toolchain 已验证：31 个 Schema、31 个 valid/invalid Fixture、62 个生成类型文件、manifest/hash、跨语言 roundtrip 和 generated-clean 均通过。
- R04 Project Host 已验证：Host 实现迁入 Platform，Desktop 旧 Host 删除，Desktop/CLI/Node 集成测试共用 public 入口，边界和完整回归通过。
- R05 Electron Main/IPC 已验证：`app://renderer` 协议、sender/session 校验、分组 Handler、事件订阅和文件选择 Preload API 均有边界测试。
- R16、R17、R18、R19 已完成；R20 尚未完成。真实剪辑软件人工互操作、生产 Provider、真实手机素材和正式发布平台仍未验收。
- 严格三进程边界、真实桌面流程、真实手机素材、生产模型/发布平台。

## 当前工作单

WO-R20：最终真实验收。

R19 已完成；当前验证真实/授权素材闭环、关闭重开和 Worker 崩溃恢复。

## 阻塞项

R20 尚未完成：真实手机 VFR 素材尚未提供/验收，真实外部剪辑软件和 GitHub 远端 Check 也未现场验证；合成素材闭环可继续执行，但不能替代这些证据。

## 下一工作单

WO-R20：最终真实验收，覆盖真实/授权素材闭环、关闭重开和 Worker 崩溃恢复。
