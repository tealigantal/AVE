<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-009：Timeline Commands

## 用户结果

用户可以通过 Add/Remove/Move/Trim 命令编辑，并获得可重放的逆命令基础。

## 不变量

命令必须指向存在的 Track/Clip；非法命令抛错且不改变输入对象；Undo/Redo 只能复用命令路径。

## 必跑测试

`npm run typecheck`。
