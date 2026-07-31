<!-- codex-important-project -->

# Objective

构建一个由 Project Host 控制的本地 AI Vlog Co-Editor：以证据、创作决定、Edit IR、版本化时间线和统一 RenderGraph 为核心，让用户能够可靠地从真实素材得到可验证的成片。

# User and Problem

目标用户是希望快速完成真实 Vlog 剪辑、同时保留专业可控性的创作者。要解决的问题是 AI、时间线、素材、数据库和渲染互相越权导致的协议漂移、版本覆盖、代理误用和崩溃后无法恢复。

# Observable Stopping Condition

最终完成条件：蓝图定义的 P0-P4 用户流程、三进程运行边界、协议、持久化、分析、故事、反馈、交付和桌面体验均有真实实现与对应验证证据。当前仍是 P0 架构验证原型及 P1-P4 协议/校验骨架，但真实 Timeline → RenderGraph → Preview/Master 链路已通过双素材验收；完整桌面产品、真实手机素材和生产模型/发布平台仍未完成。

# Critical User Journeys

- 创建/打开/关闭项目并恢复最后提交版本。
- 导入真实媒体，建立稳定身份与代理映射。
- 通过 Command 修改版本化 Timeline，并在冲突时拒绝覆盖。
- 使用同一 RenderGraph 生成 Preview 与原片 Master，并通过 QC。

# Non-goals

P0 前不做复杂 Story Agent、多 Agent、包装美化、字幕/广告系统和专业导出。

# Constraints

三运行边界、Project Host 单写入、JSON Schema 跨语言唯一协议源、RationalTime 唯一时间基准、不可变版本、可恢复任务和原片 Master 回链必须保持。

# Current Lifecycle Stage

已初始化的重要项目；WO-R01 至 WO-R19 已完成，当前进入 WO-R20 最终真实验收。

# Approval Gates

涉及公共协议主版本、权威边界、数据库策略、安全边界、生产依赖、部署或不可逆迁移时必须先记录并确认 ADR。普通文档、计划和验证记录无需额外批准。

# Assumptions

- 当前使用 Node/TypeScript 实现 Project Host/Core，Python Worker 先提供结构化协议入口；真实分析 Worker 仍待后续工作单。
- pnpm 11.9.0 已作为根包管理器安装并通过 frozen lockfile、完整检查和 CI Workflow 静态门禁。

# Unknowns

- Electron runtime 已完成无异常主进程启动验证；窗口人工操作、ASR/OCR/Scene/LLM 生产提供方和最终发布平台集成仍待对应工作单及 ADR。
- 当前仓库已有授权合成 VFR Fixture，并已通过 P0 CLI 验收；尚未使用用户手机原片进行现场验收。
