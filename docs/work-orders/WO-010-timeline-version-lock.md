# WO-010：Timeline Version 与 Lock

## 用户结果

用户编辑不会静默覆盖其他版本，Undo/Redo 和用户锁都经过同一版本化命令路径。

## 不变量

所有命令带 base version；版本冲突拒绝覆盖；旧 Timeline 不原地修改；锁冲突明确失败。

## 必跑测试

`npm run typecheck`。
