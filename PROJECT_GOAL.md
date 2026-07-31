<!-- codex-important-project -->

# AI Vlog Co-Editor 长期项目目标

## 产品目标

构建一个由 Project Host 控制的本地 AI Vlog Co-Editor：以证据、创作决定、Edit IR、版本化 Timeline 和统一 RenderGraph 为核心，让创作者能够可靠地从真实素材得到可验证、可追溯的成片。

## 目标用户与问题

目标用户是希望提高 Vlog 剪辑效率、同时保留专业控制权和审计能力的创作者。

项目要解决的问题是：AI 建议、素材、Timeline、数据库和渲染互相越权，导致协议漂移、版本覆盖、代理误用、无法追溯以及任务崩溃后无法恢复。

## 长期成功条件

- 用户可以创建、打开和关闭项目，并恢复最后一个有效提交。
- 用户可以导入真实媒体，建立稳定身份、来源关系和代理映射。
- 用户可以通过版本化 Command 修改 Timeline，并在版本冲突时拒绝覆盖。
- 用户可以基于同一 RenderGraph 生成 Preview 与原片 Master，并获得可审计的 QC 结果。
- 证据、创作决定、模型候选、审核结果、渲染结果和交付结果可以被追溯到对应项目版本。
- 多进程边界、协议、持久化和失败恢复在真实用户流程中保持一致。

## 长期约束

- Project Host 是项目状态和事务边界的唯一权威。
- SQLite 只能由 Project Host 写入。
- JSON Schema 是跨语言协议的唯一来源，生成物不可手工维护。
- RationalTime 是权威时间基准。
- Renderer 只能通过窄 API 请求项目能力，不能直接访问数据库、原片、shell、FFmpeg 或模型 SDK。
- Worker 只执行受协议约束的媒体和计算任务，不拥有项目数据库写权限。
- Timeline 变更必须通过 Command/Commit 流程；失败不得伪装成成功。

## 非目标

在 P0 可靠性基础没有稳定之前，不以复杂 Story Agent、多 Agent 编排、视觉包装、广告系统或专业发布矩阵替代核心媒体闭环。

当前工作状态、已验证证据和未验证边界不写入本文件，统一记录在 `docs/CURRENT_STATUS.md`。
