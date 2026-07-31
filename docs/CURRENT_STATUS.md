# 状态内容基线：6ce8999b09fac09095498af299af4aca3a46b3af（`feat: complete AVE blueprint foundation`）

本文件记录的是以上基线所核对的项目状态。实时 Git HEAD 必须以 `git rev-parse HEAD` 查询；不得把它写入本文件并称为“实际 HEAD”，因为提交本文件会立即生成新的 HEAD。

# 当前状态

## 统一结论

仓库是可以继续建设的架构原型，不需要推倒重来，但尚未通过真实 Timeline → RenderGraph → Worker → Master 的 P0 垂直切片。

这里的“尚未通过”不是说所有组件都不存在，而是说当前证据不足以把组件级测试、授权合成素材、局部 Render/QC 测试拼接成一次真实、可复现、端到端的 P0 现场验收。

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

## 尚未验证的能力

- 真实手机或用户授权原片完成一次从真实 Timeline 提交到 RenderGraph、Worker、原片 Master、QC、关闭重开的完整 P0 垂直切片。
- 真实手机 VFR、不同帧率、音频和字幕组合在同一次 P0 验收中的现场证据。
- 外部剪辑软件导入/导出后的人工互操作。
- 生产 ASR、OCR、Scene、LLM Provider 的现场调用、质量和隐私边界。
- 完整桌面用户流程、原生选择器和复杂编辑体验的人工验收。
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
- 当前没有真实手机原片证据，因此不能把临时授权合成媒体运行结果写成真实素材验收。
- P0 垂直切片的验收证据仍需独立、可复现地确认真实素材、完整来源回链、Master/QC 和重开后状态一致性。
