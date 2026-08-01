# 状态内容基线：6ce8999b09fac09095498af299af4aca3a46b3af（`feat: complete AVE blueprint foundation`）

本文件记录的是以上基线所核对的项目状态。实时 Git HEAD 必须以 `git rev-parse HEAD` 查询；不得把它写入本文件并称为“实际 HEAD”，因为提交本文件会立即生成新的 HEAD。

# 当前状态

## 统一结论

仓库是可以继续建设的架构原型，不需要推倒重来；截至 2026-08-01，用户已报告真实 Timeline → RenderGraph → Worker → Master 的 P0 垂直切片完成且烧录正常。

此前“尚未通过”仅适用于首次真实输入的黑帧结果；当前最终结果以用户现场报告、仓库外项目产物和本轮复跑的本地验收命令共同为依据。外部剪辑软件、生产模型和远端发布证据仍单独列为未验证。

## 已验证的能力

以下结论有当前代码、测试脚本或仓库验证记录支撑，但只表示对应能力或边界已验证：

- 当前根包管理器和锁文件使用 pnpm；`pnpm install --frozen-lockfile`、`pnpm run typecheck`、`pnpm run architecture` 和 `pnpm run check` 在验证记录中有通过结果。
- Contract Toolchain 能检查 Schema、valid/invalid examples、兼容性、生成物清洁和 TypeScript/Python roundtrip；生成目录由工具维护。
- 架构检查覆盖 Project Host 单写入、Worker 数据库隔离、Renderer 边界、Core 纯度、IPC、Adapter 和工作流静态规则。
- Project Host、Project Storage、Job Engine 和 Worker Client 的局部集成测试覆盖项目创建/打开、持久 Job、幂等、取消、Worker 崩溃分类和关闭重开恢复。
- Timeline Core 的 Command、Apply/Inverse、CommitPlan、Undo/Redo、版本冲突和关闭重开恢复有单元或集成测试。
- RenderGraph、Preview/Master 来源门控、Worker filter graph、ProxyMap、音频轨、Caption `drawtext` 和 Master QC 各有局部测试或协议 smoke。
- OTIO、FCPXML、EDL、Web Preview 和桌面文件系统 Adapter 有仓库内 roundtrip/Validator 测试。
- `pnpm run acceptance:final:synthetic` 和相关 crash-recovery/audio-caption 测试有记录；它们证明合成夹具和局部链路可执行，不证明真实手机素材 P0 已通过。
- 提供 `AVE_REAL_MEDIA_PATHS` 时，Runner 代码会要求至少两段媒体、检查音频/字幕等前置条件；缺少路径时会输出 `BLOCKED`，没有把缺失证据降级为通过。
- 2026-08-01 用户报告已使用新的真实测试项目完成真实素材测试，烧录正常；本机项目产物目录以环境变量 `AVE_USER_REAL_PROJECT_DIR` 表示，其中存在 `project.json` 和 `project.sqlite`。该目录不属于仓库，不复制、不上传、不提交。
- 2026-08-01 R22 复跑当前检出版本的 `pnpm run check` 通过；架构扫描 209 个源码文件。`pnpm run acceptance:final:synthetic` 修复音频 filter graph 断言回归后通过，未宣称真实媒体。

## 尚未验证的能力

- 外部剪辑软件导入/导出后的人工互操作。
- 生产 ASR、OCR、Scene、LLM Provider 的现场调用、质量和隐私边界。
- 复杂编辑体验的人工验收。
- GitHub 远端 Check 的可引用通过记录和正式发布平台验收。

## 临时占位实现

- `packages/features/*` 中部分目录和分层 README/公开入口主要是边界与未来接线位置；目录存在不代表对应完整用户功能已实现。
- Model Gateway 的测试使用注入 Provider 和结构化 Contract 校验；生产模型、密钥、真实质量和成本控制尚未验证。
- Worker 的 ASR/OCR/Scene 等能力保留结构化输入/输出边界，但不应表述为已接入真实生产分析提供方。
- 部分 Desktop/Renderer 面板和 Host API 是最小工作台或查询/命令边界；不应表述为完整桌面产品。

## 已知基础问题

- 历史文档把局部工作单的“完成”与整个 P0/产品“完成”混用；本文件将两者分开。
- 历史记录同时使用 `npm` 和当前 pnpm 命令；当前命令以根 `package.json` 和 `pnpm-lock.yaml` 为准，旧命令只保留为历史证据。
- 过去的 `docs/STATUS.md`、归档 Progress、计划和 Work Order 曾分别承担当前状态角色，造成 WO-001、WO-031、WO-050、WO-053 与后续 R 工作单之间的时间冲突；以后只认本文件。
- 2026-08-01 首次真实输入曾被 FFmpeg 检出为全程黑画面并由 Master QC 以 `BLACK_FRAME` 阻断；该结果保留为历史失败样本，随后用户报告已使用新的真实测试项目完成测试且烧录正常。

## 用户现场验收补充

- 上述黑帧记录是首次真实输入的历史结果，不代表最终真实测试结果。
- 用户随后报告已完成真实测试，且烧录正常；对应项目产物路径在仓库记录中以 `AVE_USER_REAL_PROJECT_DIR` 脱敏表示。
- 本轮以 `verify-project`、`inspect-project` 核对该目录：项目 ID 为 `0b5c6ad4-640d-4b89-99df-04c7f41cbabe`，Schema version 为 18，manifest 和 SQLite integrity 均为 `ok`；真实媒体内容未复制、上传或提交。

## R21 桌面真实流程验证

- 2026-08-01 `pnpm run electron:runtime:test`、`pnpm run workbench:host:test`、`pnpm run renderer:workbench:test`、`pnpm run desktop:boundary` 和 `pnpm run project-api:boundary` 通过。
- 对 `AVE_USER_REAL_PROJECT_DIR` 执行 `verify-project`、`inspect-project` 和 `migrate-project` 均通过；项目完整性为 `ok`，Schema version 为 18。
- 临时 Electron 工作台能够显示 `AVE 工作台` 和 `Project Host 在线`；原生目录选择器已绑定到 IPC 发起窗口，真实项目可成功打开。
- 桌面打开后显示项目 ID `0b5c6ad4-640d-4b89-99df-04c7f41cbabe`、2 个素材、Timeline `v6`、7 个 `SUCCEEDED` 任务、渲染 `available`、QC `passed`；素材源回链仍显示在 Project Host 返回的状态中。
- 关闭项目后状态回到 `not-open`；再次选择同一目录后恢复相同项目 ID、素材数、Timeline `v6`、任务数、渲染和 QC 状态。未出现永久同步状态或未解释错误。
- 为修复打开后的事件边界，`project.create`/`project.open` 返回新项目状态时由 IPC 使用返回的项目 ID 发布事件；未修改用户媒体或生成合同。

## R22 全量验收审计

- `pnpm run check` 在当前代码上通过，架构扫描 209 个源码文件。
- `pnpm run acceptance:final:synthetic` 首次暴露音频/字幕 filter 断言回归；修复 `apps/worker-host/src/worker_host/render/graph_compiler.py` 的音频输入 filter 顺序后，`timeline:audio-caption:test` 与最终合成验收均通过。
- 用户项目 `AVE_USER_REAL_PROJECT_DIR` 的 `verify-project`、`inspect-project` 均通过，manifest 和 SQLite integrity 为 `ok`，Schema version 为 18。
- 外部剪辑软件人工互操作、生产 ASR/OCR/Scene/LLM Provider、GitHub 远端 Check 和正式发布平台仍未验证；本地通过不替代这些外部证据。
- 远端历史运行对应旧提交：CI/Worker/Security 曾失败。当前已修复 Worker smoke 对被忽略 fixture 的依赖、Security workflow 自匹配和仓库文档机器绝对路径；本地 `pnpm run check`、`pnpm audit --audit-level high`、Worker media smoke 和等价路径扫描均通过，但未推送，远端新 Check 尚未产生。

## R23 真实成片 QC 复核

- 对用户项目 `AVE_USER_REAL_PROJECT_DIR\renders\master.mp4` 只读执行 FFmpeg `blackdetect`/`freezedetect`，在 `2.533333–3.533333` 秒发现约 1 秒黑帧/冻结段。
- Timeline v6 证据显示第二个视频片段从 `227943n` 移到 `317943n`，形成约 1 秒空档；旧 QC 的 `blackdetect=d=1` 漏检该边界长度黑帧，旧数据库 `qc_status=passed` 不足以证明成片无黑帧。
- 已将 Worker QC 的黑帧窗口收紧至 0.5 秒，冻结窗口保持 1.5 秒；`worker:qc:test` 和 `timeline-render:test` 通过。
- 新 QC 对旧 Master 只读复核结果为 `BLACK_FRAME` blocked，确认旧数据库 `passed` 为漏检结果。
- 通过 Project Host 提交 Move-back Command，将第二个视频片段从 Timeline v6 的 `317943n` 移回 `227942n`，生成 Timeline v7；随后在 `renders/r23-no-gap-v2` 生成第二版 Preview/Master。
- 第二版 Project Host 状态为 `render=available`、`qc=passed`，QC issues 为空；关闭并重新打开同一项目后，项目 ID、Timeline v7、渲染状态、QC 状态和素材/Job 数据一致。
- 第二版 Preview/Master 均为 229 帧；两者音频均为 5.077 秒；FFmpeg `blackdetect=d=0.1` 与 `freezedetect=d=0.5` 未检出事件。R23 本地真实项目复核 `PASS`。

## R23 本地修复与门禁复验

- `apps/worker-host/src/worker_host/render/graph_compiler.py` 对最终音频增加 `apad`，`render_timeline.py` 使用 `-shortest`，使 Preview/Master 以相同视频边界收敛音频时长；`timeline:audio-caption:test`、`timeline-render:test`、`acceptance:final:synthetic` 和 `worker:qc:test` 均通过。
- 最新 `pnpm run check` 通过，架构扫描 209 个源码文件；Worker media smoke、Security 等价绝对路径扫描和 `pnpm audit --audit-level high` 均通过。
- 外部剪辑软件、生产 Provider、GitHub 远端 Check 和正式发布平台仍未验证；当前修复尚未推送。
