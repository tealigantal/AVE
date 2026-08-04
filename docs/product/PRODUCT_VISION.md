# Product

## Product Summary

AI Vlog Co-Editor 帮助创作者把真实视频素材可靠地编译为可发布成片。

## Target Users

需要 AI 辅助但仍要掌控剪辑决定和版本的 Vlog 创作者。

## User Problems

素材事实、AI 建议、时间线和渲染结果容易失真，崩溃后也难以恢复。

## Critical User Journeys

创建项目、导入素材、编辑版本化 Timeline、预览、原片 Master、QC、重启恢复。

## Expected User-visible Behavior

用户的批准和锁应优先于模型候选；非法素材引用、版本冲突和代理无法回链应明确阻断。

## Failure and Recovery Experience

失败不得伪装成功；项目应保留旧版本，后台任务可恢复或明确阻断。

## Product Constraints

P0 先完成剪辑可靠性，不进入复杂故事 Agent。

## Non-goals

本轮不提供 UI、字幕、广告和自动故事策划。

## Current Gaps

P0 可靠媒体闭环已建立并有可接受的基线证据，包括项目持久化、版本化 Timeline、Preview/Master 渲染、QC 和重启恢复。

editing-execution-v1 仍是分阶段实现中的完整范围：RenderGraph 执行基础设施与基础 Vlog 工具的受限切片已具备合成媒体证据，包括静态手动 9:16 重构图、Master 响度归一化、单路 Dialogue/Narration 对 Music ducking、单片段音视频边界淡入淡出，以及只编译为 Timeline Command 的薄 Preset 选择层。嵌套/复合/调整执行、动态自动化与变换、跟踪蒙版、两输入转场（含 Cross Dissolve）、完整调色/图形/音频范围、通用 Preset/Creative Skill 以及授权真实媒体最终验收仍未完成。实时完成度、证据和阻塞项以 `docs/current/STATUS.md`、`docs/current/VALIDATION.md` 和 `docs/current/DEBT.md` 为准。
