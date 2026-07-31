# WO-R09 补全 Timeline Core

## Purpose

把当前仅支持 Clip/Track 的最小 Timeline 提升为可作为剪辑权威的纯领域模型：模型、命令、校验、Apply/Inverse、回放和重启后 Undo/Redo 都由 Project Host/Timeline Core 的可验证路径提供。

## Current Repository Context

R08 已把批量编辑统一到 CommitPlan，但 Timeline Core 仍只有 `add_clip`、`remove_clip`、`move_clip`、`trim_source`。Host 的 `redoPlan` 仍在内存，关闭重开后无法恢复 Redo；`edit-ir.rebase` 也尚未重新 Resolve/Simulate。

## Milestones

- [x] 扩展 Sequence、Video/Audio Track、Gap、Transition、Caption、Effect、Keyframe、Audio Routing、Semantic Sidecar，并保留现有 v1 Clip/Track 输入兼容性。
- [x] 实现 Add/Remove/Replace/Move/Trim/Roll/Ripple/Slip/Slide、Gain、Caption、Transition、Effect、Keyframe、Speed、Transform、Lock/Unlock 共 18 类 Command。
- [x] 实现 Media Ref、Source Range、Overlap、Transition、Lock、Caption、Audio Routing、Duplicate ID、Version、Track Compatibility 校验。
- [x] 增加 250+ 随机命令的 Apply/Inverse、Replay、失败无变更、ID 唯一、Source Range 合法和版本单调测试。
- [x] 迁移持久化 Redo，并验证关闭项目、重开后 Redo 成功；新提交清除旧 Redo。

## Acceptance

关闭项目并重开后，最近一次 Undo 产生的 Redo 仍能执行；非法命令不会改变内存 Timeline 或数据库版本。所有 18 类命令均有可观察的成功或结构化失败路径，完整 `npm run check` 通过。

## Decision Log

- 保留现有 `Timeline.tracks[].clips[]` 作为兼容投影；新增领域集合使用可选字段，避免提前破坏 R08/R04 调用方。
- 每个 Command 以不可变对象输入，Apply 返回新 Timeline；批量版本归一化仍由 R08 CommitPlan 负责。
- Redo 作为 Project SQLite 的项目级持久化状态保存，正常新提交清除，Undo 在同一提交事务中写入。

## Rollback and Risks

数据库迁移只新增 `timeline_redo` 表，不改写旧 Timeline snapshots；旧项目打开时由 migration 创建空 Redo 状态。复杂 RenderGraph 语义、VFR 映射和真实媒体效果仍属于 R10/R11。

## Validation Commands

`npm run timeline-core:test`、`npm run timeline-redo:test`、`npm run typecheck`、`npm run architecture`、`npm run check`。

## Outcomes & Retrospective

R09 已完成。Timeline Core 仍保持纯 Node-free 领域边界；Project Host 通过新增 `timeline_redo` 表恢复重启后的 Redo。R10 需要在不把 FFmpeg/Worker 依赖带入 Core 的前提下，将扩展 Timeline 编译为统一 RenderGraph。
