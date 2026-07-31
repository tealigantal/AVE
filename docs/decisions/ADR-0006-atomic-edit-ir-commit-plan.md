# ADR-0006 Atomic Edit IR CommitPlan

## Status

Accepted for WO-R08.

## Context

Assembly 和 Rough Cut 原先逐条调用 Timeline commit。多条操作中后续操作失败时，前面的操作已经产生版本、Command 和 Event，无法满足 Patch 全成或全不成。

## Decision

所有编辑入口先将 Edit Intent 编译为完整 commands，在不可变内存 Timeline 副本中顺序模拟并校验最终 Timeline，生成包含 base version、commands、affected ranges、locks、semantic refs、expected final version、validation 和 SHA-256 plan hash 的 CommitPlan。Project Host 重新读取并校验数据库最新版本后，在一个 SQLite `BEGIN IMMEDIATE` 事务中写入一个 Timeline snapshot、一条计划 Command 和一个 commit event。

一次计划只产生一个逻辑 Timeline version。Undo/Redo 将计划内 commands 作为批次处理；Rebase 必须重新 Resolve 和 Simulate，不得只改 base version。

## Consequences

失败的 command 在数据库事务开始前被阻断，因而不会留下部分版本、Command 或 Event。Timeline Core 当前仍保持最小命令模型，复杂剪辑语义继续由 R09 扩展。
