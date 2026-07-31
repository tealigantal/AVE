# WO-044 Assembly Cut Project Host Gate

## Outcome

Project Host 只持久化引用已批准 Story Plan、有效 beat 和已存在 Evidence 的 validated Assembly Cut。

## Validation

- `npm run assembly:host:test`
- `npm run check`

## Evidence

`assembly_cuts` migration、`assembly.validated` event、未知 beat/Evidence 阻断和 validated 状态持久化均通过。

## Remaining Risk

尚未将 validated Assembly Cut 编译结果提交到 Timeline，也未接入桌面 Assembly 审批界面。
