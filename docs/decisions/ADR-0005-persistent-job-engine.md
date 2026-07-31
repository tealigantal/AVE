# ADR-0005 Persistent Worker Job Engine

## Status

Accepted — 2026-07-30

## Context

R06 的 Worker Client 每次提交创建独立进程，Job 状态只存在调用栈；Worker 强退、Host 重启或重复提交会丢失 attempt、输入身份和结果引用。蓝图要求 `jobs`/`job_attempts`、幂等、恢复、取消和受限重试。

## Considered Options

1. 继续使用内存 Job 状态机，在 Host 重启时丢弃活动任务。
2. 让 Worker 自己写 Project SQLite 保存 Job。
3. 由 Project Host 通过 Project Storage 持有 Job/attempt 事务，Worker Client 只执行协议和子进程控制。

## Decision

采用选项 3。`jobs` 和 `job_attempts` 在 migration 0015 创建；Project Host 是唯一写入者。Job 保存 task type、idempotency key、input hash/input、state、attempt、progress、error class/message、output refs 和时间字段。Host 打开项目时将遗留 RUNNING 标为 RECOVERING；幂等任务可重新执行，非幂等任务阻断。

## Rationale

项目状态、Job 生命周期和 Worker 候选结果保持同一权威边界；Worker 崩溃不可能直接破坏 Project DB。输入 hash + project-scoped idempotency 唯一约束保证重复请求不会再次产生成功输出。

## Consequences

- 每次执行会留下可审计 Job 与 attempt 记录，渲染链路不再只有内存 Promise。
- Worker Client 需要传递稳定 job ID、progress、AbortSignal，并报告 child exit。
- 本单仍不实现跨 Host 的后台调度队列、定时重试或多 Worker 并发策略。

## Migration

新增 0015 migration 和 Project Storage Job API；JobEngine 将 R06 Worker 结果映射为 SUCCEEDED/CANCELLED/RETRYABLE_FAILED/BLOCKED，并将媒体 Render/QC 调用接入持久化 facade。

## Rollback

如果 Job schema 或 Worker control 失败，必须阻断任务并保留失败记录；不得恢复只在内存中标记成功的兼容分支。回滚只能通过版本控制恢复 R06 代码并保留项目备份，不删除已有 Job 数据。

## Date

2026-07-30
