<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-043 Approved Story Plan Persistence

## Outcome

Project Host 只接受已包含批准身份、时间和有效 Evidence 引用的 ApprovedStoryPlan，并在重开后恢复；候选 Proposal 不会直接进入 Assembly。

## Validation

- `npm run story-host:test`
- `npm run check`

## Evidence

`approved_story_plans` migration、`story.plan.approved` event、有效证据引用和关闭重开读取均通过；未知 evidence 被拒绝。

## Remaining Risk

尚未接入真实 Story Agent、Assembly Cut Project Host API 和桌面审批卡片。
