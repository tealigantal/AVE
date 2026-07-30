# WO-037：Project Host Undo/Redo

## 用户结果

用户可以撤销和重做 Timeline 修改；每次操作都是新的不可变版本，并可被事件追溯。

## 不变量

- Undo 使用前一版本快照和最近命令生成 `inverseCommand`，不直接替换当前版本。
- Redo 复用原始命令的 Command/Commit 路径。
- 无可撤销/重做操作时明确失败，不能伪成功。

## 验收

- `npm run undo-redo:test`
- `npm run check`
