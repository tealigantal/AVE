<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-036 Timeline Command API

## Outcome

通过 Project Host 暴露版本化 Timeline 初始化和 Command 提交；命令经 Core `applyCommand` 产生新版本，再由 Storage 事务写入 snapshot、command 和 event。

## Validation

- `npm run timeline:host:test`
- `npm run check`
- `npm run p0:acceptance`

## Evidence

合法 Add/Move 提交通过，旧 `base_version` 返回冲突；关闭重开恢复最新 Timeline 版本；Worker 和 Renderer 均不打开 SQLite。

## Remaining Risk

Renderer 尚未提供完整 Add/Trim/Move/Undo/Redo 控件；Electron runtime 尚未现场启动。
