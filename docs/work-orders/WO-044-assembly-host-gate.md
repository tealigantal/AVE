# WO-044：Assembly Cut Project Host Gate

## 用户结果

经过批准 Story Plan 和 Evidence 校验的 Assembly Cut 才能进入 Project Host；validated cut 才能作为后续 Edit IR 输入。

## 不变量

- `approved_plan_id` 必须对应已持久化 ApprovedStoryPlan。
- beat 和 evidence 引用必须来自批准计划/ Evidence Graph。
- candidate 或非法 cut 不写入 approved assembly 表。

## 验收

- `npm run assembly:host:test`
- `npm run check`
