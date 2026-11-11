# Product

## Product Summary

AI Vlog Co-Editor 帮助创作者把真实视频素材可靠地编译为可发布成片。

目标是自动剪辑成片的节奏、叙事、字幕、音画编排和视觉包装等效果，在相同素材与要求的可复现评测中对标 Hypit、ChatCut 的同类作品；创作者可以在同一已生成版本的时间线上继续精修和撤销。对标是产品目标，不是现有质量或功能达标的声明。参考视频复刻、生成式素材等能力应按实际需求、授权和可用资源单独定义，不因竞品存在即假定本产品已支持。

当前产品方向为视觉、规划、转写、声音分析全部采用云端模型配置，并允许云端渲染；本地部署及低配机验收暂缓。服务商、处理位置、涉及素材和成本须在用户授权范围内明确，失败与恢复可见。云端目标及安全边界见 [ADR-0059](../decisions/ADR-0059-cloud-editing-direction.md)；现有部署与验收结果仍以代码和 Evidence 为准。

## Target Users

需要 AI 辅助但仍要掌控剪辑决定和版本的 Vlog 创作者。

## User Problems

素材事实、AI 建议、时间线和渲染结果容易失真，崩溃后也难以恢复。

## Critical User Journeys

创建项目、导入素材、编辑版本化 Timeline、预览、原片 Master、QC、重启恢复；Stage 2 还要让用户在同一项目版本中检查 Contract、Evidence、Direction/Story 候选和 execution-bound Review，再对一个 exact effect 批准、拒绝或提出局部反馈。

## Expected User-visible Behavior

用户的批准和锁应优先于模型候选；非法素材引用、版本冲突和代理无法回链应明确阻断。Stage 2 桌面主路径以可比较卡片而非原始 JSON 为主交互，审批必须显示 exact action、effect、targets 和当前 workspace；旧 Render 或 feedback 在 Timeline 变化后必须显式过期。

## Failure and Recovery Experience

局部反馈预览显示修改前后原片范围和成片总时长；中间裁剪不移动后续镜头，
界面提示可能留下空洞。人工验收使用当前 Product 的真实确认，自动预检的
审批凭证、播放阈值和测量报告都不代表用户已经观看或接受。

失败不得伪装成功；项目应保留旧版本，后台任务可恢复或明确阻断。

## Product Constraints

P0 先完成剪辑可靠性，不进入复杂故事 Agent。

## Non-goals

Stage2 已实施范围不包含完整跨项目个人模型。Stage3 目标纳入获准本地跨项目学习和完整创作工作台，见 [Stage3 总计划](../product-intelligence/STAGE3_PLAN.md)；Marketplace、通用自主 Agent、自动发布仍非目标。新 UI 不绕过 Project Host、CommandEditIR、CommitPlan 和 RenderGraph 权威。

## Stage3 目标体验

自动剪辑、手动精修与分段独立批注共同操作同一作品的可编辑对象。新增字幕动画、图形包装、转场、画面或声音效果均须同步提供精修入口和批注定位/修改能力；整体要求和多处分段批注一次提交，结果逐条关联实际对象变更及结果版本，失败、冲突或失效锚点不能作为已解决隐藏。手动调整及未涉及对象必须在后续 AI 修改中保留。一次交付覆盖完整目标；内部施工顺序不构成缩减范围或分期交付。复用选型和实施映射见 [DOC-015（沿用对标计划）](../plans/2026-11-11-cloud-editing-benchmark.md#doc-015hypit-模块核对与完整交付实施方案)。本段是目标要求，不提升当前能力状态。

导入素材并表达目标或直接开始 → 请求授权内完整主初稿 → 制作中插话即时调整 → 看着作品多镜头视听修改/手动精修 → 可撤回新版本/比较/组合 → 交片自检与用户采用/导出。无需先审素材报告、填写偏好问卷或选择 Direction/Story。一次授权范围内主动学习，反馈原话和例子变成可纠正剪辑原则，在新项目中实际改变作品；详见总计划和 Feedback Pipeline。Stage2 下述实现边界不作为 Stage3 目标上限。

## 实现边界与当前接续

实时实现、验证及债务只查 [current STATUS](../current/STATUS.md)、[VALIDATION](../current/VALIDATION.md) 和 [DEBT](../current/DEBT.md)，本文不重复维护已过期状态。完整剪辑家族的范围仍由 [Editing Capability Scope](EDITING_CAPABILITY_SCOPE_V1.md) 定义；受限子集的实现不能代表整个家族完成。

P4以 [demo](../../demos/p4-workbench/README.md) 为唯一界面依据，接通 [活动工作包](../program/creative-assistant-stage3/work-packages/WP-S3-RELIABLE-UX-001.md)列出的真实操作。按 [DOC-007](../plans/2026-10-03-reliable-workbench-real-acceptance.md)先功能后UI，使用实际自动验证和可追溯结果判断完成。人工审核与审美/听感反馈可选；没有执行的主观评价不声明已通过，也不作为P4/P5停止工作的理由。Stage2与高级剪辑的历史债务独立记录。

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
