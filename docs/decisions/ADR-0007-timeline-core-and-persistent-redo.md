# ADR-0007 Timeline Core and Persistent Redo

## Status

Accepted for WO-R09.

## Context

R08 已保证批量命令原子提交，但 Timeline 仍只有四个基础命令，缺少多轨语义、锁、重叠和媒体引用校验；Redo 只存在于 Project Host 内存，重启后丢失。

## Considered Options

1. 继续把命令和 Redo 放在 Host 内存中：实现简单，但不能恢复、不能作为权威历史。
2. 在 Renderer 或 Worker 保存 Timeline/Redo：违反 Project Host 单一权威和 Worker 无 SQLite 权限边界。
3. 在纯 Timeline Core 定义模型/命令，在 Project Host 通过 Project Storage 持久化 Redo：保持领域纯度、重启可恢复，并复用 R08 CommitPlan。

## Decision

采用选项 3。Timeline Core 提供不可变模型、18 类 Command、Apply/Inverse 和确定性校验；Project Host 仍是唯一提交者。SQLite 新增项目级 `timeline_redo` 状态，正常新提交清除，Undo 在同一事务保存原始 commands，重开后由 Host 读取并重新模拟执行。

## Consequences

旧 Clip/Track snapshots 仍可读取；新模型字段是可选扩展。Timeline Core 仍不负责 RenderGraph、FFmpeg、代理映射或模型调用。Redo 恢复依赖当前 Timeline 版本匹配，发生新编辑后旧 Redo 明确失效。

## Migration and Rollback

新增 migration 0016 只创建 `timeline_redo`；回滚可删除空表，不删除既有 Timeline snapshots、Commands 或 Events。

## Date

2026-07-30
