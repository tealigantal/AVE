# WO-R13 Desired State / Current State / Reconciler

## 目标

让项目在用户修改需求后，确定性计算哪些内容已经 stale、需要哪些动作，并保持 Project Host 的权威边界。

## 必须实现

- `DesiredState`；
- `CurrentState`；
- `InvalidationPlan`；
- `ActionPlan`；
- `Reconciler`。

## 初始失效规则

- 目标时长变化 → Sufficiency → StoryPlan → Timeline → Render → QC；
- Sponsor CTA 变化 → SponsorPlan → Timeline related effects → Render → SponsorQC；
- 字幕拼写变化 → Caption track → Render → SubtitleQC。

## 边界

Reconciler 只产生结构化计划，不直接修改 Timeline、Render 或模型输入；真实 Feature 包留给 R14。

## 验证命令

R13 专用 property/integration tests、`npm run typecheck`、`npm run architecture` 和完整 `npm run check`。

## Outcome

2026-07-30 已完成。DesiredState、CurrentState、InvalidationPlan、ActionPlan 和 Reconciler 已通过确定性规则、重复 reconcile 幂等、approval 不继承和旧 Timeline stale 验收；完整 `npm run check` 通过，架构扫描 164 个源码文件。
