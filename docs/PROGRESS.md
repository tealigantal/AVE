# Progress

## Active Goal

完成 P0 CLI 垂直切片和 P1-P4 核心协议校验骨架；当前完成 WO-049 Delivery/Privacy/Rights 门控，正在推进 WO-050 Export Registration/Capability。

## Active ExecPlan

`docs/plans/2026-07-30-wo-036-timeline-command-api.md`

## Current Milestone

WO-031 的迁移、兼容性、生成物清洁和全仓检查已通过；Electron runtime、真实手机原片和真实分析 Worker 仍待后续工作单。

## Completed and Verified

- `npm install` 成功，审计无漏洞。
- `npm run check` 成功：TypeScript 类型检查和架构检查通过。
- Worker handshake 返回结构化 `ready`。
- 已补充 `.gitignore`、架构测试目录和 Contract Toolchain 目录边界。
- 4 个 Schema 校验通过，TS/Python 生成和 manifest 已执行。
- WO-003 storage smoke 通过；WO-004 TypeScript 类型检查通过。
- WO-005 Asset Schema 和 WO-008/009 Timeline 核心类型检查通过。
- Worker Protocol smoke 已增加，待执行。
- FFmpeg/ffprobe 合成媒体 Fixture 与 probe 已加入，待执行。
- WO-010 版本、锁和 Undo 核心已加入，待更完整测试运行器。
- WO-011 Edit IR Schema、核心编译管线和类型级 property fixture 已加入。
- `npm run edit-ir:test` 实际通过 Resolve→Compile→Simulate→Validate。
- `npm run render-graph:test` 实际通过 Preview/Master capability 与非法图阻断测试；合同 Schema 共 7 个。
- `npm run media:render` 和 `npm run render:path:test` 实际通过 Preview/Master 原片回链。
- `npm run media:qc`、`npm run qc:test` 实际通过结构化 Master QC。
- `npm run p0:acceptance` 实际通过项目、媒体、Timeline、Preview、Master、QC、关闭重开组合流程。
- P0 Timeline snapshot/command 已在 SQLite 事务中写入，重开后读取通过。
- VFR Probe 已严格验证 `avg=345/16`、`r=30/1`；QC 已加入 LUFS 阈值检测。
- 项目锁记录 PID，并已验证异常遗留锁的恢复打开路径。
- P0 已实际执行 TrimSource，并生成 proxy.mp4、preview.mp4、master.mp4 和 proxy-map.json。
- Electron Main/Preload/Renderer 安全边界静态检查已通过；Electron runtime 下载因网络 `ECONNRESET` 未完成安装验证。
- `npm run check` 已恢复通过，包含 TypeScript、架构、合同、存储和桌面边界检查。
- Project API 已建立 Query/Command/Subscribe 窄类型，并通过边界检查。
- P1 WO-017 已建立 Observation、Interpretation、CreativeContract Schema 和 editorial-core 事实/解释约束。
- `npm run editorial:test` 实际通过；合同 Schema 共 11 个，`npm run check` 全部通过。
- WO-018 已加入 Moment、Event、MaterialSufficiency Schema 和不足阻断逻辑，待执行独立测试。
- `npm run evidence:test` 实际通过；合同 Schema 共 14 个，素材不足时批准和故事生成均被阻断。
- WO-019 已加入 CoverageMatrix 和硬约束证据覆盖阻断，待执行独立测试。
- `npm run coverage:test` 实际通过；合同 Schema 共 15 个，硬约束缺失覆盖会阻断。
- WO-020 已加入 ASR/OCR/Scene 输入 Schema 与 Observation 适配器，待执行独立测试。
- `npm run analysis:test` 实际通过；合同 Schema 共 18 个，空分析和非法时间范围被阻断。
- WO-021 已加入 StoryProposal/ApprovedStoryPlan 和审批门，待执行独立测试。
- `npm run story:test` 实际通过；合同 Schema 共 20 个，未覆盖硬约束的故事候选被阻断。
- WO-022 已加入 AssemblyCut Schema、Beat/证据映射和 validated 门，待执行独立测试。
- `npm run assembly:test` 实际通过；合同 Schema 共 21 个，未匹配批准计划或未知证据的 Assembly Cut 被阻断。
- WO-023 已加入 validated Assembly Cut → Edit IR 候选编译器，待执行独立测试。
- `npm run assembly-compiler:test` 实际通过；未 validated 的 Assembly Cut 无法编译。
- WO-024 已加入 FeedbackDiagnosis/ReviewIssue 协议与不直接修改 Timeline 的诊断边界，待执行独立测试。
- `npm run feedback:test` 实际通过；合同 Schema 共 23 个，空反馈/未知 Issue 被阻断。
- WO-025 已加入 CompareResult、ReactionTiming 协议与 PTS 校验，待执行独立测试。
- `npm run compare:test` 实际通过；合同 Schema 共 25 个，版本相同/时间负值/比较关系错误被阻断。
- WO-026 已加入 RoughCutPatch、J/L Cut 音频边界和 base_version 冲突校验，待执行独立测试。
- `npm run rough-cut:test` 实际通过；合同 Schema 共 26 个，版本冲突、未知 Clip、非法范围和缺少音频偏移被阻断。
- WO-027 已加入 DeliveryManifest、PrivacyLedger 和交付 Gate，待执行独立测试。
- `npm run delivery:test` 实际通过；合同 Schema 共 28 个，QC/隐私/版权/原片回链 Gate 失败会阻断交付。
- WO-028 已加入 RightsLedger、ExportRegistration 和交付文件哈希校验，待执行独立测试。
- `npm run export:test` 实际通过；合同 Schema 共 30 个，未批准版权、错误 QC 关系或非法哈希被阻断。
- WO-029 已加入 render_outputs 迁移、导出哈希事务登记和重开读取测试，待执行独立测试。
- `npm run export:persistence:test` 实际通过；导出哈希、Delivery/QC 关系和关闭重开读取均通过。
- WO-030 已加入 Export Capability Matrix 和格式/尺寸/帧率/采样率阻断，待执行独立测试。
- `npm run export-capability:test` 实际通过；合同 Schema 共 31 个，不支持的导出参数被阻断。
- WO-031 已补充 invalid examples、唯一 Schema ID/主版本兼容检查、v0 RationalTime 迁移 fixture，以及生成代码双语言形状校验；`npm run check` 输出 31 个 invalid/compatibility/roundtrip 校验通过。
- 已加入 social_1080p、archive_4k、vertical_short 三个导出能力预设，并通过统一校验。

## Implemented but Not Verified

跨语言 roundtrip 当前验证生成文件的双语言数量、GENERATED 标记和 Python compileall；尚未执行带字段值的 Python TypedDict 运行时实例化。

## In Progress

P0 使用授权合成 VFR Fixture，尚未使用用户手机原片；Electron runtime 尚未现场启动验证；P1 真实模型输出尚未接入，但显式 ASR/OCR/Scene 证据 Worker 边界和 Project Host Evidence 持久化已通过协议/重开 smoke。

## Next Work

接入真实分析工具输出；随后进行桌面宿主 runtime 和 UX 工作单验收。

## Blockers

真实媒体 Fixture、Electron、SQLite、FFmpeg 和 Python 依赖尚未进入本工作单；它们不是 WO-002 的阻塞项。

## Recent Decisions

首批只创建蓝图第 29 节要求的真实基座，不生成空业务包。

## Resume Instructions

先运行 `npm run check`，再按 WO-051 审计 Electron runtime、真实模型 Worker、平台发布和完整桌面 UX；已完成的 Host 基础链路不得回退。

## WO-051 Final Audit Checkpoint（2026-07-30）

- `npm run check` 实际通过：类型检查、架构边界、31 个 Contract、SQLite/Object Store、Worker 协议、Evidence/Story/Assembly/Rough Cut/Review/Reaction/Delivery/Export、Project Host、Timeline Undo/Redo 和 Render/QC 持久化均通过；体验规范专属 Workbench 检查已移除。
- 当前机器不存在 `node_modules/electron`，命令行也未发现 Electron；Electron 主进程、窗口加载、原生目录/文件选择器和真实 IPC 仍不能宣称已现场验证。此前安装尝试因网络 `ECONNRESET`/`ETIMEDOUT` 失败，未改写依赖为伪实现。
- 当前 Worker 已有 ASR/OCR/Scene 的显式结构化结果边界和 Project Host Evidence 持久化，但没有真实 ASR/OCR/Scene/LLM 提供方与调度接入；平台发布和完整桌面剪辑/Review/Delivery UX 仍是后续工作。

## WO-052 Platform Foundation Checkpoint（2026-07-30）

- 已补齐蓝图要求的最小 `job-engine` 状态机、`worker-client` 结构化 stdin/stdout 客户端边界、`observability` 脱敏前的 payload hash 审计事件，以及 fail-closed `model-gateway` 请求/结果元数据边界。
- 已增加 `apps/dev-cli` 的无 UI `create-project`、`inspect-project`、`verify-project` 入口和平台基础集成测试；敏感模型输入在没有批准 provider policy 时明确阻断。
- `npm run typecheck`、`npm run architecture`、`npm run platform:foundation:test` 已通过；平台基础测试已纳入 `npm run check`。
- Project Storage 已补强打开失败清理和崩溃遗留锁回收；`npm run project-recovery:test` 实际通过，覆盖非法 PID 与已退出 PID 两种重开路径，并已纳入 `npm run check`。
- Observability 脱敏和 Worker Client `request_id` 响应关联已通过真实 Node 子进程回环测试。
- Job Engine 已通过真实 Python Worker 子进程调度测试，覆盖 progress 消息过滤、terminal result 和成功状态提交。
- `dev-cli:test` 已通过授权 VFR Fixture 的项目创建、媒体导入、SHA-256 Asset ID、Object Store 写入和项目重开检查。
- CLI 流程已扩展并通过同一 Fixture 的 Timeline 初始化、Preview/Master 渲染、Master QC 和 Project Host 状态持久化检查。
- CLI `apply-command` 已通过 Add Clip 提交和过期 `base_version` 冲突阻断测试。
- CLI 已补齐 `render-master`、`run-qc` 和真实 SQLite integrity `verify-project`，并通过 VFR Fixture 集成测试。
- CLI `migrate-project` 已通过实际项目迁移集合验证，报告 schema version 14 和 SQLite integrity `ok`。
- CLI `analyze` 已通过真实 Python Worker → Project Host → Evidence 持久化/重开读取链路测试。
- CLI 已通过候选 StoryProposal → Evidence 门控 → ApprovedStoryPlan 持久化测试。
- CLI 已通过 validated Assembly Cut → Edit IR → Timeline Commit 测试，覆盖版本递进到 v2。
- CLI Rough Cut Patch 已通过成功应用到 v3 及过期 base version 阻断测试。
- CLI Review Diagnosis、Compare 和 Reaction Timing 已通过持久化及 Compare 关系门控测试。
- CLI Delivery/Privacy/Rights、Export Capability 和真实 Export Registration 已通过 Master 文件 SHA-256 登记测试。
- `dev-cli:test` 已纳入 `npm run check`；最新全量检查覆盖 CLI 纵向链路并通过。
- 体验规范专属 Workbench 页面、样式、交互脚本和静态校验已物理移除；Electron Main、Preload、Project Host 和 Project API 仍保留为工程边界。
- Electron binary 已通过公开镜像下载成功；修复桌面构建中 `.mjs` 运行时资产复制和 ESM `__dirname` 问题后，`npm run desktop:build` + `npx electron .runtime-dist/apps/desktop/src/main.js` 已现场启动且无主进程加载异常。窗口/人工 IPC 操作仍需后续自动化 smoke。
- 原体验规范专属 Electron Renderer runtime 构建与 smoke 文件已物理移除，不再作为当前验收证据。
- 已将 Electron `^43.2.0` 写入 devDependencies；`npm install` 成功，但 `npx electron --version` 的 binary 下载因 `fetch failed` 失败，`node_modules/electron/dist/electron.exe` 不存在，未伪造 runtime 验收结果。
