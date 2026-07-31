# Progress

## Active Goal

完成 R20 可信真实媒体验收，并修复 Timeline → RenderGraph → Worker 的时间轴和音频语义。

## Active ExecPlan

`docs/plans/2026-08-01-p0-timeline-audio-render.md`

## Current Milestone

QC/契约门已修复；Timeline/音频编译器和 Project Host 验收入口已实现，正式真实验收已通过。

## Completed and Verified

- QC 正常/纯黑/暗景主体回归通过。
- RenderGraph contract check、generated-clean、TypeScript/Python 类型检查通过。
- 音频字幕真实渲染回归通过。

## Implemented but Not Verified

- 时间轴空隙、移动、独立音频延迟/增益/混音和 contain/cover 的完整矩阵。
- 新 Project Host 真实验收 Runner 的实际授权媒体通过证据。

## In Progress

- 记录真实验收结果并保留后续多音轨/ffprobe 优化边界。

## Next Work

运行 `pnpm run check`、`pnpm run acceptance:final:synthetic`，再在存在授权素材时运行 `pnpm run acceptance:final`。

## Blockers

正式 `pnpm run acceptance:final` 已通过；完整多音轨矩阵、外部 NLE 和 ffprobe 优化仍未完成。

## Recent Decisions

默认 `contain`；视频不隐式带音频；计划内黑场必须由 Graph 明确表达，计划外黑场继续由 QC 阻断。

## Resume Instructions

从 `docs/plans/2026-08-01-p0-timeline-audio-render.md` 和 `docs/CURRENT_WORK.md` 继续；下一步聚焦多音轨矩阵与 ffprobe 负载优化。
