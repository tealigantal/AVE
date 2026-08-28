# Product

## Product Summary

AI Vlog Co-Editor 帮助创作者把真实视频素材可靠地编译为可发布成片。

## Target Users

需要 AI 辅助但仍要掌控剪辑决定和版本的 Vlog 创作者。

## User Problems

素材事实、AI 建议、时间线和渲染结果容易失真，崩溃后也难以恢复。

## Critical User Journeys

创建项目、导入素材、编辑版本化 Timeline、预览、原片 Master、QC、重启恢复；Stage 2 还要让用户在同一项目版本中检查 Contract、Evidence、Direction/Story 候选和 execution-bound Review，再对一个 exact effect 批准、拒绝或提出局部反馈。

## Expected User-visible Behavior

用户的批准和锁应优先于模型候选；非法素材引用、版本冲突和代理无法回链应明确阻断。Stage 2 桌面主路径以可比较卡片而非原始 JSON 为主交互，审批必须显示 exact action、effect、targets 和当前 workspace；旧 Render 或 feedback 在 Timeline 变化后必须显式过期。

## Failure and Recovery Experience

失败不得伪装成功；项目应保留旧版本，后台任务可恢复或明确阻断。

## Product Constraints

P0 先完成剪辑可靠性，不进入复杂故事 Agent。

## Non-goals

本轮不扩展 Stage 3 跨项目个人模型、Marketplace、自主 Agent 或自动发布，也不用新 UI 绕过现有 Project Host、CommandEditIR、CommitPlan 和 RenderGraph 权威。

## Current Gaps

P0 可靠媒体闭环已建立并有可接受的基线证据，包括项目持久化、版本化 Timeline、Preview/Master 渲染、QC 和重启恢复。

editing-execution-v1 仍是分阶段实现中的完整范围：RenderGraph 执行基础设施与基础 Vlog 工具的受限切片已具备合成媒体证据，包括静态手动 9:16 重构图、Master 响度归一化、单路 Dialogue/Narration 对 Music ducking、单片段音视频边界淡入淡出，以及只编译为 Timeline Command 的薄 Preset / Skill Output 选择层。嵌套/复合/调整执行、动态自动化与变换、跟踪蒙版、两输入转场（含 Cross Dissolve）、完整调色/图形/音频范围、更广泛的 Preset 执行以及未来 Creative Skill Definition runtime 仍未完成。实时完成度、证据和阻塞项以 `docs/current/STATUS.md`、`docs/current/VALIDATION.md` 和 `docs/current/DEBT.md` 为准。

Stage 2 的 Contract、Evidence Pack、Creative Skill knowledge、Duration、Direction/Story、exact permission、受限 first-cut 与 scoped feedback 链已有当前合成验证。完整 Story 时长修正和单版本替换使较早的 real-media/human Evidence 不再满足当前验收；基于同一 Host workspace snapshot 的四视图桌面主路径必须以 fresh corrected-duration 素材重新执行并由用户直接审核。只有该 Product/UX Evidence、全部当前门禁与最终 Stage 2 逐项审计都完成时，才能宣告退出条件成立。

## Future product-intelligence blueprint

The future product layer is specified in
[`docs/PRODUCT_INTELLIGENCE_BLUEPRINT.md`](../PRODUCT_INTELLIGENCE_BLUEPRINT.md).
It extends this product vision with a conversation-led journey, Creative
Contract, evidence-bound Story Plan, optional style/trend intelligence,
explainable Decision Records and scoped feedback patches. These are design and
roadmap artifacts, not claims of current implementation or editing-execution-v1
completion. The existing Project Host, `CommandEditIR`, Timeline
Command/Commit, Semantic Render Manifest, target-specific Preview/Master
RenderGraphs and ExecutionPlans, versioning and QC boundaries remain mandatory.
